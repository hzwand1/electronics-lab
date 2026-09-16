/**
 * Hardware Lab Stage 2 — Component / ComponentPin 数据模型（S2-0）
 *
 * 纯类型定义，零 UI / 零 Store / 零引擎依赖。
 * 与 Stage 1 的关系：
 *   Component → Pin → Node → Breadboard Hole
 * Component Pin 连接的是 Node（pin.nodeId），Hole 只是 Node 的物理表现。
 * 本文件不修改 Stage 1 的 Breadboard / Hole / Node / Wire。
 */
import type { GridPoint } from './hardwareTypes';

/** Stage 2 第一批正式元件类型 */
export type ComponentType =
  | 'resistor'
  | 'led'
  | 'button'
  | 'switch'
  | 'buzzer'
  | 'power'
  | 'ground';

/** 元件旋转（教学模型，仅 90° 步进；S2-0 仅定义，渲染留待后续 Slice） */
export type ComponentRotation = 0 | 90 | 180 | 270;

/**
 * Pin 方向的教学分类（非严格电子学端口类型）。
 * passive：被动元件引脚（电阻两端、LED A/K、按键/开关两端）
 * power：电源类引脚（蜂鸣器 +/-）
 * out：电源源输出（3.3V / GND 的 OUT）
 * in：预留，S2-0 暂未使用
 */
export type PinDirection = 'in' | 'out' | 'passive' | 'power';

/** 电阻可选阻值（Stage 2 固定支持的档位） */
export type ResistorValue = '220' | '330' | '1k' | '10k' | '100k';

/**
 * 元件配置：discriminated union。
 * 不使用巨大 any 对象；每种元件只携带自身需要的配置字段。
 */
export type ComponentConfig =
  | { kind: 'resistor'; resistance: ResistorValue }
  | { kind: 'led' }
  | { kind: 'button' }
  | { kind: 'switch' }
  | { kind: 'buzzer' }
  | { kind: 'power' }
  | { kind: 'ground' };

/**
 * 元件引脚。
 * 电气连接依据是 nodeId（连接到 Stage 1 的 ElectricalNode），
 * 不是某个具体 Hole。anchorHoleId 若未来加入仅作视觉锚点，不作电气依据。
 */
export interface ComponentPin {
  /** 全局唯一，格式 "{componentId}_{pinName}" */
  id: string;
  componentId: string;
  /** 引脚名：LED 'A'|'K'，电阻/按键/开关 '1'|'2'，蜂鸣器 '+'|'-'，电源 'OUT' */
  name: string;
  direction: PinDirection;
  /** 该 Pin 连接的电气 Node；null = 未连接（浮空） */
  nodeId: string | null;
  /** Pin 在元件本地坐标系中的逻辑网格位置（相对元件左上角，1 格=20px） */
  position: GridPoint;
}

/**
 * 元件。
 * Component 保存"是什么 + 在哪 + 怎么配置 + 有哪些 Pin"；
 * Pin 保存"从哪里连接"；Node 保存"连接到哪里"。
 */
export interface Component {
  id: string;
  type: ComponentType;
  /** 元件左上角的逻辑网格坐标（与 Stage 1 GridPoint 一致，1 格=20px，非屏幕像素） */
  position: GridPoint;
  rotation: ComponentRotation;
  config: ComponentConfig;
  pins: ComponentPin[];
}
