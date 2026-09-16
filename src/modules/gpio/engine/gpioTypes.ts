/**
 * GPIO 入门实验模块 — 数据模型
 * 纯 TypeScript，无 UI 依赖。
 * 所有类型为 Stage 1 教学简化模型，不代表精确电气仿真。
 */

/** 逻辑电平（教学模型三值） */
export type Level = 0 | 1 | 'X';

/** 外部激励状态 */
export type External = 'high' | 'low' | 'floating';

/** 内部上下拉配置（输入模式下三选一） */
export type Pull = 'none' | 'up' | 'down';

/** 输出类型 */
export type OutType = 'push-pull' | 'open-drain';

/** GPIO 方向 */
export type Direction = 'in' | 'out';

/**
 * GPIO 配置（用户可操作的全部输入）。
 * 这是 Store 中持久化的唯一状态；其余均为派生。
 */
export interface GpioConfig {
  direction: Direction;
  pull: Pull;
  outType: OutType;
  odr: 0 | 1; // 输出数据寄存器（概念模型，非真实寄存器）
  external: External; // 外部激励
}

/**
 * 驱动强度（教学模型）。
 * strong：外部源、推挽 P/N 管、开漏 N 管导通时
 * weak：内部上拉/下拉电阻接入时
 * z：高阻（无驱动）
 */
export type DriveStrength = 'strong-h' | 'strong-l' | 'weak-h' | 'weak-l' | 'z';

/** 警告类型 */
export type GpioWarning = 'floating' | 'contention' | 'open-drain-needs-pull';

/**
 * GPIO 派生状态（全部由 Engine 计算产生，UI 只读）。
 * 不属于需要持久化的配置数据。
 */
export interface GpioDerived {
  pinLevel: Level; // 引脚节点最终电平
  contention: boolean; // 是否存在强驱对拉冲突
  pmosOn: boolean; // P-MOS 是否导通（教学简化）
  nmosOn: boolean; // N-MOS 是否导通（教学简化）
  pullActive: boolean; // 内部上下拉是否当前接入并起作用
  idr: Level; // 经施密特整形后的 MCU 读值
  activePath: string[]; // 当前导通的信号路径标识（用于 UI 流光）
  warnings: GpioWarning[]; // 当前警告列表
}

/** 默认配置：输入 + 浮空 + 外部断开，第一眼看到 IDR = X */
export const DEFAULT_CONFIG: GpioConfig = {
  direction: 'in',
  pull: 'none',
  outType: 'push-pull',
  odr: 0,
  external: 'floating',
};
