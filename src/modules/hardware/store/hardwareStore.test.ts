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
