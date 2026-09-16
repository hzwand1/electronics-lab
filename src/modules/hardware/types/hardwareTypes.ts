/**
 * Hardware Lab — 数据模型（阶段 1：面包板 + 电气节点 + 导线）
 *
 * 纯 TypeScript，无 React / DOM / Zustand 依赖。
 *
 * 核心概念区分：
 *  - Hole（孔）：UI 交互单元，用户点击/悬停的对象。
 *  - Node（电气节点）：仿真单元。同行 A~E 的 5 个孔在电气上是同一个节点，
 *    但视觉上仍是 5 个独立的孔。
 *
 * UI 层使用 holeId，电气引擎使用 nodeId。
 */

/** 面包板行/列的逻辑坐标（网格单位，渲染时再乘以间距） */
export interface GridPoint {
  x: number;
  y: number;
}

/** 孔的种类 */
export type HoleKind = 'terminal' | 'power';

/** 电气节点的种类 */
export type NodeKind = 'terminal-left' | 'terminal-right' | 'power';

/** 电源母线类型 */
export type PowerType = '3v3' | 'gnd';

/** 电源轨所在侧 */
export type PowerSide = 'left' | 'right';

/** 电源轨上下分段 */
export type PowerSegmentKind = 'upper' | 'lower';

/**
 * 面包板上的一个物理孔。
 * position 使用逻辑网格坐标（与渲染解耦）。
 */
export interface BreadboardHole {
  /** 终端孔如 "A5"；电源孔如 "L-3V3-U-01" */
  id: string;
  kind: HoleKind;
  position: GridPoint;
  /** 该孔所属的电气节点 */
  nodeId: string;
  /** 终端孔：列字母 A~J；电源孔：电源类型列标识 */
  col: string;
  /** 终端孔：行号 1~63；电源孔：对齐的行号 */
  row: number;
}

/**
 * 电气节点。一个节点聚合多个物理孔。
 * 终端左节点含 A~E 五个孔；终端右节点含 F~J 五个孔；
 * 电源分段节点含一段（25 个）电源孔。
 */
export interface ElectricalNode {
  id: string;
  kind: NodeKind;
  holeIds: string[];
}

/** 电源轨的一个分段（上 / 下），每段是一个独立电气节点 */
export interface PowerRailSegment {
  id: string;
  kind: PowerSegmentKind;
  type: PowerType;
  side: PowerSide;
  nodeId: string;
  holeIds: string[];
  /** 该分段在终端行号上的覆盖范围（用于布局与说明） */
  rowStart: number;
  rowEnd: number;
}

/** 一条电源母线（某一侧的 +3.3V 或 GND），默认上下两段互不连通 */
export interface PowerRail {
  id: string;
  side: PowerSide;
  type: PowerType;
  /** 该母线包含的全部分段节点（默认 2 段，彼此独立） */
  segmentIds: string[];
  segments: PowerRailSegment[];
}

/** 面包板布局描述（纯数据，供 UI 换算几何与工厂建孔使用） */
export interface BreadboardLayout {
  version: string;
  rowCount: number;
  pitch: number;
  leftTerminalColumns: string[]; // ['A'..'E']
  rightTerminalColumns: string[]; // ['F'..'J']
  /** 各逻辑列的 x 网格坐标 */
  columnX: Record<string, number>;
  powerSides: PowerSide[];
  powerTypes: PowerType[];
  /** 每个电源分段包含的孔数 */
  powerSegmentSize: number;
  /** 电源上分段覆盖行范围 */
  powerUpperRows: { start: number; end: number };
  /** 电源下分段覆盖行范围 */
  powerLowerRows: { start: number; end: number };
}

/** 标准全尺寸面包板（阶段 1 固定模型） */
export interface Breadboard {
  id: string;
  type: 'full-size-830';
  layout: BreadboardLayout;
  holes: BreadboardHole[];
  nodes: ElectricalNode[];
  powerRails: PowerRail[];
}

/**
 * 预建索引：O(1) 的 holeId → nodeId、nodeId → holeIds 查询。
 * 初始化时建立一次，交互期间不重建。
 */
export interface BreadboardIndex {
  holeToNode: ReadonlyMap<string, string>;
  nodeToHoles: ReadonlyMap<string, readonly string[]>;
  holeById: ReadonlyMap<string, BreadboardHole>;
  nodeById: ReadonlyMap<string, ElectricalNode>;
}

/**
 * 导线连接的是 Node ↔ Node，不是 Hole ↔ Hole。
 * startHoleId / endHoleId 仅记录用户实际点击的锚点孔，用于渲染端点。
 */
export interface HardwareWire {
  id: string;
  startNodeId: string;
  endNodeId: string;
  startHoleId: string;
  endHoleId: string;
}

/** Hardware Lab 可持久化的电路结构（仅导线；面包板为确定性固定模型） */
export interface HardwareState {
  version: string;
  wires: HardwareWire[];
}

/** 添加导线的结果状态 */
export type AddWireStatus = 'created' | 'self-node' | 'duplicate' | 'invalid-hole';

export interface AddWireResult {
  status: AddWireStatus;
  state: HardwareState;
  wire?: HardwareWire;
}
