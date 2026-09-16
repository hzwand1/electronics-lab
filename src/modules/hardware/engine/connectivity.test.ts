/**
 * Hardware Lab Stage 2 S2-1 — connectivity 纯 TS 单元测试。
 *
 * 覆盖：ComponentPin ↔ Node 连接、断开、重连、多 Pin 共节点、
 * 非法数据拒绝、删除 Component 边界、不可变性、safeLoadComponents。
 * 不涉及 UI / Store / DOM。
 */
import { describe, it, expect } from 'vitest';
import {
  connectPinToNode,
  disconnectPin,
  removeComponent,
  safeLoadComponents,
} from './connectivity';
import { createComponent } from './componentFactory';
import type { Component } from '../types/componentTypes';

/** 测试用合法 Node 集合（模拟面包板索引中的 nodeId） */
const VALID_NODES: ReadonlySet<string> = new Set(['N1', 'N2', 'N3']);

function makeLed(id = 'D1'): Component {
  return createComponent('led', { x: 0, y: 0 }, { id });
}

function makeResistor(id = 'R1'): Component {
  return createComponent('resistor', { x: 5, y: 0 }, { id });
}

describe('S2-1 基础：Pin 默认未连接', () => {
  it('新建 Pin 的 nodeId 恒为 null', () => {
    const led = makeLed();
    for (const p of led.pins) {
      expect(p.nodeId).toBeNull();
    }
  });
});

describe('S2-1 connectPinToNode — 合法连接', () => {
  it('Pin 可连接到合法 Node，返回 ok', () => {
    const led = makeLed();
    const result = connectPinToNode([led], 'D1_A', 'N1', VALID_NODES);
    expect(result.status).toBe('ok');
    expect(result.pin?.nodeId).toBe('N1');
  });

  it('连接后 components 中该 Pin 的 nodeId 正确', () => {
    const led = makeLed();
    const { components } = connectPinToNode([led], 'D1_A', 'N2', VALID_NODES);
    const pin = components[0].pins.find((p) => p.id === 'D1_A')!;
    expect(pin.nodeId).toBe('N2');
  });

  it('连接一个 Pin 不影响同一元件的其他 Pin', () => {
    const led = makeLed();
    const { components } = connectPinToNode([led], 'D1_A', 'N1', VALID_NODES);
    const k = components[0].pins.find((p) => p.id === 'D1_K')!;
    expect(k.nodeId).toBeNull();
  });
});

describe('S2-1 disconnectPin — 断开', () => {
  it('已连接的 Pin 可断开，nodeId 回到 null', () => {
    const led = makeLed();
    const connected = connectPinToNode([led], 'D1_A', 'N1', VALID_NODES).components;
    const result = disconnectPin(connected, 'D1_A');
    expect(result.status).toBe('ok');
    expect(result.pin?.nodeId).toBeNull();
  });

  it('未连接的 Pin 断开返回 already-same（幂等）', () => {
    const led = makeLed();
    const result = disconnectPin([led], 'D1_A');
    expect(result.status).toBe('already-same');
  });
});

describe('S2-1 重连：Pin N1 → N2', () => {
  it('已连接 N1 的 Pin 可重新绑定到 N2', () => {
    const led = makeLed();
    const step1 = connectPinToNode([led], 'D1_A', 'N1', VALID_NODES).components;
    const result = connectPinToNode(step1, 'D1_A', 'N2', VALID_NODES);
    expect(result.status).toBe('ok');
    expect(result.pin?.nodeId).toBe('N2');
  });

  it('重连后 Pin 只属于 N2，不再属于 N1', () => {
    const led = makeLed();
    const step1 = connectPinToNode([led], 'D1_A', 'N1', VALID_NODES).components;
    const step2 = connectPinToNode(step1, 'D1_A', 'N2', VALID_NODES).components;
    const pin = step2[0].pins.find((p) => p.id === 'D1_A')!;
    expect(pin.nodeId).toBe('N2');
    expect(pin.nodeId).not.toBe('N1');
  });

  it('连接到已连接的同一 Node 返回 already-same，无变化', () => {
    const led = makeLed();
    const step1 = connectPinToNode([led], 'D1_A', 'N1', VALID_NODES).components;
    const result = connectPinToNode(step1, 'D1_A', 'N1', VALID_NODES);
    expect(result.status).toBe('already-same');
  });
});

describe('S2-1 多 Pin 可属于同一个 Node', () => {
  it('LED.A 与 Resistor.1 可同时连接到 N1', () => {
    const led = makeLed('D1');
    const res = makeResistor('R1');
    let components = connectPinToNode([led, res], 'D1_A', 'N1', VALID_NODES).components;
    components = connectPinToNode(components, 'R1_1', 'N1', VALID_NODES).components;
    const ledA = components.find((c) => c.id === 'D1')!.pins.find((p) => p.name === 'A')!;
    const res1 = components.find((c) => c.id === 'R1')!.pins.find((p) => p.name === '1')!;
    expect(ledA.nodeId).toBe('N1');
    expect(res1.nodeId).toBe('N1');
  });

  it('一个 Node 可连接多个 Pin，不复制 Node（Pin 直接引用同一 nodeId 字符串）', () => {
    const led = makeLed('D1');
    const res = makeResistor('R1');
    let components = connectPinToNode([led, res], 'D1_A', 'N1', VALID_NODES).components;
    components = connectPinToNode(components, 'R1_1', 'N1', VALID_NODES).components;
    const allN1 = components.flatMap((c) => c.pins).filter((p) => p.nodeId === 'N1');
    expect(allN1).toHaveLength(2);
  });
});

describe('S2-1 非法数据拒绝', () => {
  it('连接不存在的 Pin 返回 pin-not-found', () => {
    const led = makeLed();
    const result = connectPinToNode([led], 'BAD_PIN', 'N1', VALID_NODES);
    expect(result.status).toBe('pin-not-found');
  });

  it('连接不存在的 Node 返回 node-not-found', () => {
    const led = makeLed();
    const result = connectPinToNode([led], 'D1_A', 'BAD_NODE', VALID_NODES);
    expect(result.status).toBe('node-not-found');
  });

  it('malformed id（空字符串）作为 Pin 被拒绝', () => {
    const led = makeLed();
    const result = connectPinToNode([led], '', 'N1', VALID_NODES);
    expect(result.status).toBe('pin-not-found');
  });

  it('malformed id（空字符串）作为 Node 被拒绝', () => {
    const led = makeLed();
    const result = connectPinToNode([led], 'D1_A', '', VALID_NODES);
    expect(result.status).toBe('node-not-found');
  });

  it('断开不存在的 Pin 返回 pin-not-found', () => {
    const led = makeLed();
    const result = disconnectPin([led], 'NO_SUCH_PIN');
    expect(result.status).toBe('pin-not-found');
  });

  it('非法操作不改变 components', () => {
    const led = makeLed();
    const original = [led];
    const r1 = connectPinToNode(original, 'BAD', 'N1', VALID_NODES);
    const r2 = connectPinToNode(original, 'D1_A', 'BAD', VALID_NODES);
    expect(r1.components[0].pins[0].nodeId).toBeNull();
    expect(r2.components[0].pins[0].nodeId).toBeNull();
  });
});

describe('S2-1 删除 Component 边界', () => {
  it('删除 Component 后该 Component 及其 Pins 从数组消失', () => {
    const led = makeLed('D1');
    const res = makeResistor('R1');
    const result = removeComponent([led, res], 'D1');
    expect(result.status).toBe('ok');
    expect(result.components).toHaveLength(1);
    expect(result.components[0].id).toBe('R1');
    expect(result.components.flatMap((c) => c.pins)).toHaveLength(2);
  });

  it('删除 Component 不影响其他 Component', () => {
    const led = makeLed('D1');
    const res = makeResistor('R1');
    const result = removeComponent([led, res], 'D1');
    const remaining = result.components.find((c) => c.id === 'R1')!;
    expect(remaining.pins.map((p) => p.name)).toEqual(['1', '2']);
  });

  it('删除已连接的 Component 后，其 Pin-Node 关系自然解除（Pin 随对象消失）', () => {
    const led = makeLed('D1');
    const connected = connectPinToNode([led], 'D1_A', 'N1', VALID_NODES).components;
    const after = removeComponent(connected, 'D1').components;
    expect(after).toHaveLength(0);
    // 外部 validNodeIds 集合不受影响（纯函数不碰 Node）
    expect(VALID_NODES.has('N1')).toBe(true);
  });

  it('删除不存在的 Component 返回 component-not-found，无变化', () => {
    const led = makeLed('D1');
    const result = removeComponent([led], 'NOPE');
    expect(result.status).toBe('component-not-found');
    expect(result.components).toHaveLength(1);
  });

  it('删除 Component 不删除 Node / Wire（它们不在 components 数组中，纯函数只操作 components）', () => {
    const led = makeLed('D1');
    const nodesBefore = new Set(VALID_NODES);
    const wiresExternal = [{ id: 'w1', startNodeId: 'N1', endNodeId: 'N2' }];
    removeComponent([led], 'D1');
    // 外部数据引用不受纯函数影响
    expect(nodesBefore.size).toBe(VALID_NODES.size);
    expect(wiresExternal).toHaveLength(1);
  });
});

describe('S2-1 不可变性', () => {
  it('connectPinToNode 不修改输入 components 数组', () => {
    const led = makeLed('D1');
    const original = [led];
    const originalPinNodeId = led.pins[0].nodeId;
    connectPinToNode(original, 'D1_A', 'N1', VALID_NODES);
    expect(original).toHaveLength(1);
    expect(original[0].pins[0].nodeId).toBe(originalPinNodeId);
    expect(original[0].pins[0].nodeId).toBeNull();
  });

  it('connectPinToNode 不修改输入 Component 对象或 Pin 对象（返回新引用）', () => {
    const led = makeLed('D1');
    const originalPin = led.pins[0];
    const result = connectPinToNode([led], 'D1_A', 'N1', VALID_NODES);
    expect(result.components[0]).not.toBe(led);
    expect(result.components[0].pins[0]).not.toBe(originalPin);
    expect(originalPin.nodeId).toBeNull();
  });

  it('disconnectPin 不修改输入', () => {
    const led = makeLed('D1');
    const connected = connectPinToNode([led], 'D1_A', 'N1', VALID_NODES).components;
    const originalPin = connected[0].pins[0];
    disconnectPin(connected, 'D1_A');
    expect(originalPin.nodeId).toBe('N1');
  });

  it('removeComponent 不修改输入数组', () => {
    const led = makeLed('D1');
    const res = makeResistor('R1');
    const original = [led, res];
    removeComponent(original, 'D1');
    expect(original).toHaveLength(2);
  });

  it('相同输入得到相同输出（确定性）', () => {
    const a = connectPinToNode([makeLed('D1')], 'D1_A', 'N1', VALID_NODES);
    const b = connectPinToNode([makeLed('D1')], 'D1_A', 'N1', VALID_NODES);
    expect(a.status).toBe(b.status);
    expect(a.components[0].pins[0].nodeId).toBe(b.components[0].pins[0].nodeId);
  });
});

describe('S2-1 safeLoadComponents 持久化容错', () => {
  it('非数组输入返回空数组', () => {
    expect(safeLoadComponents(null)).toEqual([]);
    expect(safeLoadComponents('nope')).toEqual([]);
    expect(safeLoadComponents({})).toEqual([]);
  });

  it('合法 components 数据被正确加载，保留 pin.nodeId 连接', () => {
    const raw = [
      {
        id: 'D1',
        type: 'led',
        position: { x: 1, y: 2 },
        rotation: 0,
        config: { kind: 'led' },
        pins: [
          { id: 'D1_A', componentId: 'D1', name: 'A', direction: 'passive', nodeId: 'N1', position: { x: 0, y: 1 } },
          { id: 'D1_K', componentId: 'D1', name: 'K', direction: 'passive', nodeId: null, position: { x: 2, y: 1 } },
        ],
      },
    ];
    const loaded = safeLoadComponents(raw);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('D1');
    expect(loaded[0].pins[0].nodeId).toBe('N1');
    expect(loaded[0].pins[1].nodeId).toBeNull();
  });

  it('结构非法的条目被丢弃，不崩溃', () => {
    const raw = [
      null,
      'string',
      { id: 123, type: 'led' }, // id 非 string
      { id: 'D2', type: 'led' }, // 缺 pins
      {
        id: 'D3',
        type: 'led',
        pins: [{ id: 'x', componentId: 'D3', name: 'A', direction: 'passive', nodeId: 'N1', position: { x: 0, y: 0 } }],
      },
    ];
    const loaded = safeLoadComponents(raw);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('D3');
  });

  it('pin.nodeId 非字符串时重置为 null', () => {
    const raw = [
      {
        id: 'D1',
        type: 'led',
        pins: [
          { id: 'D1_A', componentId: 'D1', name: 'A', direction: 'passive', nodeId: 12345, position: { x: 0, y: 0 } },
        ],
      },
    ];
    const loaded = safeLoadComponents(raw);
    expect(loaded[0].pins[0].nodeId).toBeNull();
  });
});
