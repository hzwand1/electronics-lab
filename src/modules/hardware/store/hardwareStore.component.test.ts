/**
 * Hardware Lab — Store Component 操作测试（S2-2）
 *
 * 验证：
 *  - addComponent('generic') 创建 2-pin 元件
 *  - moveComponent 只改 position，绝不改变 pins.nodeId（视觉位置 ≠ 电气连接）
 *  - rotateComponent 只改 rotation，绝不改变 pins.nodeId
 *  - removeComponent 删除元件及 pins，不触碰面包板/导线/其他元件
 *  - 对不存在的 id 操作不报错、不破坏数据
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { useHardwareStore } from './hardwareStore';

describe('hardwareStore — S2-2 Component 操作', () => {
  beforeEach(() => {
    useHardwareStore.setState({ wires: [], components: [] });
  });

  it('addComponent generic 创建 2-pin 元件，id 唯一，pin componentId 正确', () => {
    const id = useHardwareStore.getState().addComponent('generic', { x: 5, y: 3 });
    const { components } = useHardwareStore.getState();
    expect(components).toHaveLength(1);
    expect(components[0].id).toBe(id);
    expect(components[0].type).toBe('generic');
    expect(components[0].position).toEqual({ x: 5, y: 3 });
    expect(components[0].rotation).toBe(0);
    expect(components[0].pins).toHaveLength(2);
    expect(components[0].pins.map((p) => p.name)).toEqual(['1', '2']);
    expect(components[0].pins.every((p) => p.componentId === id)).toBe(true);
    expect(components[0].pins.every((p) => p.nodeId === null)).toBe(true);
  });

  it('moveComponent 改变 position，不改变 pins.nodeId', () => {
    const id = useHardwareStore.getState().addComponent('generic', { x: 1, y: 1 });
    // 先连接一个 pin 到 node，验证移动后 nodeId 不变
    const pinId = useHardwareStore.getState().components[0].pins[0].id;
    useHardwareStore.getState().connectPinToNode(pinId, 'TL-5');
    expect(useHardwareStore.getState().components[0].pins[0].nodeId).toBe('TL-5');

    useHardwareStore.getState().moveComponent(id, { x: 10, y: 20 });
    const comp = useHardwareStore.getState().components[0];
    expect(comp.position).toEqual({ x: 10, y: 20 });
    // 关键：电气连接不随视觉移动改变
    expect(comp.pins[0].nodeId).toBe('TL-5');
    expect(comp.pins[1].nodeId).toBeNull();
  });

  it('moveComponent 不改变其他元件', () => {
    const id1 = useHardwareStore.getState().addComponent('generic', { x: 1, y: 1 });
    useHardwareStore.getState().addComponent('generic', { x: 5, y: 5 });
    useHardwareStore.getState().moveComponent(id1, { x: 9, y: 9 });
    const comps = useHardwareStore.getState().components;
    expect(comps[0].position).toEqual({ x: 9, y: 9 });
    expect(comps[1].position).toEqual({ x: 5, y: 5 });
  });

  it('rotateComponent 0→90→180→270→0，不改变 pins.nodeId', () => {
    const id = useHardwareStore.getState().addComponent('generic', { x: 0, y: 0 });
    const pinId = useHardwareStore.getState().components[0].pins[1].id;
    useHardwareStore.getState().connectPinToNode(pinId, 'TL-10');

    const store = useHardwareStore.getState();
    store.rotateComponent(id);
    expect(useHardwareStore.getState().components[0].rotation).toBe(90);
    store.rotateComponent(id);
    expect(useHardwareStore.getState().components[0].rotation).toBe(180);
    store.rotateComponent(id);
    expect(useHardwareStore.getState().components[0].rotation).toBe(270);
    store.rotateComponent(id);
    expect(useHardwareStore.getState().components[0].rotation).toBe(0);

    // 旋转全程不改变电气连接
    expect(useHardwareStore.getState().components[0].pins[1].nodeId).toBe('TL-10');
  });

  it('removeComponent 删除元件及 pins，不触碰面包板和导线', () => {
    useHardwareStore.getState().addWireByHoles('A5', 'A10');
    const compId = useHardwareStore.getState().addComponent('generic', { x: 1, y: 1 });
    const pinId = useHardwareStore.getState().components[0].pins[0].id;
    useHardwareStore.getState().connectPinToNode(pinId, 'TL-5');

    const holeCountBefore = useHardwareStore.getState().breadboard.holes.length;
    useHardwareStore.getState().removeComponent(compId);

    expect(useHardwareStore.getState().components).toHaveLength(0);
    // 导线不受影响
    expect(useHardwareStore.getState().wires).toHaveLength(1);
    // 面包板结构不受影响
    expect(useHardwareStore.getState().breadboard.holes.length).toBe(holeCountBefore);
    expect(useHardwareStore.getState().index.holeToNode.get('A5')).toBe('TL-5');
  });

  it('moveComponent 不存在的 id 不报错、不破坏数据', () => {
    useHardwareStore.getState().addComponent('generic', { x: 1, y: 1 });
    useHardwareStore.getState().moveComponent('NONEXISTENT', { x: 99, y: 99 });
    expect(useHardwareStore.getState().components[0].position).toEqual({ x: 1, y: 1 });
  });

  it('rotateComponent 不存在的 id 不报错、不破坏数据', () => {
    useHardwareStore.getState().addComponent('generic', { x: 1, y: 1 });
    useHardwareStore.getState().rotateComponent('NONEXISTENT');
    expect(useHardwareStore.getState().components[0].rotation).toBe(0);
  });

  it('removeComponent 不存在的 id 不报错、不破坏数据', () => {
    useHardwareStore.getState().addComponent('generic', { x: 1, y: 1 });
    useHardwareStore.getState().removeComponent('NONEXISTENT');
    expect(useHardwareStore.getState().components).toHaveLength(1);
  });

  it('删除后可重新创建相同位置的元件', () => {
    const id1 = useHardwareStore.getState().addComponent('generic', { x: 3, y: 3 });
    useHardwareStore.getState().removeComponent(id1);
    const id2 = useHardwareStore.getState().addComponent('generic', { x: 3, y: 3 });
    expect(useHardwareStore.getState().components).toHaveLength(1);
    expect(id2).not.toBe(id1); // id 唯一
    expect(useHardwareStore.getState().components[0].position).toEqual({ x: 3, y: 3 });
  });
});
