/**
 * Hardware Lab Stage 2 S2-0 — Component / Pin Factory 纯 TS 单元测试。
 *
 * 仅覆盖数据模型与 factory：结构、ID、Pin 命名/方向、默认配置、不可变性。
 * 不覆盖 Pin→Node 连接（S2-1）、电气计算（后续 Slice）、UI（S2-2+）。
 */
import { describe, it, expect } from 'vitest';
import {
  COMPONENT_TYPES,
  DEFAULT_RESISTOR_VALUE,
  RESISTOR_VALUES,
  createComponent,
  createPin,
  defaultConfigFor,
} from './componentFactory';
import type {
  Component,
  ComponentConfig,
  ComponentType,
} from '../types/componentTypes';

describe('S2-0 Component 类型与常量', () => {
  it('COMPONENT_TYPES 包含 Stage 2 第一批全部 7 种元件', () => {
    expect(COMPONENT_TYPES).toEqual([
      'resistor',
      'led',
      'button',
      'switch',
      'buzzer',
      'power',
      'ground',
    ]);
  });

  it('RESISTOR_VALUES 包含 5 个固定档位且默认 1k', () => {
    expect(RESISTOR_VALUES).toEqual(['220', '330', '1k', '10k', '100k']);
    expect(DEFAULT_RESISTOR_VALUE).toBe('1k');
  });
});

describe('S2-0 createComponent — 基础结构', () => {
  it.each(COMPONENT_TYPES.map((t) => [t]))(
    'createComponent(%s) 返回正确的 type',
    (type) => {
      const c = createComponent(type as ComponentType, { x: 10, y: 20 });
      expect(c.type).toBe(type);
    },
  );

  it('自动生成的 Component ID 唯一', () => {
    const a = createComponent('resistor', { x: 0, y: 0 });
    const b = createComponent('resistor', { x: 0, y: 0 });
    expect(a.id).not.toBe(b.id);
    expect(a.id.startsWith('CMP-')).toBe(true);
  });

  it('传入自定义 id 时使用该 id', () => {
    const c = createComponent('led', { x: 1, y: 1 }, { id: 'LED-1' });
    expect(c.id).toBe('LED-1');
  });

  it('position 正确传递（逻辑网格坐标）', () => {
    const c = createComponent('resistor', { x: 7, y: 11 });
    expect(c.position).toEqual({ x: 7, y: 11 });
  });

  it('rotation 默认为 0', () => {
    const c = createComponent('resistor', { x: 0, y: 0 });
    expect(c.rotation).toBe(0);
  });

  it('传入 rotation 时生效', () => {
    const c = createComponent('resistor', { x: 0, y: 0 }, { rotation: 90 });
    expect(c.rotation).toBe(90);
  });

  it('createComponent 不修改输入 position 对象（不可变）', () => {
    const pos = { x: 5, y: 6 };
    const c = createComponent('resistor', pos);
    c.position.x = 999;
    c.position.y = 999;
    expect(pos).toEqual({ x: 5, y: 6 });
  });
});

describe('S2-0 ComponentPin — 结构与命名', () => {
  it('Pin ID 格式为 {componentId}_{pinName} 且唯一', () => {
    const c = createComponent('resistor', { x: 0, y: 0 }, { id: 'R1' });
    expect(c.pins[0].id).toBe('R1_1');
    expect(c.pins[1].id).toBe('R1_2');
    expect(c.pins[0].id).not.toBe(c.pins[1].id);
  });

  it('Pin componentId 与所属 Component 一致', () => {
    const c = createComponent('led', { x: 0, y: 0 }, { id: 'D1' });
    for (const p of c.pins) {
      expect(p.componentId).toBe('D1');
    }
  });

  it('新建 Pin 的 nodeId 恒为 null（未连接）', () => {
    const c = createComponent('buzzer', { x: 0, y: 0 });
    for (const p of c.pins) {
      expect(p.nodeId).toBeNull();
    }
  });

  it('Pin position 为逻辑网格坐标对象', () => {
    const p = createPin('R1', '1', 'passive', { x: 0, y: 1 });
    expect(p.position).toEqual({ x: 0, y: 1 });
    expect(typeof p.position.x).toBe('number');
    expect(typeof p.position.y).toBe('number');
  });

  it('createPin 不共享输入 position 引用', () => {
    const local = { x: 2, y: 3 };
    const p = createPin('R1', '1', 'passive', local);
    p.position.x = 99;
    expect(local).toEqual({ x: 2, y: 3 });
  });
});

describe('S2-0 各元件 Pin 命名与方向', () => {
  it('Resistor 有两个被动引脚 1 / 2', () => {
    const c = createComponent('resistor', { x: 0, y: 0 });
    expect(c.pins.map((p) => p.name)).toEqual(['1', '2']);
    expect(c.pins.every((p) => p.direction === 'passive')).toBe(true);
  });

  it('LED 有极性引脚 A(阳极) / K(阴极)', () => {
    const c = createComponent('led', { x: 0, y: 0 });
    expect(c.pins.map((p) => p.name)).toEqual(['A', 'K']);
    expect(c.pins.every((p) => p.direction === 'passive')).toBe(true);
  });

  it('Button 有两个引脚 1 / 2', () => {
    const c = createComponent('button', { x: 0, y: 0 });
    expect(c.pins.map((p) => p.name)).toEqual(['1', '2']);
  });

  it('Switch 有两个引脚 1 / 2', () => {
    const c = createComponent('switch', { x: 0, y: 0 });
    expect(c.pins.map((p) => p.name)).toEqual(['1', '2']);
  });

  it('Buzzer 有电源引脚 + / -', () => {
    const c = createComponent('buzzer', { x: 0, y: 0 });
    expect(c.pins.map((p) => p.name)).toEqual(['+', '-']);
    expect(c.pins.every((p) => p.direction === 'power')).toBe(true);
  });

  it('3.3V Power 有单个 OUT 输出引脚', () => {
    const c = createComponent('power', { x: 0, y: 0 });
    expect(c.pins.map((p) => p.name)).toEqual(['OUT']);
    expect(c.pins[0].direction).toBe('out');
  });

  it('GND 有单个 OUT 输出引脚', () => {
    const c = createComponent('ground', { x: 0, y: 0 });
    expect(c.pins.map((p) => p.name)).toEqual(['OUT']);
    expect(c.pins[0].direction).toBe('out');
  });
});

describe('S2-0 ComponentConfig — discriminated union', () => {
  it('Resistor 默认配置为 1kΩ', () => {
    const c = createComponent('resistor', { x: 0, y: 0 });
    expect(c.config.kind).toBe('resistor');
    if (c.config.kind === 'resistor') {
      expect(c.config.resistance).toBe('1k');
    }
  });

  it('defaultConfigFor(resistor) 返回 1k', () => {
    const cfg = defaultConfigFor('resistor');
    expect(cfg).toEqual({ kind: 'resistor', resistance: '1k' });
  });

  it.each(['led', 'button', 'switch', 'buzzer', 'power', 'ground'] as const)(
    'defaultConfigFor(%s) 返回对应 kind 的空配置',
    (type) => {
      const cfg = defaultConfigFor(type) as ComponentConfig;
      expect(cfg.kind).toBe(type);
    },
  );

  it('传入自定义 config 时生效（如电阻 220Ω）', () => {
    const c = createComponent('resistor', { x: 0, y: 0 }, {
      config: { kind: 'resistor', resistance: '220' },
    });
    expect(c.config).toEqual({ kind: 'resistor', resistance: '220' });
  });

  it('每种元件的 config.kind 与 type 对应', () => {
    for (const type of COMPONENT_TYPES) {
      const c: Component = createComponent(type, { x: 0, y: 0 });
      expect(c.config.kind).toBe(type);
    }
  });
});
