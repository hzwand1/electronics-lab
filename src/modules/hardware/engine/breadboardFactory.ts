/**
 * Hardware Lab — 面包板工厂（纯 TypeScript）
 *
 * 生成标准全尺寸 830-point 无焊面包板教学模型：
 *   - 终端区：63 行 × (A~E | F~J) = 630 孔
 *   - 电源区：2 侧 × 2 母线(3V3/GND) × 2 分段(上/下) × 25 孔 = 200 孔
 *   - 合计 830 孔
 *
 * 电气规则（在节点层面固化）：
 *   - 同行 A~E 属于同一节点；同行 F~J 属于同一节点
 *   - 中央沟槽左右绝缘
 *   - 相邻行默认不连接
 *   - 电源母线默认上下分段，分段之间不连通
 *
 * 该模块零随机性，相同输入永远得到相同结果（确定性）。
 */

import {
  Breadboard,
  BreadboardHole,
  BreadboardIndex,
  BreadboardLayout,
  ElectricalNode,
  GridPoint,
  PowerRail,
  PowerRailSegment,
  PowerSide,
  PowerType,
} from '../types/hardwareTypes';

export const ROW_COUNT = 63;
export const HOLE_PITCH = 20;
export const POWER_SEGMENT_SIZE = 25;

const LEFT_COLUMNS = ['A', 'B', 'C', 'D', 'E'] as const;
const RIGHT_COLUMNS = ['F', 'G', 'H', 'I', 'J'] as const;

// 逻辑列的 x 网格坐标：
// L-GND L-3V3 (gap) A B C D E (groove) F G H I J (gap) R-3V3 R-GND
const COLUMN_X: Record<string, number> = {
  'L-GND': 0,
  'L-3V3': 1,
  A: 3,
  B: 4,
  C: 5,
  D: 6,
  E: 7,
  // x=8 为中央沟槽
  F: 9,
  G: 10,
  H: 11,
  I: 12,
  J: 13,
  'R-3V3': 15,
  'R-GND': 16,
};

// 电源上分段对齐终端 1~25 行，下分段对齐 39~63 行（中间留出分段间隙）
const UPPER_ROWS = { start: 1, end: 25 };
const LOWER_ROWS = { start: ROW_COUNT - POWER_SEGMENT_SIZE + 1, end: ROW_COUNT }; // 39~63

export const BREADBOARD_LAYOUT: BreadboardLayout = {
  version: '1.0',
  rowCount: ROW_COUNT,
  pitch: HOLE_PITCH,
  leftTerminalColumns: [...LEFT_COLUMNS],
  rightTerminalColumns: [...RIGHT_COLUMNS],
  columnX: COLUMN_X,
  powerSides: ['left', 'right'],
  powerTypes: ['3v3', 'gnd'],
  powerSegmentSize: POWER_SEGMENT_SIZE,
  powerUpperRows: UPPER_ROWS,
  powerLowerRows: LOWER_ROWS,
};

const SIDE_CODE: Record<PowerSide, 'L' | 'R'> = { left: 'L', right: 'R' };
const SEGMENT_CODE = { upper: 'U', lower: 'D' } as const;

function terminalNodeId(side: 'L' | 'R', row: number): string {
  return `${side === 'L' ? 'TL' : 'TR'}-${row}`;
}

function powerNodeId(side: PowerSide, type: PowerType, segment: 'upper' | 'lower'): string {
  return `P-${SIDE_CODE[side]}-${type === '3v3' ? '3V3' : 'GND'}-${SEGMENT_CODE[segment]}`;
}

function powerHoleId(side: PowerSide, type: PowerType, segment: 'upper' | 'lower', index: number): string {
  return `${SIDE_CODE[side]}-${type === '3v3' ? '3V3' : 'GND'}-${SEGMENT_CODE[segment]}-${String(index).padStart(2, '0')}`;
}

function powerColumnKey(side: PowerSide, type: PowerType): string {
  return side === 'left' ? `L-${type === '3v3' ? '3V3' : 'GND'}` : `R-${type === '3v3' ? '3V3' : 'GND'}`;
}

function gridPoint(colX: number, row: number): GridPoint {
  // 行号从 1 开始，顶部留半格间距
  return { x: colX * HOLE_PITCH, y: (row - 1) * HOLE_PITCH };
}

/**
 * 生成一个标准 830-point 面包板（含全部孔、节点、电源轨与布局）。
 * 纯函数、确定性、不依赖外部状态。
 */
export function createBreadboard(id = 'breadboard-main'): Breadboard {
  const holes: BreadboardHole[] = [];
  const nodes: ElectricalNode[] = [];

  // === 终端区：逐行建立左右两个节点 ===
  for (let row = 1; row <= ROW_COUNT; row++) {
    const leftNodeId = terminalNodeId('L', row);
    const rightNodeId = terminalNodeId('R', row);
    const leftHoleIds: string[] = [];
    const rightHoleIds: string[] = [];

    for (const col of LEFT_COLUMNS) {
      const holeId = `${col}${row}`;
      holes.push({
        id: holeId,
        kind: 'terminal',
        position: gridPoint(COLUMN_X[col], row),
        nodeId: leftNodeId,
        col,
        row,
      });
      leftHoleIds.push(holeId);
    }

    for (const col of RIGHT_COLUMNS) {
      const holeId = `${col}${row}`;
      holes.push({
        id: holeId,
        kind: 'terminal',
        position: gridPoint(COLUMN_X[col], row),
        nodeId: rightNodeId,
        col,
        row,
      });
      rightHoleIds.push(holeId);
    }

    nodes.push({ id: leftNodeId, kind: 'terminal-left', holeIds: leftHoleIds });
    nodes.push({ id: rightNodeId, kind: 'terminal-right', holeIds: rightHoleIds });
  }

  // === 电源区：两侧 × 两母线 × 上下两分段 ===
  const powerRails: PowerRail[] = [];

  for (const side of ['left', 'right'] as PowerSide[]) {
    for (const type of ['3v3', 'gnd'] as PowerType[]) {
      const railId = `RAIL-${SIDE_CODE[side]}-${type === '3v3' ? '3V3' : 'GND'}`;
      const segments: PowerRailSegment[] = [];
      const colX = COLUMN_X[powerColumnKey(side, type)];

      for (const segKind of ['upper', 'lower'] as const) {
        const range = segKind === 'upper' ? UPPER_ROWS : LOWER_ROWS;
        const segNodeId = powerNodeId(side, type, segKind);
        const segId = `SEG-${SIDE_CODE[side]}-${type === '3v3' ? '3V3' : 'GND'}-${SEGMENT_CODE[segKind]}`;
        const segHoleIds: string[] = [];

        for (let i = 0; i < POWER_SEGMENT_SIZE; i++) {
          const row = range.start + i;
          const holeId = powerHoleId(side, type, segKind, i + 1);
          holes.push({
            id: holeId,
            kind: 'power',
            position: gridPoint(colX, row),
            nodeId: segNodeId,
            col: type === '3v3' ? '3V3' : 'GND',
            row,
          });
          segHoleIds.push(holeId);
        }

        const segment: PowerRailSegment = {
          id: segId,
          kind: segKind,
          type,
          side,
          nodeId: segNodeId,
          holeIds: segHoleIds,
          rowStart: range.start,
          rowEnd: range.end,
        };
        segments.push(segment);
        nodes.push({ id: segNodeId, kind: 'power', holeIds: segHoleIds });
      }

      powerRails.push({
        id: railId,
        side,
        type,
        segmentIds: segments.map((s) => s.id),
        segments,
      });
    }
  }

  return {
    id,
    type: 'full-size-830',
    layout: BREADBOARD_LAYOUT,
    holes,
    nodes,
    powerRails,
  };
}

/**
 * 预建查询索引：holeId → nodeId、nodeId → holeIds 等。
 * 初始化时调用一次；交互期间直接查表，禁止在 mousemove 中重算整板。
 */
export function buildBreadboardIndex(breadboard: Breadboard): BreadboardIndex {
  const holeToNode = new Map<string, string>();
  const holeById = new Map<string, BreadboardHole>();
  const nodeToHoles = new Map<string, readonly string[]>();
  const nodeById = new Map<string, ElectricalNode>();

  for (const hole of breadboard.holes) {
    holeToNode.set(hole.id, hole.nodeId);
    holeById.set(hole.id, hole);
  }
  for (const node of breadboard.nodes) {
    nodeToHoles.set(node.id, [...node.holeIds]);
    nodeById.set(node.id, node);
  }

  return { holeToNode, nodeToHoles, holeById, nodeById };
}
