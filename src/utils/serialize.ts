/**
 * Electronics Lab V0.1 — 序列化 / 反序列化
 *
 * 只处理 Circuit 结构数据。ports[].value 是运行时派生状态：
 *  - localStorage 持久化与 JSON 导出均省略 value 字段
 *  - 导入 / 加载后 value 重置为 'X'，由 Engine 重新计算
 */

import { Circuit, DeviceType, DEVICE_META } from '../engine/types';

const CIRCUIT_VERSION = '0.1';
const DEVICE_TYPES = Object.keys(DEVICE_META) as DeviceType[];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** 深拷贝 Circuit */
export function cloneCircuit(circuit: Circuit): Circuit {
  return JSON.parse(JSON.stringify(circuit)) as Circuit;
}

/** 将所有端口 value 重置为 'X'（就地修改，供导入 / 加载后使用） */
export function resetPortValues(circuit: Circuit): Circuit {
  for (const device of circuit.devices) {
    for (const port of device.ports) {
      port.value = 'X';
    }
  }
  return circuit;
}

/** 返回不含 ports[].value 的 Circuit 副本（用于持久化 / 导出） */
export function stripPortValues(circuit: Circuit): Circuit {
  const copy = cloneCircuit(circuit);
  for (const device of copy.devices) {
    for (const port of device.ports) {
      delete (port as { value?: unknown }).value;
    }
  }
  return copy;
}

/** 导出为 JSON 字符串（不含 ports[].value） */
export function serializeCircuit(circuit: Circuit): string {
  return JSON.stringify(stripPortValues(circuit), null, 2);
}

export interface CircuitValidation {
  ok: boolean;
  circuit?: Circuit;
  error?: string;
}

/**
 * 严格校验 JSON 电路文件并归一化。
 *
 * V0.1 拒绝而不是兜底以下情况：
 *  - 顶层结构错误（缺 version / devices / wires，version 非 "0.1"）
 *  - 未知 DeviceType
 *  - 非法 / 缺失的 position（非有限数）
 *  - 端口结构错误：缺端口、端口方向非法、deviceId 不匹配、端口 id 重复
 *  - Wire 引用了不存在的器件 / 端口，或端口方向接反（out→out / in→in）
 *  - 器件自连、一个输入端口被多条 Wire 驱动、Wire id 重复
 *
 * 校验通过后：position 取整，所有端口 value 归一化为 'X'（由 Engine 重算）。
 * 注意：环路不在此校验，环路由 Engine.hasLoop 在交互创建时保证；导入含环路时
 * Engine.evaluate 会以 hasLoop 安全返回，不影响结构合法性判定。
 */
export function validateAndNormalizeCircuit(input: unknown): CircuitValidation {
  if (!isRecord(input)) {
    return { ok: false, error: '文件格式无效' };
  }
  if (input.version !== CIRCUIT_VERSION) {
    return { ok: false, error: `文件格式无效：不支持的版本（需要 ${CIRCUIT_VERSION}）` };
  }
  if (!Array.isArray(input.devices) || !Array.isArray(input.wires)) {
    return { ok: false, error: '文件格式无效：缺少 devices / wires 数组' };
  }

  const devices: Circuit['devices'] = [];
  const deviceIds = new Set<string>();
  const portIds = new Set<string>();

  for (let di = 0; di < input.devices.length; di += 1) {
    const raw = input.devices[di];
    const where = `第 ${di + 1} 个器件`;
    if (!isRecord(raw)) return { ok: false, error: `文件格式无效：${where}不是对象` };

    if (typeof raw.id !== 'string' || raw.id.trim() === '') {
      return { ok: false, error: `文件格式无效：${where}缺少有效 id` };
    }
    if (deviceIds.has(raw.id)) {
      return { ok: false, error: `文件格式无效：器件 id 重复（${raw.id}）` };
    }

    if (typeof raw.type !== 'string' || !DEVICE_TYPES.includes(raw.type as DeviceType)) {
      return { ok: false, error: `文件格式无效：${where}（${raw.id}）的器件类型未知` };
    }
    const type = raw.type as DeviceType;

    if (!isRecord(raw.position) || !isFiniteNumber(raw.position.x) || !isFiniteNumber(raw.position.y)) {
      return { ok: false, error: `文件格式无效：器件 ${raw.id} 的 position 非法（需要数值 x / y）` };
    }

    if (raw.state !== undefined && !isRecord(raw.state)) {
      return { ok: false, error: `文件格式无效：器件 ${raw.id} 的 state 必须是对象` };
    }
    if (raw.config !== undefined && !isRecord(raw.config)) {
      return { ok: false, error: `文件格式无效：器件 ${raw.id} 的 config 必须是对象` };
    }
    if (!Array.isArray(raw.ports)) {
      return { ok: false, error: `文件格式无效：器件 ${raw.id} 缺少 ports 数组` };
    }

    // 端口集合必须与该器件类型的标准端口（名称 + 方向）完全一致
    const expected = DEVICE_META[type].ports;
    if (raw.ports.length !== expected.length) {
      return { ok: false, error: `文件格式无效：器件 ${raw.id} 的端口数量不正确` };
    }
    for (let pi = 0; pi < raw.ports.length; pi += 1) {
      const pp = raw.ports[pi];
      if (!isRecord(pp)) {
        return { ok: false, error: `文件格式无效：器件 ${raw.id} 的端口不是对象` };
      }
      if (typeof pp.id !== 'string' || pp.id.trim() === '') {
        return { ok: false, error: `文件格式无效：器件 ${raw.id} 存在缺少 id 的端口` };
      }
      if (portIds.has(pp.id)) {
        return { ok: false, error: `文件格式无效：端口 id 重复（${pp.id}）` };
      }
      if (pp.direction !== 'in' && pp.direction !== 'out') {
        return { ok: false, error: `文件格式无效：端口 ${pp.id} 的 direction 非法` };
      }
      if (typeof pp.name !== 'string' || pp.name.trim() === '') {
        return { ok: false, error: `文件格式无效：端口 ${pp.id} 缺少 name` };
      }
      if (pp.deviceId !== raw.id) {
        return { ok: false, error: `文件格式无效：端口 ${pp.id} 的 deviceId 与所属器件不一致` };
      }
      const match = expected.some((m) => m.name === pp.name && m.direction === pp.direction);
      if (!match) {
        return { ok: false, error: `文件格式无效：器件 ${raw.id} 的端口 ${pp.name}（${pp.direction}）与类型不符` };
      }
      portIds.add(pp.id);
    }

    deviceIds.add(raw.id);
    devices.push({
      id: raw.id,
      type,
      position: { x: Math.round(raw.position.x), y: Math.round(raw.position.y) },
      state: (isRecord(raw.state) ? raw.state : {}) as Record<string, unknown>,
      config: (isRecord(raw.config) ? raw.config : {}) as Record<string, unknown>,
      ports: (raw.ports as Record<string, unknown>[]).map((pp) => ({
        id: pp.id as string,
        deviceId: raw.id as string,
        direction: pp.direction as 'in' | 'out',
        name: pp.name as string,
        value: 'X' as const,
      })),
    });
  }

  // 端口索引：portId -> { deviceId, direction }
  const portIndex = new Map<string, { deviceId: string; direction: 'in' | 'out' }>();
  for (const d of devices) {
    for (const p of d.ports) portIndex.set(p.id, { deviceId: d.id, direction: p.direction });
  }

  const wires: Circuit['wires'] = [];
  const wireIds = new Set<string>();
  const drivenInputs = new Set<string>();

  for (let wi = 0; wi < input.wires.length; wi += 1) {
    const raw = input.wires[wi];
    const where = `第 ${wi + 1} 条连线`;
    if (!isRecord(raw)) return { ok: false, error: `文件格式无效：${where}不是对象` };
    if (typeof raw.id !== 'string' || raw.id.trim() === '') {
      return { ok: false, error: `文件格式无效：${where}缺少有效 id` };
    }
    if (wireIds.has(raw.id)) {
      return { ok: false, error: `文件格式无效：连线 id 重复（${raw.id}）` };
    }
    const f = raw.from;
    const t = raw.to;
    if (!isRecord(f) || typeof f.deviceId !== 'string' || typeof f.portId !== 'string') {
      return { ok: false, error: `文件格式无效：连线 ${raw.id} 的 from 引用不完整` };
    }
    if (!isRecord(t) || typeof t.deviceId !== 'string' || typeof t.portId !== 'string') {
      return { ok: false, error: `文件格式无效：连线 ${raw.id} 的 to 引用不完整` };
    }

    const fromPort = portIndex.get(f.portId);
    const toPort = portIndex.get(t.portId);
    if (!fromPort || fromPort.deviceId !== f.deviceId) {
      return { ok: false, error: `文件格式无效：连线 ${raw.id} 的起点器件 / 端口不存在` };
    }
    if (!toPort || toPort.deviceId !== t.deviceId) {
      return { ok: false, error: `文件格式无效：连线 ${raw.id} 的终点器件 / 端口不存在` };
    }
    if (fromPort.direction !== 'out') {
      return { ok: false, error: `文件格式无效：连线 ${raw.id} 的起点必须是输出端口` };
    }
    if (toPort.direction !== 'in') {
      return { ok: false, error: `文件格式无效：连线 ${raw.id} 的终点必须是输入端口` };
    }
    if (f.deviceId === t.deviceId) {
      return { ok: false, error: `文件格式无效：连线 ${raw.id} 不能连接同一器件` };
    }
    if (drivenInputs.has(t.portId)) {
      return { ok: false, error: `文件格式无效：输入端口 ${t.portId} 被多条连线驱动` };
    }
    drivenInputs.add(t.portId);
    wireIds.add(raw.id);
    wires.push({
      id: raw.id,
      from: { deviceId: f.deviceId, portId: f.portId },
      to: { deviceId: t.deviceId, portId: t.portId },
    });
  }

  return { ok: true, circuit: { version: CIRCUIT_VERSION, devices, wires } };
}

/** 版本迁移入口（V0.1 无迁移逻辑，预留） */
export function migrate(circuit: Circuit, _fromVersion: string, _toVersion: string): Circuit {
  return circuit;
}
