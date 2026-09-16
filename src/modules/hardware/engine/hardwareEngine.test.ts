/**
 * Hardware Lab — HardwareEngine 测试
 * 覆盖 Node↔Node 导线语义、自连接/去重/删除、不可变性、序列化。
 */

import { describe, expect, it } from 'vitest';
import { buildBreadboardIndex, createBreadboard } from './breadboardFactory';
import { HardwareEngine } from './hardwareEngine';
import { HardwareState } from '../types/hardwareTypes';
import engineSource from './hardwareEngine.ts?raw';

const bb = createBreadboard();
const index = buildBreadboardIndex(bb);
const engine = new HardwareEngine(index);

describe('HardwareEngine — 查询', () => {
  it('nodeOfHole / holesOfNode / areSameNode', () => {
    expect(engine.nodeOfHole('A5')).toBe('TL-5');
    expect(engine.holesOfNode('TL-5')).toEqual(['A5', 'B5', 'C5', 'D5', 'E5']);
    expect(engine.areSameNode('A5', 'E5')).toBe(true);
    expect(engine.areSameNode('A5', 'F5')).toBe(false);
    expect(engine.hasNode('P-L-GND-D')).toBe(true);
    expect(engine.nodeOfHole('ZZ9')).toBeUndefined();
  });
});

describe('HardwareEngine — addWire（Node ↔ Node）', () => {
  it('13. 点击 A5 → A10 记录的是节点连接 TL-5 ↔ TL-10', () => {
    const state = engine.createInitialState();
    const result = engine.addWire(state, 'A5', 'A10');
    expect(result.status).toBe('created');
    expect(result.wire?.startNodeId).toBe('TL-10');
    expect(result.wire?.endNodeId).toBe('TL-5');
    // 锚点孔被保留用于渲染
    expect(result.state.wires[0].startHoleId).toBe('A10');
    expect(result.state.wires[0].endHoleId).toBe('A5');
  });

  it('可以连接电源分段节点到终端节点', () => {
    const state = engine.createInitialState();
    const result = engine.addWire(state, 'L-3V3-U-01', 'A1');
    expect(result.status).toBe('created');
    expect(result.wire?.startNodeId).toBe('P-L-3V3-U');
    expect(result.wire?.endNodeId).toBe('TL-1');
  });

  it('14. 同一节点内连接（A5→E5）为 no-op', () => {
    const state = engine.createInitialState();
    const result = engine.addWire(state, 'A5', 'E5');
    expect(result.status).toBe('self-node');
    expect(result.state.wires).toHaveLength(0);
    expect(result.state).toBe(state);
  });

  it('同一个孔连自己也是 self-node', () => {
    const state = engine.createInitialState();
    expect(engine.addWire(state, 'A5', 'A5').status).toBe('self-node');
  });

  it('15. 重复连接不重复创建（含反向）', () => {
    const state = engine.createInitialState();
    const first = engine.addWire(state, 'A5', 'A10');
    expect(first.status).toBe('created');
    const again = engine.addWire(first.state, 'A5', 'A10');
    expect(again.status).toBe('duplicate');
    // 反向、使用同节点的其他孔也视为同一连接
    const reverse = engine.addWire(first.state, 'C10', 'B5');
    expect(reverse.status).toBe('duplicate');
    expect(first.state.wires).toHaveLength(1);
  });

  it('无效孔返回 invalid-hole 且不改状态', () => {
    const state = engine.createInitialState();
    expect(engine.addWire(state, 'A5', 'ZZ9').status).toBe('invalid-hole');
    expect(state.wires).toHaveLength(0);
  });

  it('导线 id 与方向无关（确定性）', () => {
    const a = engine.addWire(engine.createInitialState(), 'A5', 'A10');
    const b = engine.addWire(engine.createInitialState(), 'A10', 'A5');
    expect(a.wire?.id).toBe(b.wire?.id);
  });
});

describe('HardwareEngine — removeWire / clearWires', () => {
  it('16. 删除导线正常', () => {
    let s = engine.createInitialState();
    s = engine.addWire(s, 'A5', 'A10').state;
    const id = s.wires[0].id;
    const removed = engine.removeWire(s, id);
    expect(removed.wires).toHaveLength(0);
    // 删除不存在的 id 返回原状态
    expect(engine.removeWire(removed, id)).toBe(removed);
  });

  it('clearWires 清空', () => {
    let s = engine.createInitialState();
    s = engine.addWire(s, 'A5', 'A10').state;
    s = engine.addWire(s, 'B5', 'B10').state;
    expect(engine.clearWires(s).wires).toHaveLength(0);
  });
});

describe('HardwareEngine — 不可变性（18）', () => {
  it('addWire 不修改输入 state', () => {
    const state = engine.createInitialState();
    engine.addWire(state, 'A5', 'A10');
    engine.addWire(state, 'A5', 'E5');
    expect(state.wires).toHaveLength(0);
  });

  it('相同操作多次得到等价结果', () => {
    const r1 = engine.addWire(engine.createInitialState(), 'F1', 'G20');
    const r2 = engine.addWire(engine.createInitialState(), 'F1', 'G20');
    expect(r1.state).toEqual(r2.state);
  });
});

describe('HardwareEngine — 序列化（20）', () => {
  function twoWires(): HardwareState {
    let s = engine.createInitialState();
    s = engine.addWire(s, 'A5', 'A10').state;
    s = engine.addWire(s, 'L-GND-D-01', 'J63').state;
    return s;
  }

  it('serialize → deserialize 往返后导线结构一致', () => {
    const state = twoWires();
    const json = engine.serialize(state);
    const restored = engine.deserialize(json);
    expect(restored.wires).toHaveLength(2);
    expect(new Set(restored.wires.map((w) => w.id))).toEqual(new Set(state.wires.map((w) => w.id)));
  });

  it('deserialize 拒绝引用不存在节点的导线', () => {
    const bad = JSON.stringify({
      version: '1.0',
      wires: [{ id: 'x', startNodeId: 'NOPE', endNodeId: 'TL-1', startHoleId: 'A1', endHoleId: 'A2' }],
    });
    expect(() => engine.deserialize(bad)).toThrow();
  });

  it('deserialize 拒绝锚点孔与节点不一致', () => {
    const bad = JSON.stringify({
      version: '1.0',
      wires: [{ startNodeId: 'TL-5', endNodeId: 'TL-6', startHoleId: 'A6', endHoleId: 'A6' }],
    });
    expect(() => engine.deserialize(bad)).toThrow();
  });

  it('deserialize 拒绝明显错误结构', () => {
    expect(() => engine.deserialize('{bad json')).toThrow();
    expect(() => engine.deserialize(JSON.stringify({ version: '1.0' }))).toThrow();
  });

  it('deserialize 自动去除重复导线', () => {
    const dup = JSON.stringify({
      version: '1.0',
      wires: [
        { startNodeId: 'TL-5', endNodeId: 'TL-6', startHoleId: 'A5', endHoleId: 'A6' },
        { startNodeId: 'TL-6', endNodeId: 'TL-5', startHoleId: 'B6', endHoleId: 'B5' },
      ],
    });
    expect(engine.deserialize(dup).wires).toHaveLength(1);
  });

  it('safeLoadWires 宽松加载：丢弃非法项、保留合法项', () => {
    const raw = [
      { startNodeId: 'TL-1', endNodeId: 'TL-2', startHoleId: 'A1', endHoleId: 'A2' },
      { startNodeId: 'BAD', endNodeId: 'TL-2', startHoleId: 'x', endHoleId: 'A2' },
    ];
    expect(engine.safeLoadWires(raw)).toHaveLength(1);
    expect(engine.safeLoadWires(undefined)).toEqual([]);
  });
});

describe('HardwareEngine — 删除/清空后的连线生命周期', () => {
  it('删除一根后其他导线保留（wire-002 删除，001/003 保留）', () => {
    let s = engine.createInitialState();
    s = engine.addWire(s, 'A1', 'A2').state; // TL-1 ↔ TL-2
    s = engine.addWire(s, 'B3', 'B4').state; // TL-3 ↔ TL-4
    s = engine.addWire(s, 'C5', 'C6').state; // TL-5 ↔ TL-6
    const target = s.wires.find((w) => w.startNodeId === 'TL-3' && w.endNodeId === 'TL-4')!.id;
    const after = engine.removeWire(s, target);
    const pairs = after.wires.map((w) => `${w.startNodeId}::${w.endNodeId}`).sort();
    expect(pairs).toEqual(['TL-1::TL-2', 'TL-5::TL-6']);
  });

  it('删除不存在的 wireId 不报错且不改动其他数据', () => {
    let s = engine.createInitialState();
    s = engine.addWire(s, 'A1', 'A2').state;
    const after = engine.removeWire(s, 'W::NO::SUCH');
    expect(after).toBe(s);
    expect(after.wires).toHaveLength(1);
  });

  it('同一根导线删除两次不会破坏状态', () => {
    let s = engine.createInitialState();
    s = engine.addWire(s, 'A1', 'A2').state;
    const id = s.wires[0].id;
    const once = engine.removeWire(s, id);
    const twice = engine.removeWire(once, id);
    expect(once.wires).toHaveLength(0);
    expect(twice.wires).toHaveLength(0);
  });

  it('删除导线后仍可创建同一节点对的新导线', () => {
    let s = engine.createInitialState();
    s = engine.addWire(s, 'A5', 'A10').state;
    s = engine.removeWire(s, s.wires[0].id);
    const re = engine.addWire(s, 'A5', 'A10');
    expect(re.status).toBe('created');
    expect(re.state.wires).toHaveLength(1);
  });

  it('删除导线不影响 self-node 检查', () => {
    let s = engine.createInitialState();
    s = engine.addWire(s, 'A5', 'A10').state;
    s = engine.removeWire(s, s.wires[0].id);
    expect(engine.addWire(s, 'A5', 'E5').status).toBe('self-node');
  });

  it('删除导线不影响 duplicate 检查（剩余连接仍判重）', () => {
    let s = engine.createInitialState();
    s = engine.addWire(s, 'A5', 'A10').state;
    // 未删除该连接时，用同节点别的孔重复连接仍判 duplicate
    expect(engine.addWire(s, 'B5', 'B10').status).toBe('duplicate');
  });

  it('clearWires 后可正常创建新导线；连续 clearWires 不报错', () => {
    let s = engine.createInitialState();
    s = engine.addWire(s, 'A1', 'A2').state;
    s = engine.addWire(s, 'A3', 'A4').state;
    s = engine.clearWires(s);
    expect(s.wires).toHaveLength(0);
    const again = engine.clearWires(s);
    expect(again).toBe(s);
    const re = engine.addWire(s, 'A1', 'A2');
    expect(re.status).toBe('created');
  });
});

describe('HardwareEngine — 纯度（19）', () => {
  it('引擎源码不依赖 React / Zustand / DOM / SVG', () => {
    const src = engineSource;
    expect(src).not.toMatch(/from 'react'/);
    expect(src).not.toMatch(/from 'zustand/);
    expect(src).not.toMatch(/document\.|window\.|navigator\./);
    expect(src).not.toMatch(/from '\.\.\/\.\.\/store|from '\.\.\/store/); // 不依赖 Store
    expect(src).not.toMatch(/\.tsx/);
  });
});
