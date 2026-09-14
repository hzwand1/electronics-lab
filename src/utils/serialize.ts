/**
 * Electronics Lab V0.1 — 序列化 / 反序列化
 *
 * 只处理 Circuit 结构数据。ports[].value 是运行时派生状态：
 *  - localStorage 持久化与 JSON 导出均省略 value 字段
 *  - 导入 / 加载后 value 重置为 'X'，由 Engine 重新计算
 */

import { Circuit } from '../engine/types';

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
 * 校验 JSON 电路文件：version / devices / wires 基本结构。
 * 校验通过后 value 重置为 'X'（由 Engine 重算）。
 */
export function validateAndNormalizeCircuit(input: unknown): CircuitValidation {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: '文件格式无效' };
  }
  const obj = input as Record<string, unknown>;
  if (typeof obj.version !== 'string') {
    return { ok: false, error: '文件格式无效：缺少 version 字段' };
  }
  if (!Array.isArray(obj.devices) || !Array.isArray(obj.wires)) {
    return { ok: false, error: '文件格式无效：缺少 devices / wires 数组' };
  }
  const devices = (obj.devices as Record<string, unknown>[]).map((d, i) => {
    const dev = d as Record<string, unknown>;
    const port = dev.ports as Record<string, unknown>[] | undefined;
    return {
      id: typeof dev.id === 'string' ? dev.id : `unknown_${i}`,
      type: (typeof dev.type === 'string' ? dev.type : 'led') as never,
      position:
        typeof dev.position === 'object' && dev.position !== null
          ? {
              x: Math.round(((dev.position as Record<string, unknown>).x as number) ?? 0),
              y: Math.round(((dev.position as Record<string, unknown>).y as number) ?? 0),
            }
          : { x: 0, y: 0 },
      state: (dev.state as Record<string, unknown>) ?? {},
      config: (dev.config as Record<string, unknown>) ?? {},
      ports: Array.isArray(port)
        ? port.map((p) => {
            const pp = p as Record<string, unknown>;
            return {
              id: (pp.id as string) ?? `${dev.id}_${pp.name ?? 'p'}`,
              deviceId: (pp.deviceId as string) ?? (dev.id as string),
              direction: (pp.direction as 'in' | 'out') ?? 'in',
              name: (pp.name as string) ?? 'p',
              value: 'X' as const,
            };
          })
        : [],
    };
  });
  const wires = (obj.wires as Record<string, unknown>[]).map((w, i) => {
    const ww = w as Record<string, unknown>;
    return {
      id: (ww.id as string) ?? `imported_wire_${i}`,
      from: {
        deviceId: ((ww.from as Record<string, unknown>)?.deviceId as string) ?? '',
        portId: ((ww.from as Record<string, unknown>)?.portId as string) ?? '',
      },
      to: {
        deviceId: ((ww.to as Record<string, unknown>)?.deviceId as string) ?? '',
        portId: ((ww.to as Record<string, unknown>)?.portId as string) ?? '',
      },
    };
  });
  const circuit: Circuit = {
    version: obj.version as string,
    devices: devices as Circuit['devices'],
    wires: wires as Circuit['wires'],
  };
  return { ok: true, circuit };
}

/** 版本迁移入口（V0.1 无迁移逻辑，预留） */
export function migrate(circuit: Circuit, _fromVersion: string, _toVersion: string): Circuit {
  return circuit;
}
