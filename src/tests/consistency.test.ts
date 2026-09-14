/**
 * 一致性保证（P0，最重要）：
 * 同一个 Circuit，实时 Simulation 和 Truth Table 的逻辑结果必须完全一致。
 *
 * 对一组标准测试电路：
 *  1. 调用 generateTruthTable(circuit) 得到所有输入组合下的输出
 *  2. 对每一行组合，设置输入器件状态后调用 engine.evaluate(circuit)
 *  3. 断言实时 evaluate 的 LED 输出 === 真值表对应行的输出
 */

import { describe, expect, it } from 'vitest';
import { Circuit, Device } from '../engine/types';
import { generateTruthTable } from '../engine/truthTable';
import { SimulationEngine } from '../engine/SimulationEngine';
import {
  andCircuit,
  andOrCircuit,
  buttonLedCircuit,
  notCircuit,
  orCircuit,
  xorCircuit,
} from './helpers';

const engine = new SimulationEngine();

function evaluateWithRow(circuit: Circuit, inputs: (0 | 1)[]): Circuit {
  const trial: Circuit = JSON.parse(JSON.stringify(circuit)) as Circuit;
  const inputDevices = trial.devices
    .filter((d) => d.type === 'button' || d.type === 'switch')
    .sort((a, b) => a.id.localeCompare(b.id));
  inputDevices.forEach((d: Device, i: number) => {
    const bit = inputs[i] === 1;
    if (d.type === 'button') d.state = { pressed: bit };
    else if (d.type === 'switch') d.state = { on: bit };
  });
  return engine.evaluate(trial).circuit;
}

function ledValuesOf(c: Circuit): (0 | 1 | 'X')[] {
  return c.devices
    .filter((d) => d.type === 'led')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => d.ports.find((p) => p.direction === 'in')?.value ?? 'X');
}

const CIRCUITS = [
  ['Button → LED', buttonLedCircuit()],
  ['Switch × AND → LED', andCircuit()],
  ['Switch × OR → LED', orCircuit()],
  ['Switch → NOT → LED', notCircuit()],
  ['Switch × XOR → LED', xorCircuit()],
  ['(A AND B) OR C → LED', andOrCircuit()],
] as const;

describe('实时 Simulation 与 Truth Table 一致性（P0）', () => {
  for (const [name, circuit] of CIRCUITS) {
    it(name, () => {
      const table = generateTruthTable(circuit, engine);
      expect(table.ok).toBe(true);
      for (let r = 0; r < table.rows.length; r += 1) {
        const row = table.rows[r];
        const live = ledValuesOf(evaluateWithRow(circuit, row.inputs as (0 | 1)[]));
        expect(live, `${name} 第 ${r + 1} 行`).toEqual(row.outputs);
      }
    });
  }
});
