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

describe('JSON 导入严格校验（拒绝非法结构）', () => {
  // 取一份合法的 Button → LED 电路的「纯 JSON 对象」作为篡改基底
  const validObject = (): unknown =>
    JSON.parse(serializeCircuit(buttonLedCircuit()));
  const andObject = (): any =>
    JSON.parse(serializeCircuit(andCircuit()));
  const clone = (o: unknown): any => JSON.parse(JSON.stringify(o));

  it('合法电路通过校验', () => {
    expect(validateAndNormalizeCircuit(validObject()).ok).toBe(true);
    expect(validateAndNormalizeCircuit(andObject()).ok).toBe(true);
  });

  it('拒绝未知 DeviceType', () => {
    const o = clone(validObject());
    o.devices[0].type = 'nand';
    expect(validateAndNormalizeCircuit(o).ok).toBe(false);
  });

  it('拒绝非 "0.1" 的 version', () => {
    const o = clone(validObject());
    o.version = '0.2';
    expect(validateAndNormalizeCircuit(o).ok).toBe(false);
  });

  it('拒绝非法 port direction', () => {
    const o = clone(validObject());
    o.devices[0].ports[0].direction = 'sideways';
    expect(validateAndNormalizeCircuit(o).ok).toBe(false);
  });

  it('拒绝与器件类型不符的端口集合', () => {
    const o = clone(validObject());
    o.devices[0].ports.pop(); // Button 缺少 out 端口
    expect(validateAndNormalizeCircuit(o).ok).toBe(false);
  });

  it('拒绝 port.deviceId 与所属器件不一致', () => {
    const o = clone(validObject());
    o.devices[0].ports[0].deviceId = 'someone-else';
    expect(validateAndNormalizeCircuit(o).ok).toBe(false);
  });

  it('拒绝非法 position（非数值 / NaN / 缺失）', () => {
    const o1 = clone(validObject());
    o1.devices[0].position.x = 'abc';
    expect(validateAndNormalizeCircuit(o1).ok).toBe(false);

    const o2 = clone(validObject());
    o2.devices[0].position = { x: 1 };
    expect(validateAndNormalizeCircuit(o2).ok).toBe(false);

    const o3 = clone(validObject());
    o3.devices[0].position.y = NaN;
    expect(validateAndNormalizeCircuit(o3).ok).toBe(false);
  });

  it('合法时 position 取整为网格整数', () => {
    const o = clone(validObject());
    o.devices[0].position = { x: 3.6, y: 7.2 };
    const r = validateAndNormalizeCircuit(o);
    expect(r.ok).toBe(true);
    expect(r.circuit!.devices[0].position).toEqual({ x: 4, y: 7 });
  });

  it('拒绝引用不存在的器件 / 端口', () => {
    const o1 = clone(validObject());
    o1.wires[0].to.deviceId = 'ghost';
    expect(validateAndNormalizeCircuit(o1).ok).toBe(false);

    const o2 = clone(validObject());
    o2.wires[0].to.portId = 'led1_ghost';
    expect(validateAndNormalizeCircuit(o2).ok).toBe(false);
  });

  it('拒绝端口方向接反（输入作源 / 输出作目标）', () => {
    const inAsSource = clone(validObject());
    inAsSource.wires[0].from = { deviceId: 'led1', portId: 'led1_in' };
    expect(validateAndNormalizeCircuit(inAsSource).ok).toBe(false);

    const outAsTarget = clone(validObject());
    outAsTarget.wires[0].to = { deviceId: 'b1', portId: 'b1_out' };
    expect(validateAndNormalizeCircuit(outAsTarget).ok).toBe(false);
  });

  it('拒绝同一输入端口被多条连线驱动', () => {
    const o = clone(validObject());
    o.wires.push({ id: 'w2', from: { deviceId: 'b1', portId: 'b1_out' }, to: { deviceId: 'led1', portId: 'led1_in' } });
    expect(validateAndNormalizeCircuit(o).ok).toBe(false);
  });

  it('拒绝器件自连', () => {
    const o = andObject();
    o.wires[0] = { id: 'self', from: { deviceId: 'and1', portId: 'and1_Y' }, to: { deviceId: 'and1', portId: 'and1_A' } };
    expect(validateAndNormalizeCircuit(o).ok).toBe(false);
  });

  it('拒绝重复的 device / wire / port id', () => {
    const dupDevice = clone(validObject());
    dupDevice.devices[1].id = 'b1';
    expect(validateAndNormalizeCircuit(dupDevice).ok).toBe(false);

    const dupWire = clone(validObject());
    dupWire.wires.push(JSON.parse(JSON.stringify(dupWire.wires[0])));
    expect(validateAndNormalizeCircuit(dupWire).ok).toBe(false);
  });
});
