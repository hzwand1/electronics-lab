import { describe, expect, it } from 'vitest';
import {
  resetPortValues,
  serializeCircuit,
  stripPortValues,
  validateAndNormalizeCircuit,
  migrate,
} from './serialize';
import { SimulationEngine } from '../engine/SimulationEngine';
import { buttonLedCircuit, andCircuit } from '../tests/helpers';

const engine = new SimulationEngine();

describe('序列化 / 反序列化', () => {
  it('Circuit → JSON → Circuit 数据一致（不含 value）', () => {
    const c = engine.evaluate(andCircuit()).circuit;
    const json = serializeCircuit(c);
    const parsed: unknown = JSON.parse(json);
    const validation = validateAndNormalizeCircuit(parsed);
    expect(validation.ok).toBe(true);
    const restored = validation.circuit!;
    expect(restored.version).toBe('0.1');
    expect(restored.devices.map((d) => d.id)).toEqual(c.devices.map((d) => d.id));
    expect(restored.wires.map((wd) => wd.id)).toEqual(c.wires.map((wd) => wd.id));
    expect(restored.devices[0].position).toEqual(c.devices[0].position);
  });

  it('导出 JSON 不含 ports[].value', () => {
    const c = engine.evaluate(buttonLedCircuit()).circuit;
    const json = serializeCircuit(c);
    expect(json).not.toContain('"value"');
    expect(JSON.parse(json).devices[0].ports[0].value).toBeUndefined();
  });

  it('stripPortValues 不影响原电路', () => {
    const c = engine.evaluate(buttonLedCircuit()).circuit;
    const stripped = stripPortValues(c);
    expect(stripped.devices[0].ports[0].value).toBeUndefined();
    expect(c.devices[0].ports[0].value).toBe(0); // 原电路不受影响
  });

  it('导入后 value 重置为 X 并由 Engine 重算', () => {
    const c = engine.evaluate(buttonLedCircuit()).circuit;
    const json = serializeCircuit(c);
    const validation = validateAndNormalizeCircuit(JSON.parse(json));
    const imported = validation.circuit!;
    expect(imported.devices[0].ports[0].value).toBe('X');
    const result = engine.evaluate(imported);
    // 默认 pressed=false → LED 熄灭
    expect(result.circuit.devices[1].ports[0].value).toBe(0);
  });

  it('resetPortValues 将所有端口重置为 X', () => {
    const c = engine.evaluate(buttonLedCircuit()).circuit;
    resetPortValues(c);
    for (const d of c.devices) {
      for (const p of d.ports) expect(p.value).toBe('X');
    }
  });

  it('导入无效 JSON 返回错误，不破坏结构', () => {
    expect(validateAndNormalizeCircuit(null).ok).toBe(false);
    expect(validateAndNormalizeCircuit(undefined).ok).toBe(false);
    expect(validateAndNormalizeCircuit({ version: '0.1' }).ok).toBe(false);
    expect(
      validateAndNormalizeCircuit({ version: 0.1, devices: [], wires: [] }).ok,
    ).toBe(false);
    expect(
      validateAndNormalizeCircuit({ version: '0.1', devices: [], wires: 'x' }).ok,
    ).toBe(false);
  });

  it('version 字段校验', () => {
    const ok = validateAndNormalizeCircuit({ version: '0.1', devices: [], wires: [] });
    expect(ok.ok).toBe(true);
  });

  it('migrate 预留入口：V0.1 原样返回', () => {
    const c = buttonLedCircuit();
    expect(migrate(c, '0.1', '0.2')).toBe(c);
  });
});
