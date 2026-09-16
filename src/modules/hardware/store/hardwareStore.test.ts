/**
 * Hardware Lab — Store 测试
 * 验证 Store 委托引擎完成 Node↔Node 判断，自身不实现节点逻辑；
 * 面包板/索引为确定性单例。
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useHardwareStore } from './hardwareStore';

describe('hardwareStore', () => {
  beforeEach(() => {
    useHardwareStore.setState({ wires: [] });
  });

  it('持有 830 孔面包板与预建索引', () => {
    const { breadboard, index } = useHardwareStore.getState();
    expect(breadboard.holes.length).toBe(830);
    expect(index.holeToNode.get('A5')).toBe('TL-5');
  });

  it('addWireByHoles 建立 Node↔Node 导线并写入状态', () => {
    const status = useHardwareStore.getState().addWireByHoles('A5', 'A10');
    expect(status).toBe('created');
    const { wires } = useHardwareStore.getState();
    expect(wires).toHaveLength(1);
    expect(new Set([wires[0].startNodeId, wires[0].endNodeId])).toEqual(new Set(['TL-5', 'TL-10']));
  });

  it('同节点连接返回 self-node 且不新增导线', () => {
    useHardwareStore.getState().addWireByHoles('A5', 'A10');
    const status = useHardwareStore.getState().addWireByHoles('A5', 'E5');
    expect(status).toBe('self-node');
    expect(useHardwareStore.getState().wires).toHaveLength(1);
  });

  it('重复连接返回 duplicate', () => {
    useHardwareStore.getState().addWireByHoles('A5', 'A10');
    expect(useHardwareStore.getState().addWireByHoles('B10', 'C5')).toBe('duplicate');
    expect(useHardwareStore.getState().wires).toHaveLength(1);
  });

  it('removeWire 删除指定导线', () => {
    useHardwareStore.getState().addWireByHoles('A5', 'A10');
    const id = useHardwareStore.getState().wires[0].id;
    useHardwareStore.getState().removeWire(id);
    expect(useHardwareStore.getState().wires).toHaveLength(0);
  });

  it('clearWires 清空全部导线', () => {
    useHardwareStore.getState().addWireByHoles('A5', 'A10');
    useHardwareStore.getState().addWireByHoles('B5', 'B10');
    useHardwareStore.getState().clearWires();
    expect(useHardwareStore.getState().wires).toHaveLength(0);
  });
});

describe('hardwareStore — 删除/清空不触碰面包板结构（数据完整性）', () => {
  beforeEach(() => {
    useHardwareStore.setState({ wires: [] });
  });

  it('删除单根导线后：830 孔 / 134 节点 / 映射全部不变，其他导线保留', () => {
    const store = useHardwareStore.getState();
    const bb = store.breadboard;
    const index = store.index;
    const holesSignature = bb.holes.map((h) => `${h.id}:${h.nodeId}`).join('|');
    const nodesSignature = JSON.stringify(bb.nodes.map((n) => [n.id, n.holeIds]));

    store.addWireByHoles('A5', 'A10');
    store.addWireByHoles('B20', 'J40');
    const firstId = useHardwareStore.getState().wires[0].id;
    useHardwareStore.getState().removeWire(firstId);

    const after = useHardwareStore.getState();
    expect(after.wires).toHaveLength(1); // 只删一根
    expect(after.breadboard).toBe(bb); // 同一引用，未重建
    expect(after.index).toBe(index);
    expect(after.breadboard.holes.length).toBe(830);
    expect(after.breadboard.nodes.length).toBe(134);
    expect(after.breadboard.holes.map((h) => `${h.id}:${h.nodeId}`).join('|')).toBe(holesSignature);
    expect(JSON.stringify(after.breadboard.nodes.map((n) => [n.id, n.holeIds]))).toBe(nodesSignature);
    expect(after.index.holeToNode.get('A5')).toBe('TL-5');
    expect(after.index.nodeToHoles.get('TL-5')).toHaveLength(5);
  });

  it('clearWires 后：wires=0，面包板 830 孔与全部 hole→node / node→holes 完全一致', () => {
    const store = useHardwareStore.getState();
    const bb = store.breadboard;
    const holeNodeBefore = Array.from(store.index.holeToNode.entries()).map(([h, n]) => `${h}>${n}`);
    const nodeHolesBefore = Array.from(store.index.nodeToHoles.entries()).map(
      ([n, hs]) => `${n}=${(hs as readonly string[]).join(',')}`,
    );

    store.addWireByHoles('A5', 'A10');
    store.addWireByHoles('L-3V3-U-01', 'A1');
    useHardwareStore.getState().clearWires();

    const after = useHardwareStore.getState();
    expect(after.wires).toHaveLength(0);
    expect(after.breadboard).toBe(bb);
    expect(after.breadboard.holes.length).toBe(830);
    expect(after.breadboard.nodes.length).toBe(134);
    expect(Array.from(after.index.holeToNode.entries()).map(([h, n]) => `${h}>${n}`)).toEqual(
      holeNodeBefore,
    );
    expect(
      Array.from(after.index.nodeToHoles.entries()).map(([n, hs]) => `${n}=${(hs as readonly string[]).join(',')}`),
    ).toEqual(nodeHolesBefore);
  });

  it('clearWires 后再次 clearWires 不报错，且仍可创建新导线', () => {
    const store = useHardwareStore.getState();
    store.addWireByHoles('A5', 'A10');
    useHardwareStore.getState().clearWires();
    expect(() => useHardwareStore.getState().clearWires()).not.toThrow();
    const status = useHardwareStore.getState().addWireByHoles('F1', 'G20');
    expect(status).toBe('created');
    expect(useHardwareStore.getState().wires).toHaveLength(1);
  });
});
