/**
 * Hardware Lab — 面包板工厂测试
 * 覆盖 830-point 结构、Hole/Node 映射、中央沟槽、电源轨分段、确定性。
 */

import { describe, expect, it } from 'vitest';
import {
  BREADBOARD_LAYOUT,
  buildBreadboardIndex,
  createBreadboard,
  POWER_SEGMENT_SIZE,
  ROW_COUNT,
} from './breadboardFactory';

describe('breadboardFactory — 830-point 结构', () => {
  const bb = createBreadboard();
  const index = buildBreadboardIndex(bb);

  it('1. 总孔数为 830（终端 630 + 电源 200）', () => {
    expect(bb.holes.length).toBe(830);
    expect(bb.holes.filter((h) => h.kind === 'terminal')).toHaveLength(63 * 10);
    expect(bb.holes.filter((h) => h.kind === 'power')).toHaveLength(200);
  });

  it('电气节点总数为 134（终端 126 + 电源 8）', () => {
    expect(bb.nodes.length).toBe(63 * 2 + 2 * 2 * 2);
  });

  it('2. 同行 A~E 属于同一节点（A5=B5=C5=D5=E5）', () => {
    const ids = ['A5', 'B5', 'C5', 'D5', 'E5'].map((h) => index.holeToNode.get(h));
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe('TL-5');
  });

  it('3. 同行 F~J 属于同一节点', () => {
    const ids = ['F5', 'G5', 'H5', 'I5', 'J5'].map((h) => index.holeToNode.get(h));
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe('TR-5');
  });

  it('4. 中央沟槽：A~E 与 F~J 不属于同一节点', () => {
    expect(index.holeToNode.get('C5')).not.toBe(index.holeToNode.get('H5'));
    expect(index.holeToNode.get('E5')).not.toBe(index.holeToNode.get('F5'));
  });

  it('5. 相邻行默认不连接', () => {
    expect(index.holeToNode.get('A5')).not.toBe(index.holeToNode.get('A6'));
    expect(index.holeToNode.get('J10')).not.toBe(index.holeToNode.get('J11'));
  });

  it('6. 中央沟槽不连接（整列左右节点互不相同）', () => {
    for (let row = 1; row <= ROW_COUNT; row++) {
      expect(index.holeToNode.get(`A${row}`)).not.toBe(index.holeToNode.get(`F${row}`));
    }
  });

  it('7. 电源轨相互独立（3V3≠GND，左≠右）', () => {
    expect(index.holeToNode.get('L-3V3-U-01')).not.toBe(index.holeToNode.get('L-GND-U-01'));
    expect(index.holeToNode.get('L-3V3-U-01')).not.toBe(index.holeToNode.get('R-3V3-U-01'));
    expect(index.holeToNode.get('R-3V3-U-01')).not.toBe(index.holeToNode.get('R-GND-U-01'));
  });

  it('8. 电源轨上下分段：同轨上段≠下段，每段 25 孔，中间留隙', () => {
    expect(bb.powerRails).toHaveLength(4); // 2 侧 × 2 类型
    for (const rail of bb.powerRails) {
      expect(rail.segments).toHaveLength(2);
      const [upper, lower] = rail.segments;
      expect(upper.nodeId).not.toBe(lower.nodeId);
      expect(upper.holeIds).toHaveLength(POWER_SEGMENT_SIZE);
      expect(lower.holeIds).toHaveLength(POWER_SEGMENT_SIZE);
      expect(lower.rowStart).toBeGreaterThan(upper.rowEnd);
    }
    // 上分段孔与下分段孔属于不同节点
    expect(index.holeToNode.get('L-3V3-U-25')).not.toBe(index.holeToNode.get('L-3V3-D-01'));
  });

  it('9. holeId → nodeId 映射正确', () => {
    expect(index.holeToNode.get('A1')).toBe('TL-1');
    expect(index.holeToNode.get('J63')).toBe('TR-63');
    expect(index.holeToNode.get('R-GND-D-25')).toBe('P-R-GND-D');
  });

  it('10. nodeId → holeIds 反向映射正确', () => {
    expect(index.nodeToHoles.get('TL-5')).toEqual(['A5', 'B5', 'C5', 'D5', 'E5']);
    expect(index.nodeToHoles.get('TR-5')).toEqual(['F5', 'G5', 'H5', 'I5', 'J5']);
    expect(index.nodeToHoles.get('P-L-3V3-U')).toHaveLength(25);
  });

  it('11. 同一节点内任意两孔 nodeId 相同', () => {
    expect(index.holeToNode.get('B12')).toBe(index.holeToNode.get('E12'));
    expect(index.holeToNode.get('G40')).toBe(index.holeToNode.get('J40'));
  });

  it('12. 不同节点 nodeId 不同（抽样）', () => {
    expect(index.holeToNode.get('A1')).not.toBe(index.holeToNode.get('A2'));
    expect(index.holeToNode.get('E30')).not.toBe(index.holeToNode.get('F30'));
  });

  it('所有节点孔数之和等于总孔数，且孔 id 全局唯一', () => {
    let sum = 0;
    for (const node of bb.nodes) sum += node.holeIds.length;
    expect(sum).toBe(830);
    expect(new Set(bb.holes.map((h) => h.id)).size).toBe(830);
  });

  it('每个孔的 nodeId 都指向真实节点', () => {
    for (const hole of bb.holes) {
      expect(index.nodeById.has(hole.nodeId)).toBe(true);
    }
  });

  it('17. 初始化具有确定性：两次创建结果完全一致', () => {
    const a = createBreadboard();
    const b = createBreadboard('breadboard-main');
    expect(a).toEqual(b);
  });

  it('布局常量符合规格：63 行、间距 20、分段 25', () => {
    expect(BREADBOARD_LAYOUT.rowCount).toBe(63);
    expect(BREADBOARD_LAYOUT.pitch).toBe(20);
    expect(BREADBOARD_LAYOUT.powerSegmentSize).toBe(25);
    expect(BREADBOARD_LAYOUT.leftTerminalColumns).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(BREADBOARD_LAYOUT.rightTerminalColumns).toEqual(['F', 'G', 'H', 'I', 'J']);
  });
});
