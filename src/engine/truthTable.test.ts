import { describe, expect, it } from 'vitest';
import { generateTruthTable } from './truthTable';
import { SimulationEngine } from './SimulationEngine';
import {
  andCircuit,
  andOrCircuit,
  buttonLedCircuit,
  circuit,
  dev,
  w,
} from '../tests/helpers';
import { createDevice } from './types';

const engine = new SimulationEngine();

describe('真值表生成', () => {
  it('2 输入 AND 生成 4 行，输出正确', () => {
    const table = generateTruthTable(andCircuit(), engine);
    expect(table.ok).toBe(true);
    expect(table.inputs.map((c) => c.label)).toEqual(['Switch 1', 'Switch 2']);
    expect(table.outputs.map((c) => c.label)).toEqual(['LED 1']);
    expect(table.rows).toHaveLength(4);
    const ys = table.rows.map((r) => r.outputs[0]);
    expect(ys).toEqual([0, 0, 0, 1]);
  });

  it('3 输入 (A AND B) OR C 生成 8 行，输出正确', () => {
    const table = generateTruthTable(andOrCircuit(), engine);
    expect(table.ok).toBe(true);
    expect(table.rows).toHaveLength(8);
    const ys = table.rows.map((r) => r.outputs[0]);
    // 组合 (a,b,c)：000 001 010 011 100 101 110 111 → (a&b)|c
    expect(ys).toEqual([0, 1, 0, 1, 0, 1, 1, 1]);
  });

  it('悬空输入时输出显示 X（表格标记）', () => {
    const c = circuit(
      [
        dev('switch', 'swa', { x: 1, y: 1 }),
        dev('and', 'and1', { x: 4, y: 1 }),
        dev('led', 'led1', { x: 8, y: 1 }),
      ],
      [
        w('w1', 'swa', 'out', 'and1', 'A'),
        w('w2', 'and1', 'Y', 'led1', 'in'),
      ],
    );
    const table = generateTruthTable(c, engine);
    expect(table.ok).toBe(true);
    // swa=0 → AND(0, X) = 0；swa=1 → AND(1, X) = X
    expect(table.rows[0].outputs[0]).toBe(0);
    expect(table.rows[1].outputs[0]).toBe('X');
    expect(table.hasUndefined).toBe(true);
  });

  it('无输入器件 → 提示添加输入', () => {
    const c = circuit([createDevice('led', { x: 1, y: 1 })], []);
    const table = generateTruthTable(c, engine);
    expect(table.ok).toBe(false);
    expect(table.message).toContain('Button');
  });

  it('无输出器件 → 提示添加 LED', () => {
    const c = circuit([createDevice('switch', { x: 1, y: 1 })], []);
    const table = generateTruthTable(c, engine);
    expect(table.ok).toBe(false);
    expect(table.message).toContain('LED');
  });

  it('输入 > 8 → 拒绝生成', () => {
    const devices = Array.from({ length: 9 }, (_, i) =>
      createDevice('switch', { x: i, y: 1 }, `sw_${i}`),
    );
    devices.push(createDevice('led', { x: 12, y: 1 }, 'led1'));
    const c = circuit(devices, []);
    const table = generateTruthTable(c, engine);
    expect(table.ok).toBe(false);
    expect(table.message).toContain('过多');
  });

  it('Button 与 Switch 均作为二值输入变量', () => {
    const c = circuit(
      [createDevice('button', { x: 1, y: 1 }, 'btn1'), createDevice('led', { x: 5, y: 1 }, 'led1')],
      [w('w1', 'btn1', 'out', 'led1', 'in')],
    );
    const table = generateTruthTable(c, engine);
    expect(table.ok).toBe(true);
    expect(table.inputs.map((c) => c.label)).toEqual(['Button 1']);
    expect(table.rows.map((r) => r.outputs[0])).toEqual([0, 1]);
  });

  it('与实时模拟一致：按钮电路真值表首行对应松开状态', () => {
    const c = buttonLedCircuit();
    const table = generateTruthTable(c, engine);
    const liveReleased = JSON.parse(JSON.stringify(c)) as typeof c;
    (liveReleased.devices[0].state as Record<string, unknown>).pressed = false;
    const liveVal = engine
      .evaluate(liveReleased)
      .circuit.devices.find((d) => d.id === 'led1')!
      .ports.find((p) => p.direction === 'in')!.value;
    expect(table.rows[0].outputs[0]).toBe(liveVal);
  });
});
