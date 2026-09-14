/**
 * Electronics Lab V0.1 — 数据模型定义（纯 TS，零 UI 依赖）
 *
 * 架构红线：本文件只能包含纯数据类型定义与工厂函数，
 * 禁止 import React / Zustand / DOM API / SVG API。
 */

/** 信号值：0=低电平，1=高电平，'X'=未定义（悬空或上游不确定） */
export type Signal = 0 | 1 | 'X';

/** 器件类型（V0.1 共 7 种） */
export type DeviceType = 'switch' | 'button' | 'led' | 'and' | 'or' | 'not' | 'xor';

/**
 * 逻辑网格坐标（Logical Grid Coordinate）。
 * 不是屏幕像素坐标。1 格 = 20px（V0.1 网格大小）。
 * 渲染时乘以 GRID_SIZE(20) 转为 SVG 逻辑像素坐标。
 * 存储和序列化时始终使用网格坐标，不受缩放影响。
 */
export interface GridPos {
  x: number;
  y: number;
}

/** 端口 */
export interface Port {
  /** 全局唯一，格式："{deviceId}_{portName}" */
  id: string;
  deviceId: string;
  direction: 'in' | 'out';
  /** "A" | "B" | "Y" | "in" | "out" */
  name: string;
  /**
   * 运行时派生状态（Simulation Runtime State）。
   * 由 SimulationEngine.evaluate() 计算产生，不属于需要持久化的电路结构数据。
   * localStorage 和 JSON 导出均不持久化此字段；导入后重置为 'X'，由 Engine 重新计算。
   */
  value: Signal;
}

/** 器件 */
export interface Device {
  id: string;
  type: DeviceType;
  /** 器件左上角的逻辑网格坐标（1 格 = 20px，非屏幕像素） */
  position: GridPos;
  /** 器件内部持久状态（button.pressed / switch.on 等） */
  state: Record<string, unknown>;
  /** 配置属性，V0.1 基本为空 */
  config: Record<string, unknown>;
  ports: Port[];
}

/** 连线 */
export interface Wire {
  id: string;
  /** 必须是 output 端口 */
  from: { deviceId: string; portId: string };
  /** 必须是 input 端口 */
  to: { deviceId: string; portId: string };
}

/** 电路 */
export interface Circuit {
  /** 格式 "0.1"，用于未来迁移 */
  version: string;
  devices: Device[];
  wires: Wire[];
}

/** 端口引用（用于 Store action 参数） */
export interface PortRef {
  deviceId: string;
  portId: string;
}

/** 仿真结果 */
export interface SimulationResult {
  /** 更新了所有端口 value 的新 Circuit（不可变） */
  circuit: Circuit;
  /** 是否存在反馈回路（V0.1 应始终为 false） */
  hasLoop: boolean;
  /** 模拟过程中的错误/警告 */
  errors: SimulationError[];
}

export interface SimulationError {
  type: 'loop_detected' | 'floating_input' | 'port_conflict';
  message: string;
  deviceId?: string;
  portId?: string;
}

/** Wire 合法性检查错误（checkWireLegality 返回；null 表示合法） */
export interface WireError {
  code: 'output_to_output' | 'input_as_source' | 'port_already_connected' | 'self_connection';
  message: string;
}

/** V0.1 网格大小：1 格 = 20px */
export const GRID_SIZE = 20;

/** 器件端口布局元数据（逻辑像素，相对器件左上角） */
export interface PortMeta {
  name: string;
  direction: 'in' | 'out';
  dx: number;
  dy: number;
}

export interface DeviceMeta {
  type: DeviceType;
  /** 显示标签 */
  label: string;
  width: number;
  height: number;
  ports: PortMeta[];
}

/** 器件尺寸与端口位置约定（逻辑像素；输入端口在左侧，输出端口在右侧） */
export const DEVICE_META: Record<DeviceType, DeviceMeta> = {
  switch: {
    type: 'switch',
    label: 'SWITCH',
    width: 60,
    height: 40,
    ports: [{ name: 'out', direction: 'out', dx: 60, dy: 20 }],
  },
  button: {
    type: 'button',
    label: 'BUTTON',
    width: 60,
    height: 40,
    ports: [{ name: 'out', direction: 'out', dx: 60, dy: 20 }],
  },
  led: {
    type: 'led',
    label: 'LED',
    width: 40,
    height: 40,
    ports: [{ name: 'in', direction: 'in', dx: 0, dy: 20 }],
  },
  and: {
    type: 'and',
    label: 'AND',
    width: 60,
    height: 60,
    ports: [
      { name: 'A', direction: 'in', dx: 0, dy: 20 },
      { name: 'B', direction: 'in', dx: 0, dy: 40 },
      { name: 'Y', direction: 'out', dx: 60, dy: 30 },
    ],
  },
  or: {
    type: 'or',
    label: 'OR',
    width: 60,
    height: 60,
    ports: [
      { name: 'A', direction: 'in', dx: 0, dy: 20 },
      { name: 'B', direction: 'in', dx: 0, dy: 40 },
      { name: 'Y', direction: 'out', dx: 60, dy: 30 },
    ],
  },
  not: {
    type: 'not',
    label: 'NOT',
    width: 40,
    height: 40,
    ports: [
      { name: 'A', direction: 'in', dx: 0, dy: 20 },
      { name: 'Y', direction: 'out', dx: 40, dy: 20 },
    ],
  },
  xor: {
    type: 'xor',
    label: 'XOR',
    width: 60,
    height: 60,
    ports: [
      { name: 'A', direction: 'in', dx: 0, dy: 20 },
      { name: 'B', direction: 'in', dx: 0, dy: 40 },
      { name: 'Y', direction: 'out', dx: 60, dy: 30 },
    ],
  },
};

let idCounter = 0;

/** 生成全局唯一器件 ID（示例电路使用可读 ID，运行时使用唯一 ID） */
export function nextDeviceId(type: DeviceType): string {
  idCounter += 1;
  return `${type}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

/** 生成全局唯一连线 ID */
export function nextWireId(): string {
  idCounter += 1;
  return `wire_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

/** 创建端口（value 初始为 'X'，由 Engine 计算） */
export function createPort(deviceId: string, name: string, direction: 'in' | 'out'): Port {
  return { id: `${deviceId}_${name}`, deviceId, direction, name, value: 'X' };
}

/** 根据器件类型创建完整器件（含默认端口集合） */
export function createDevice(type: DeviceType, position: GridPos, id?: string): Device {
  const deviceId = id ?? nextDeviceId(type);
  const meta = DEVICE_META[type];
  const device: Device = {
    id: deviceId,
    type,
    position: { x: position.x, y: position.y },
    state: {},
    config: {},
    ports: [],
  };
  if (type === 'button') device.state = { pressed: false };
  if (type === 'switch') device.state = { on: false };
  for (const pm of meta.ports) {
    device.ports.push(createPort(deviceId, pm.name, pm.direction));
  }
  return device;
}
