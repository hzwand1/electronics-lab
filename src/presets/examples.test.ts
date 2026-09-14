import { describe, expect, it } from 'vitest';
import { PRESET_EXAMPLES } from './examples';
import { SimulationEngine } from '../engine/SimulationEngine';
import { Circuit } from '../engine/types';

const engine = new SimulationEngine();

function cloneCircuit(c: Circuit): Circuit {
  return JSON.parse(JSON.stringify(c)) as Circuit;
}

function findIn(c: Circuit, id: string) {
  return c.devices.find((d) => d.id === id)!;
}

function setSwitch(c: Circuit, id: string, on: boolean) {
  findIn(c, id).state = { on };
}

describe('预设示例电路', () => {
  it('共 3 个示例，含名称与描述', () => {
    expect(PRESET_EXAMPLES).toHaveLength(3);
    for (const ex of PRESET_EXAMPLES) {
      expect(ex.name.length).toBeGreaterThan(0);
      expect(ex.description.length).toBeGreaterThan(0);
      expect(ex.circuit.version).toBe('0.1');
    }
  });

  it('所有示例均为合法 DAG（无环路）', () => {
    for (const ex of PRESET_EXAMPLES) {
      expect(engine.hasLoop(ex.circuit), ex.id).toBe(false);
    }
  });

  it('所有 Wire 引用合法端口（from 输出 / to 输入）且输入不重复', () => {
    for (const ex of PRESET_EXAMPLES) {
      const c = ex.circuit;
      for (const wd of c.wires) {
        const fromDev = findIn(c, wd.from.deviceId);
        const toDev = findIn(c, wd.to.deviceId);
        const fromPort = fromDev.ports.find((p) => p.id === wd.from.portId);
        const toPort = toDev.ports.find((p) => p.id === wd.to.portId);
        expect(fromPort?.direction, `${ex.id} ${wd.id} from`).toBe('out');
        expect(toPort?.direction, `${ex.id} ${wd.id} to`).toBe('in');
        expect(fromDev.id).not.toBe(toDev.id);
      }
      const targets = c.wires.map((wd) => wd.to.portId);
      expect(new Set(targets).size).toBe(targets.length);
    }
  });

  it('示例 1：Button → LED，按下点亮', () => {
    const c = PRESET_EXAMPLES[0].circuit;
    const trial = cloneCircuit(c);
    findIn(trial, 'button_1').state = { pressed: true };
    const led = engine
      .evaluate(trial)
      .circuit.devices.find((d) => d.id === 'led_1')!;
    expect(led.ports.find((p) => p.direction === 'in')!.value).toBe(1);
  });

  it('示例 2：Switch × AND → LED，全开才亮', () => {
    const c = PRESET_EXAMPLES[1].circuit;
    const on = (a: boolean, b: boolean) => {
      const trial = cloneCircuit(c);
      setSwitch(trial, 'switch_a', a);
      setSwitch(trial, 'switch_b', b);
      return engine
        .evaluate(trial)
        .circuit.devices.find((d) => d.id === 'led_1')!
        .ports.find((p) => p.direction === 'in')!.value;
    };
    expect(on(false, false)).toBe(0);
    expect(on(true, false)).toBe(0);
    expect(on(false, true)).toBe(0);
    expect(on(true, true)).toBe(1);
  });

  it('示例 3：(A AND B) OR C → LED', () => {
    const c = PRESET_EXAMPLES[2].circuit;
    const value = (a: boolean, b: boolean, cc: boolean) => {
      const trial = cloneCircuit(c);
      setSwitch(trial, 'switch_a', a);
      setSwitch(trial, 'switch_b', b);
      setSwitch(trial, 'switch_c', cc);
      return engine
        .evaluate(trial)
        .circuit.devices.find((d) => d.id === 'led_1')!
        .ports.find((p) => p.direction === 'in')!.value;
    };
    expect(value(false, false, false)).toBe(0);
    expect(value(false, false, true)).toBe(1);
    expect(value(true, false, false)).toBe(0);
    expect(value(true, true, false)).toBe(1);
    expect(value(true, true, true)).toBe(1);
  });
});
