import { describe, expect, it } from 'vitest';
import { SimulationEngine } from './SimulationEngine';
import { Circuit, Wire } from './types';
import {
  andCircuit,
  andOrCircuit,
  buttonLedCircuit,
  circuit,
  dev,
  ledValue,
  w,
} from '../tests/helpers';

const engine = new SimulationEngine();

describe('topologicalSort（Kahn 算法）', () => {
  it('简单链路：输入器件在最前，LED 在最后', () => {
    const c = buttonLedCircuit();
    const order = engine.topologicalSort(c);
    expect(order).not.toBeNull();
    expect(order![0].type).toBe('button');
    expect(order![order!.length - 1].type).toBe('led');
  });

  it('多输入器件排序正确', () => {
    const c = andCircuit();
    const order = engine.topologicalSort(c);
    expect(order).not.toBeNull();
    const types = order!.map((d) => d.type);
    expect(types.indexOf('switch')).toBe(0);
    expect(types.indexOf('and')).toBeGreaterThan(types.indexOf('switch'));
    expect(types[types.length - 1]).toBe('led');
  });

  it('三级级联 (A AND B) OR C 排序正确', () => {
    const order = engine.topologicalSort(andOrCircuit());
    expect(order).not.toBeNull();
    const types = order!.map((d) => d.type);
    expect(types[0]).toBe('switch');
    expect(types[types.length - 1]).toBe('led');
    expect(types.indexOf('or')).toBeGreaterThan(types.indexOf('and'));
  });
});

describe('环路检测 hasLoop', () => {
  it('正常 DAG 无环路', () => {
    expect(engine.hasLoop(buttonLedCircuit())).toBe(false);
    expect(engine.hasLoop(andOrCircuit())).toBe(false);
  });

  it('单器件自连（NOT 输出接回输入）→ 环路', () => {
    const c = circuit(
      [dev('not', 'n1', { x: 1, y: 1 })],
      [w('w1', 'n1', 'Y', 'n1', 'A')],
    );
    expect(engine.hasLoop(c)).toBe(true);
    expect(engine.topologicalSort(c)).toBeNull();
  });

  it('多级环路 → 环路', () => {
    const c = circuit(
      [
        dev('not', 'n1', { x: 1, y: 1 }),
        dev('or', 'or1', { x: 3, y: 1 }),
        dev('led', 'led1', { x: 6, y: 1 }),
      ],
      [
        w('w1', 'n1', 'Y', 'or1', 'A'),
        w('w2', 'or1', 'Y', 'n1', 'A'),
        w('w3', 'or1', 'Y', 'led1', 'in'),
      ],
    );
    expect(engine.hasLoop(c)).toBe(true);
  });

  it('空电路无环路', () => {
    expect(engine.hasLoop({ version: '0.1', devices: [], wires: [] })).toBe(false);
  });
});

describe('checkWireLegality', () => {
  it('output → input 合法', () => {
    const c = circuit(
      [dev('button', 'b1', { x: 1, y: 1 }), dev('led', 'led1', { x: 5, y: 1 })],
      [],
    );
    expect(engine.checkWireLegality(w('x', 'b1', 'out', 'led1', 'in'), c)).toBeNull();
  });

  it('output → output 非法', () => {
    const c = circuit(
      [dev('button', 'b1', { x: 1, y: 1 }), dev('and', 'and1', { x: 3, y: 1 })],
      [],
    );
    const err = engine.checkWireLegality(w('x', 'b1', 'out', 'and1', 'Y'), c);
    expect(err?.code).toBe('output_to_output');
    expect(err?.message).toContain('输出端口不能连接输出端口');
  });

  it('input → input 非法（输入端口不能作为信号源）', () => {
    const c = circuit(
      [dev('led', 'led1', { x: 1, y: 1 }), dev('and', 'and1', { x: 3, y: 1 })],
      [],
    );
    const err = engine.checkWireLegality(w('x', 'led1', 'in', 'and1', 'A'), c);
    expect(err?.code).toBe('input_as_source');
    expect(err?.message).toContain('输入端口不能作为信号源');
  });

  it('输入端口重复连接非法', () => {
    const c = andCircuit();
    const err = engine.checkWireLegality(
      { id: 'dup', from: { deviceId: 'swb', portId: 'swb_out' }, to: { deviceId: 'and1', portId: 'and1_A' } },
      c,
    );
    expect(err?.code).toBe('port_already_connected');
  });

  it('器件自连非法', () => {
    const c = circuit([dev('not', 'n1', { x: 1, y: 1 })], []);
    const err = engine.checkWireLegality(w('x', 'n1', 'Y', 'n1', 'A'), c);
    expect(err?.code).toBe('self_connection');
    expect(err?.message).toContain('不能连接同一器件的端口');
  });
});

describe('evaluate（不可变 + 信号传播）', () => {
  it('不修改输入 Circuit（不可变）', () => {
    const c = buttonLedCircuit();
    engine.evaluate(c);
    // 输入电路端口值应保持初始 'X'，未被引擎写入
    const btnOut = c.devices[0].ports[0].value;
    expect(btnOut).toBe('X');
  });

  it('Button → LED：按住输出 1，松开输出 0', () => {
    const c = buttonLedCircuit();
    const pressed = JSON.parse(JSON.stringify(c)) as Circuit;
    (pressed.devices[0].state as Record<string, unknown>).pressed = true;
    expect(ledValue(engine.evaluate(pressed).circuit, 'led1')).toBe(1);

    const released = JSON.parse(JSON.stringify(c)) as Circuit;
    (released.devices[0].state as Record<string, unknown>).pressed = false;
    expect(ledValue(engine.evaluate(released).circuit, 'led1')).toBe(0);
  });

  it('Switch × AND：全 1 出 1，否则 0', () => {
    const c = andCircuit();
    const setOn = (a: boolean, b: boolean) => {
      const trial = JSON.parse(JSON.stringify(c)) as Circuit;
      const swa = trial.devices.find((d) => d.id === 'swa')!;
      const swb = trial.devices.find((d) => d.id === 'swb')!;
      (swa.state as Record<string, unknown>).on = a;
      (swb.state as Record<string, unknown>).on = b;
      return engine.evaluate(trial).circuit;
    };
    expect(ledValue(setOn(false, false), 'led1')).toBe(0);
    expect(ledValue(setOn(false, true), 'led1')).toBe(0);
    expect(ledValue(setOn(true, false), 'led1')).toBe(0);
    expect(ledValue(setOn(true, true), 'led1')).toBe(1);
  });

  it('悬空输入为 X，不默认为 0', () => {
    // AND 的 B 输入悬空：A=1 时输出 X；A=0 时输出 0
    const c = circuit(
      [dev('switch', 'swa', { x: 1, y: 1 }), dev('and', 'and1', { x: 4, y: 1 }), dev('led', 'led1', { x: 8, y: 1 })],
      [
        w('w1', 'swa', 'out', 'and1', 'A'),
        w('w2', 'and1', 'Y', 'led1', 'in'),
      ],
    );
    const trialOn = JSON.parse(JSON.stringify(c)) as Circuit;
    (trialOn.devices[0].state as Record<string, unknown>).on = true;
    const r1 = engine.evaluate(trialOn);
    expect(ledValue(r1.circuit, 'led1')).toBe('X');
    expect(r1.errors.some((e) => e.type === 'floating_input')).toBe(true);

    const trialOff = JSON.parse(JSON.stringify(c)) as Circuit;
    (trialOff.devices[0].state as Record<string, unknown>).on = false;
    expect(ledValue(engine.evaluate(trialOff).circuit, 'led1')).toBe(0);
  });

  it('三级级联 (A AND B) OR C 全组合正确', () => {
    const c = andOrCircuit();
    const setState = (a: boolean, b: boolean, cc: boolean) => {
      const trial = JSON.parse(JSON.stringify(c)) as Circuit;
      const st = (id: string, on: boolean) => {
        trial.devices.find((d) => d.id === id)!.state = { on };
      };
      st('swa', a);
      st('swb', b);
      st('swc', cc);
      return engine.evaluate(trial).circuit;
    };
    expect(ledValue(setState(false, false, false), 'led1')).toBe(0);
    expect(ledValue(setState(false, false, true), 'led1')).toBe(1);
    expect(ledValue(setState(false, true, false), 'led1')).toBe(0);
    expect(ledValue(setState(false, true, true), 'led1')).toBe(1);
    expect(ledValue(setState(true, false, false), 'led1')).toBe(0);
    expect(ledValue(setState(true, false, true), 'led1')).toBe(1);
    expect(ledValue(setState(true, true, false), 'led1')).toBe(1);
    expect(ledValue(setState(true, true, true), 'led1')).toBe(1);
  });

  it('hasLoop 结果：有环时返回 hasLoop=true 且不崩溃', () => {
    const c = circuit(
      [dev('not', 'n1', { x: 1, y: 1 })],
      [w('w1', 'n1', 'Y', 'n1', 'A')],
    );
    const result = engine.evaluate(c);
    expect(result.hasLoop).toBe(true);
    expect(result.errors.some((e) => e.type === 'loop_detected')).toBe(true);
  });

  it('OR 扇出：一个输出驱动多个输入', () => {
    const c = circuit(
      [
        dev('switch', 'swa', { x: 1, y: 2 }),
        dev('not', 'n1', { x: 4, y: 1 }),
        dev('not', 'n2', { x: 4, y: 3 }),
        dev('led', 'led1', { x: 8, y: 1 }),
        dev('led', 'led2', { x: 8, y: 3 }),
      ],
      [
        w('w1', 'swa', 'out', 'n1', 'A'),
        w('w2', 'swa', 'out', 'n2', 'A'),
        w('w3', 'n1', 'Y', 'led1', 'in'),
        w('w4', 'n2', 'Y', 'led2', 'in'),
      ],
    );
    const trial = JSON.parse(JSON.stringify(c)) as Circuit;
    (trial.devices[0].state as Record<string, unknown>).on = true;
    const r = engine.evaluate(trial).circuit;
    expect(ledValue(r, 'led1')).toBe(0);
    expect(ledValue(r, 'led2')).toBe(0);
  });
});

describe('未知引用的 Wire（防御性）', () => {
  it('引用不存在的端口/器件不崩溃', () => {
    const badWire: Wire = {
      id: 'bad',
      from: { deviceId: 'nope', portId: 'nope_out' },
      to: { deviceId: 'led1', portId: 'led1_in' },
    };
    const c = circuit([dev('led', 'led1', { x: 1, y: 1 })], [badWire]);
    const result = engine.evaluate(c);
    expect(result.hasLoop).toBe(false);
    expect(ledValue(result.circuit, 'led1')).toBe('X');
    expect(engine.hasLoop(c)).toBe(false);
  });
});
