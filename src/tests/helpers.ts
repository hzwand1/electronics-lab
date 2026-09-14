/** 测试专用：构建电路的辅助函数 */

import { Circuit, Device, DeviceType, GridPos, Wire } from '../engine/types';
import { createDevice } from '../engine/types';

export function dev(type: DeviceType, id: string, position: GridPos): Device {
  return createDevice(type, position, id);
}

export function w(
  id: string,
  fromDeviceId: string,
  fromPortName: string,
  toDeviceId: string,
  toPortName: string,
): Wire {
  return {
    id,
    from: { deviceId: fromDeviceId, portId: `${fromDeviceId}_${fromPortName}` },
    to: { deviceId: toDeviceId, portId: `${toDeviceId}_${toPortName}` },
  };
}

export function circuit(devices: Device[], wires: Wire[]): Circuit {
  return { version: '0.1', devices, wires };
}

/** Button → LED */
export function buttonLedCircuit(): Circuit {
  return circuit([dev('button', 'b1', { x: 1, y: 1 }), dev('led', 'led1', { x: 5, y: 1 })], [
    w('w1', 'b1', 'out', 'led1', 'in'),
  ]);
}

/** Switch A × Switch B → AND → LED */
export function andCircuit(): Circuit {
  return circuit(
    [
      dev('switch', 'swa', { x: 1, y: 1 }),
      dev('switch', 'swb', { x: 1, y: 4 }),
      dev('and', 'and1', { x: 4, y: 2 }),
      dev('led', 'led1', { x: 8, y: 2 }),
    ],
    [
      w('w1', 'swa', 'out', 'and1', 'A'),
      w('w2', 'swb', 'out', 'and1', 'B'),
      w('w3', 'and1', 'Y', 'led1', 'in'),
    ],
  );
}

/** Switch A × Switch B → OR → LED */
export function orCircuit(): Circuit {
  return circuit(
    [
      dev('switch', 'swa', { x: 1, y: 1 }),
      dev('switch', 'swb', { x: 1, y: 4 }),
      dev('or', 'or1', { x: 4, y: 2 }),
      dev('led', 'led1', { x: 8, y: 2 }),
    ],
    [
      w('w1', 'swa', 'out', 'or1', 'A'),
      w('w2', 'swb', 'out', 'or1', 'B'),
      w('w3', 'or1', 'Y', 'led1', 'in'),
    ],
  );
}

/** Switch A → NOT → LED */
export function notCircuit(): Circuit {
  return circuit(
    [dev('switch', 'swa', { x: 1, y: 2 }), dev('not', 'not1', { x: 4, y: 2 }), dev('led', 'led1', { x: 8, y: 2 })],
    [
      w('w1', 'swa', 'out', 'not1', 'A'),
      w('w2', 'not1', 'Y', 'led1', 'in'),
    ],
  );
}

/** Switch A × Switch B → XOR → LED */
export function xorCircuit(): Circuit {
  return circuit(
    [
      dev('switch', 'swa', { x: 1, y: 1 }),
      dev('switch', 'swb', { x: 1, y: 4 }),
      dev('xor', 'xor1', { x: 4, y: 2 }),
      dev('led', 'led1', { x: 8, y: 2 }),
    ],
    [
      w('w1', 'swa', 'out', 'xor1', 'A'),
      w('w2', 'swb', 'out', 'xor1', 'B'),
      w('w3', 'xor1', 'Y', 'led1', 'in'),
    ],
  );
}

/** (A AND B) OR C → LED（3 输入多级组合） */
export function andOrCircuit(): Circuit {
  return circuit(
    [
      dev('switch', 'swa', { x: 1, y: 1 }),
      dev('switch', 'swb', { x: 1, y: 3 }),
      dev('switch', 'swc', { x: 1, y: 5 }),
      dev('and', 'and1', { x: 4, y: 2 }),
      dev('or', 'or1', { x: 8, y: 3 }),
      dev('led', 'led1', { x: 12, y: 3 }),
    ],
    [
      w('w1', 'swa', 'out', 'and1', 'A'),
      w('w2', 'swb', 'out', 'and1', 'B'),
      w('w3', 'and1', 'Y', 'or1', 'A'),
      w('w4', 'swc', 'out', 'or1', 'B'),
      w('w5', 'or1', 'Y', 'led1', 'in'),
    ],
  );
}

/** 取电路中某器件的输入端口值（LED 视觉依据） */
export function ledValue(c: Circuit, ledId: string): number | 'X' | undefined {
  const led = c.devices.find((d) => d.id === ledId);
  return led?.ports.find((p) => p.direction === 'in')?.value;
}
