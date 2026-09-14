/**
 * Electronics Lab V0.1 — Simulation Engine
 *
 * 架构红线（强制）：本类是纯 TypeScript 层，只能依赖 ./types 中定义的数据结构与纯逻辑。
 * 禁止 import React、Zustand、DOM API、SVG API、Toast、Store 或任何界面层模块。
 * 禁止在 Engine 内部直接调用 store.setState() 或任何 Store 方法。
 *
 * 正确数据流：用户操作 → Zustand Store（调用 Engine）→ SimulationEngine.evaluate(circuit)
 *   → 返回 SimulationResult → Store 用结果更新状态 → React UI 重渲染。
 *
 * Engine 唯一的职责：接收 Circuit，计算并返回 SimulationResult。
 */

import {
  Circuit,
  Device,
  DeviceType,
  Port,
  Signal,
  SimulationResult,
  Wire,
  WireError,
} from './types';

function cloneCircuit(circuit: Circuit): Circuit {
  return JSON.parse(JSON.stringify(circuit)) as Circuit;
}

export class SimulationEngine {
  /**
   * 对整个 Circuit 执行一次完整信号传播。
   * 不修改输入 Circuit（不可变），返回更新了所有端口 value 的新 Circuit。
   */
  evaluate(circuit: Circuit): SimulationResult {
    const result: SimulationResult = {
      circuit: cloneCircuit(circuit),
      hasLoop: false,
      errors: [],
    };
    const c = result.circuit;

    const order = this.topologicalSort(c);
    if (order === null) {
      result.hasLoop = true;
      result.errors.push({ type: 'loop_detected', message: '检测到反馈回路，V0.1 不支持' });
      return result;
    }

    // 2/3. 初始化：所有端口 value 置为 'X'；输入器件输出端口根据 state 置 0/1
    for (const device of c.devices) {
      for (const port of device.ports) {
        port.value = 'X';
      }
    }
    for (const device of c.devices) {
      if (device.type === 'button') {
        const out = device.ports.find((p) => p.direction === 'out');
        if (out) out.value = device.state.pressed === true ? 1 : 0;
      } else if (device.type === 'switch') {
        const out = device.ports.find((p) => p.direction === 'out');
        if (out) out.value = device.state.on === true ? 1 : 0;
      }
    }

    // 建立 wire 索引：to.portId -> from.portId / from.deviceId
    const wireToSource = new Map<string, { deviceId: string; portId: string }>();
    for (const w of c.wires) {
      wireToSource.set(w.to.portId, { deviceId: w.from.deviceId, portId: w.from.portId });
    }

    // 4. 按拓扑顺序遍历：收集输入端口值（经连线回溯上游输出端口），计算输出
    for (const device of order) {
      for (const port of device.ports) {
        if (port.direction !== 'in') continue;
        const source = wireToSource.get(port.id);
        if (source) {
          const srcDevice = c.devices.find((d) => d.id === source.deviceId);
          const srcPort = srcDevice?.ports.find((p) => p.id === source.portId);
          port.value = srcPort ? srcPort.value : 'X';
        } else {
          port.value = 'X';
          // 悬空输入端口
          if (device.type !== 'button' && device.type !== 'switch') {
            result.errors.push({
              type: 'floating_input',
              message: `器件 ${device.id} 的输入端口 ${port.name} 未连接`,
              deviceId: device.id,
              portId: port.id,
            });
          }
        }
      }
      // LED 无输出端口，视觉状态由输入端口值直接决定
      if (device.type === 'led') continue;
      this.evaluateDevice(device);
    }

    return result;
  }

  /**
   * 拓扑排序（Kahn 算法，BFS 入度法）。
   * 输入器件（button/switch）排在最前，LED 排在最后；若存在回路返回 null。
   */
  topologicalSort(circuit: Circuit): Device[] | null {
    const devices = circuit.devices;
    if (devices.length === 0) return [];

    const indegree = new Map<string, number>();
    const outEdges = new Map<string, string[]>();
    for (const d of devices) {
      indegree.set(d.id, 0);
      outEdges.set(d.id, []);
    }
    for (const w of circuit.wires) {
      const fromId = w.from.deviceId;
      const toId = w.to.deviceId;
      if (!indegree.has(fromId) || !indegree.has(toId)) continue;
      indegree.set(toId, (indegree.get(toId) ?? 0) + 1);
      outEdges.get(fromId)!.push(toId);
    }

    const queue: string[] = [];
    for (const [id, deg] of indegree) {
      if (deg === 0) queue.push(id);
    }

    const result: Device[] = [];
    const byId = new Map(devices.map((d) => [d.id, d]));
    while (queue.length > 0) {
      const id = queue.shift()!;
      const device = byId.get(id);
      if (device) result.push(device);
      for (const next of outEdges.get(id) ?? []) {
        const deg = (indegree.get(next) ?? 0) - 1;
        indegree.set(next, deg);
        if (deg === 0) queue.push(next);
      }
    }

    return result.length === devices.length ? result : null;
  }

  /** 检测电路是否存在反馈回路 */
  hasLoop(circuit: Circuit): boolean {
    return this.topologicalSort(circuit) === null;
  }

  /**
   * 检查一条新 Wire 是否合法（不检查环路，环路由 hasLoop 负责）。
   * 返回 null 表示合法，返回错误对象表示不合法。
   */
  checkWireLegality(wire: Wire, circuit: Circuit): WireError | null {
    const fromDevice = circuit.devices.find((d) => d.id === wire.from.deviceId);
    const toDevice = circuit.devices.find((d) => d.id === wire.to.deviceId);
    const fromPort = fromDevice?.ports.find((p) => p.id === wire.from.portId);
    const toPort = toDevice?.ports.find((p) => p.id === wire.to.portId);

    if (!fromPort || fromPort.direction !== 'out') {
      return {
        code: 'input_as_source',
        message: '无法连接：输入端口不能作为信号源',
      };
    }
    if (!toPort || toPort.direction !== 'in') {
      return {
        code: 'output_to_output',
        message: '无法连接：输出端口不能连接输出端口',
      };
    }
    if (wire.from.deviceId === wire.to.deviceId) {
      return {
        code: 'self_connection',
        message: '无法连接：不能连接同一器件的端口',
      };
    }
    if (circuit.wires.some((w) => w.to.portId === wire.to.portId)) {
      return {
        code: 'port_already_connected',
        message: '该输入端口已有连接，请先删除原有连接',
      };
    }
    return null;
  }

  /**
   * 单个器件的逻辑计算：根据输入端口值计算输出端口值（就地更新）。
   * 输入器件（button/switch）的输出已在 evaluate 中由 state 初始化，不参与门逻辑求值。
   */
  private evaluateDevice(device: Device): Port[] {
    if (device.type === 'button' || device.type === 'switch') {
      return device.ports.filter((p) => p.direction === 'out');
    }
    const outPorts = device.ports.filter((p) => p.direction === 'out');
    if (outPorts.length === 0) return [];
    const inputs = device.ports.filter((p) => p.direction === 'in').map((p) => p.value);
    const value = this.evaluateLogic(device.type, inputs);
    for (const port of outPorts) {
      port.value = value;
    }
    return outPorts;
  }

  /**
   * 三值逻辑求值（0/1/X），供 evaluateDevice 与单元测试使用。
   * 仅适用于组合逻辑门；输入器件（button/switch）与 LED 不进入此方法。
   */
  evaluateLogic(type: DeviceType, inputs: Signal[]): Signal {
    switch (type) {
      case 'and':
        return this.andLogic(inputs);
      case 'or':
        return this.orLogic(inputs);
      case 'not':
        return this.notLogic(inputs[0]);
      case 'xor':
        return this.xorLogic(inputs);
      default:
        // button/switch/led 无组合逻辑输出
        return inputs[0] ?? 'X';
    }
  }

  /** AND：任一输入为 0 → 0；否则有 X → X；全 1 → 1 */
  private andLogic(inputs: Signal[]): Signal {
    for (const v of inputs) if (v === 0) return 0;
    for (const v of inputs) if (v === 'X') return 'X';
    return 1;
  }

  /** OR：任一输入为 1 → 1；否则有 X → X；全 0 → 0 */
  private orLogic(inputs: Signal[]): Signal {
    for (const v of inputs) if (v === 1) return 1;
    for (const v of inputs) if (v === 'X') return 'X';
    return 0;
  }

  /** NOT：0 → 1，1 → 0，X → X */
  private notLogic(input: Signal): Signal {
    if (input === 0) return 1;
    if (input === 1) return 0;
    return 'X';
  }

  /** XOR：任一输入为 X → X；否则 A ≠ B → 1，A = B → 0 */
  private xorLogic(inputs: Signal[]): Signal {
    for (const v of inputs) if (v === 'X') return 'X';
    const ones = inputs.filter((v) => v === 1).length;
    return ones % 2 === 1 ? 1 : 0;
  }
}
