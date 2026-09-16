/**
 * Hardware Lab Stage 2 — Component / Pin Factory（S2-0）
 *
 * 纯 TypeScript，零 UI / 零 DOM / 零 Zustand / 零 Store 依赖。
 * 职责：根据 ComponentType 生成结构正确的 Component 与 ComponentPin。
 * 不包含：Pin→Node 连接操作（S2-1）、电气计算（后续 Slice）、UI（S2-2+）。
 */
import type {
  Component,
  ComponentConfig,
  ComponentPin,
  ComponentRotation,
  ComponentType,
  PinDirection,
  ResistorValue,
} from '../types/componentTypes';
import type { GridPoint } from '../types/hardwareTypes';

/** 单个 Pin 的布局定义（name + direction + 元件本地网格坐标） */
interface PinLayout {
  name: string;
  direction: PinDirection;
  position: GridPoint;
}

/**
 * 各元件的 Pin 布局。
 * position 为相对元件左上角的本地逻辑网格坐标（1 格=20px）。
 * 尺寸仅作教学占位，后续 UI Slice 可调整，但 Pin 命名与方向是稳定契约。
 */
const PIN_LAYOUTS: Record<ComponentType, readonly PinLayout[]> = {
  // 电阻：宽 3 格 × 高 2 格，两端引脚在左右两侧垂直居中
  resistor: [
    { name: '1', direction: 'passive', position: { x: 0, y: 1 } },
    { name: '2', direction: 'passive', position: { x: 3, y: 1 } },
  ],
  // LED：宽 2 格 × 高 2 格，A(阳极)左 / K(阴极)右
  led: [
    { name: 'A', direction: 'passive', position: { x: 0, y: 1 } },
    { name: 'K', direction: 'passive', position: { x: 2, y: 1 } },
  ],
  // 按键：瞬时，宽 2 格 × 高 2 格
  button: [
    { name: '1', direction: 'passive', position: { x: 0, y: 1 } },
    { name: '2', direction: 'passive', position: { x: 2, y: 1 } },
  ],
  // 开关：保持状态，宽 2 格 × 高 2 格
  switch: [
    { name: '1', direction: 'passive', position: { x: 0, y: 1 } },
    { name: '2', direction: 'passive', position: { x: 2, y: 1 } },
  ],
  // 有源蜂鸣器：+ / -
  buzzer: [
    { name: '+', direction: 'power', position: { x: 0, y: 1 } },
    { name: '-', direction: 'power', position: { x: 2, y: 1 } },
  ],
  // 3.3V 电源源：单个 OUT 引脚（教学模型中输出 HIGH）
  power: [
    { name: 'OUT', direction: 'out', position: { x: 1, y: 2 } },
  ],
  // GND：单个 OUT 引脚（教学模型中输出 LOW / 参考地）
  ground: [
    { name: 'OUT', direction: 'out', position: { x: 1, y: 2 } },
  ],
  // S2-2 UI 验证用 generic：宽 3 格 × 高 2 格，两端 passive 引脚
  generic: [
    { name: '1', direction: 'passive', position: { x: 0, y: 1 } },
    { name: '2', direction: 'passive', position: { x: 3, y: 1 } },
  ],
};

/** 电阻默认阻值 */
export const DEFAULT_RESISTOR_VALUE: ResistorValue = '1k';

/** 全部支持的电阻档位 */
export const RESISTOR_VALUES: readonly ResistorValue[] = ['220', '330', '1k', '10k', '100k'];

/** 全部 Stage 2 第一批元件类型 */
export const COMPONENT_TYPES: readonly ComponentType[] = [
  'resistor',
  'led',
  'button',
  'switch',
  'buzzer',
  'power',
  'ground',
];

/** 生成指定类型的默认配置 */
export function defaultConfigFor(type: ComponentType): ComponentConfig {
  switch (type) {
    case 'resistor':
      return { kind: 'resistor', resistance: DEFAULT_RESISTOR_VALUE };
    case 'led':
      return { kind: 'led' };
    case 'button':
      return { kind: 'button' };
    case 'switch':
      return { kind: 'switch' };
    case 'buzzer':
      return { kind: 'buzzer' };
    case 'power':
      return { kind: 'power' };
    case 'ground':
      return { kind: 'ground' };
    case 'generic':
      return { kind: 'generic' };
  }
}

/** 模块内自增计数器，用于生成唯一 Component ID */
let componentSeq = 0;

/** 生成下一个 Component ID（格式 CMP-<n>） */
function nextComponentId(): string {
  componentSeq += 1;
  return `CMP-${componentSeq}`;
}

/**
 * 创建一个 ComponentPin。
 * 新建 Pin 的 nodeId 恒为 null（未连接）；Pin→Node 连接由后续 Slice 负责。
 */
export function createPin(
  componentId: string,
  name: string,
  direction: PinDirection,
  localPosition: GridPoint,
): ComponentPin {
  return {
    id: `${componentId}_${name}`,
    componentId,
    name,
    direction,
    nodeId: null,
    // 复制坐标，避免外部对象被意外共享修改
    position: { x: localPosition.x, y: localPosition.y },
  };
}

export interface CreateComponentOptions {
  /** 自定义元件 ID；不传则自动生成唯一 ID */
  id?: string;
  /** 旋转角度，默认 0 */
  rotation?: ComponentRotation;
  /** 自定义配置；不传则使用该类型的默认配置 */
  config?: ComponentConfig;
}

/**
 * 创建一个 Component（含其全部 Pins）。
 *
 * 纯函数：不修改输入对象（position 会被复制）；
 * 相同输入下除自动生成的 id 外，结构完全确定。
 *
 * @param type 元件类型
 * @param position 元件左上角逻辑网格坐标（1 格=20px）
 * @param options 可选 id / rotation / config
 */
export function createComponent(
  type: ComponentType,
  position: GridPoint,
  options: CreateComponentOptions = {},
): Component {
  const id = options.id ?? nextComponentId();
  const rotation: ComponentRotation = options.rotation ?? 0;
  const config = options.config ?? defaultConfigFor(type);
  const layouts = PIN_LAYOUTS[type];
  const pins: ComponentPin[] = layouts.map((layout) =>
    createPin(id, layout.name, layout.direction, layout.position),
  );

  return {
    id,
    type,
    // 复制坐标，保持不可变
    position: { x: position.x, y: position.y },
    rotation,
    config,
    pins,
  };
}
