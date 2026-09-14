/**
 * Electronics Lab V0.1 — Truth Table 生成
 *
 * 设计原则：真值表不重新实现任何逻辑门计算，全部调用 SimulationEngine.evaluate()，
 * 保证实时模拟和真值表的结果完全一致。
 */

import { Circuit, Device, Signal } from './types';
import { SimulationEngine } from './SimulationEngine';

export interface TruthTableColumn {
  deviceId: string;
  /** 列标题，如 "Switch 1" / "Button 2" / "LED 1" */
  label: string;
}

export interface TruthTableRow {
  /** 输入列的值（仅 0 / 1） */
  inputs: Signal[];
  /** 输出列的值（0 / 1 / 'X'） */
  outputs: Signal[];
}

export interface TruthTableResult {
  ok: boolean;
  /** 不生成时的提示信息 */
  message?: string;
  inputs: TruthTableColumn[];
  outputs: TruthTableColumn[];
  rows: TruthTableRow[];
  /** 是否存在输出为 'X' 的行 */
  hasUndefined: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  button: 'Button',
  switch: 'Switch',
  led: 'LED',
};

function labelOf(device: Device, index: number): string {
  const base = TYPE_LABEL[device.type] ?? device.type;
  return `${base} ${index + 1}`;
}

/**
 * 生成当前电路的真值表。
 * Button 仅作为二值输入变量（pressed = true/false），不模拟真实按压过程。
 */
export function generateTruthTable(
  circuit: Circuit,
  engine: SimulationEngine,
): TruthTableResult {
  const inputs = circuit.devices
    .filter((d) => d.type === 'button' || d.type === 'switch')
    .sort((a, b) => a.id.localeCompare(b.id));
  const outputs = circuit.devices
    .filter((d) => d.type === 'led')
    .sort((a, b) => a.id.localeCompare(b.id));

  if (inputs.length === 0) {
    return { ok: false, message: '请添加 Button 或 Switch 作为输入', inputs: [], outputs: [], rows: [], hasUndefined: false };
  }
  if (outputs.length === 0) {
    return { ok: false, message: '请添加 LED 作为输出', inputs: [], outputs: [], rows: [], hasUndefined: false };
  }
  if (inputs.length > 8) {
    return {
      ok: false,
      message: '当前电路输入数量过多（>8），无法生成完整真值表',
      inputs: [],
      outputs: [],
      rows: [],
      hasUndefined: false,
    };
  }

  const n = inputs.length;
  const total = 2 ** n;
  const rows: TruthTableRow[] = [];
  let hasUndefined = false;

  for (let combo = 0; combo < total; combo += 1) {
    const trial: Circuit = JSON.parse(JSON.stringify(circuit)) as Circuit;
    for (let i = 0; i < n; i += 1) {
      const bit = (combo >> (n - 1 - i)) & 1;
      const device = trial.devices.find((d) => d.id === inputs[i].id);
      if (!device) continue;
      if (device.type === 'button') {
        device.state.pressed = bit === 1;
      } else if (device.type === 'switch') {
        device.state.on = bit === 1;
      }
    }
    const result = engine.evaluate(trial);
    const outputValues: Signal[] = outputs.map((o) => {
      const led = result.circuit.devices.find((d) => d.id === o.id);
      const port = led?.ports.find((p) => p.direction === 'in');
      return port ? port.value : 'X';
    });
    if (outputValues.some((v) => v === 'X')) hasUndefined = true;
    const inputValues: Signal[] = inputs.map((_, i) => ((combo >> (n - 1 - i)) & 1) as Signal);
    rows.push({ inputs: inputValues, outputs: outputValues });
  }

  return {
    ok: true,
    inputs: inputs.map((d, i) => ({ deviceId: d.id, label: labelOf(d, i) })),
    outputs: outputs.map((d, i) => ({ deviceId: d.id, label: labelOf(d, i) })),
    rows,
    hasUndefined,
  };
}
