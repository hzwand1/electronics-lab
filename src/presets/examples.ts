/**
 * Electronics Lab V0.1 — 预设示例电路
 *
 * 所有 position 均为逻辑网格坐标（1 格 = 20px）。
 * 器件 ID 使用可读 ID，端口 ID 遵循 "{deviceId}_{portName}" 约定。
 */

import { Circuit } from '../engine/types';
import { createDevice } from '../engine/types';

export interface PresetExample {
  id: string;
  name: string;
  description: string;
  circuit: Circuit;
}

/** 示例 1：Button → LED（最基础的完整闭环） */
function buildButtonLed(): Circuit {
  const button = createDevice('button', { x: 5, y: 10 }, 'button_1');
  const led = createDevice('led', { x: 12, y: 10 }, 'led_1');
  return {
    version: '0.1',
    devices: [button, led],
    wires: [
      { id: 'w1', from: { deviceId: 'button_1', portId: 'button_1_out' }, to: { deviceId: 'led_1', portId: 'led_1_in' } },
    ],
  };
}

/** 示例 2：Switch A + Switch B → AND → LED */
function buildAndLed(): Circuit {
  const swA = createDevice('switch', { x: 3, y: 6 }, 'switch_a');
  const swB = createDevice('switch', { x: 3, y: 14 }, 'switch_b');
  const and = createDevice('and', { x: 10, y: 10 }, 'and_1');
  const led = createDevice('led', { x: 18, y: 10 }, 'led_1');
  return {
    version: '0.1',
    devices: [swA, swB, and, led],
    wires: [
      { id: 'w1', from: { deviceId: 'switch_a', portId: 'switch_a_out' }, to: { deviceId: 'and_1', portId: 'and_1_A' } },
      { id: 'w2', from: { deviceId: 'switch_b', portId: 'switch_b_out' }, to: { deviceId: 'and_1', portId: 'and_1_B' } },
      { id: 'w3', from: { deviceId: 'and_1', portId: 'and_1_Y' }, to: { deviceId: 'led_1', portId: 'led_1_in' } },
    ],
  };
}

/** 示例 3：(A AND B) OR C → LED（多级组合逻辑级联） */
function buildAndOrLed(): Circuit {
  const swA = createDevice('switch', { x: 2, y: 4 }, 'switch_a');
  const swB = createDevice('switch', { x: 2, y: 10 }, 'switch_b');
  const swC = createDevice('switch', { x: 2, y: 16 }, 'switch_c');
  const and = createDevice('and', { x: 9, y: 7 }, 'and_1');
  const or = createDevice('or', { x: 16, y: 10 }, 'or_1');
  const led = createDevice('led', { x: 23, y: 10 }, 'led_1');
  return {
    version: '0.1',
    devices: [swA, swB, swC, and, or, led],
    wires: [
      { id: 'w1', from: { deviceId: 'switch_a', portId: 'switch_a_out' }, to: { deviceId: 'and_1', portId: 'and_1_A' } },
      { id: 'w2', from: { deviceId: 'switch_b', portId: 'switch_b_out' }, to: { deviceId: 'and_1', portId: 'and_1_B' } },
      { id: 'w3', from: { deviceId: 'and_1', portId: 'and_1_Y' }, to: { deviceId: 'or_1', portId: 'or_1_A' } },
      { id: 'w4', from: { deviceId: 'switch_c', portId: 'switch_c_out' }, to: { deviceId: 'or_1', portId: 'or_1_B' } },
      { id: 'w5', from: { deviceId: 'or_1', portId: 'or_1_Y' }, to: { deviceId: 'led_1', portId: 'led_1_in' } },
    ],
  };
}

export const PRESET_EXAMPLES: PresetExample[] = [
  {
    id: 'button-led',
    name: 'Button → LED',
    description: '按住按钮点亮 LED，体验信号传播的最简闭环',
    circuit: buildButtonLed(),
  },
  {
    id: 'switch-and-led',
    name: 'Switch × AND → LED',
    description: '两个开关经 AND 门控制 LED，验证与逻辑',
    circuit: buildAndLed(),
  },
  {
    id: 'and-or-led',
    name: '(A AND B) OR C → LED',
    description: '多级组合逻辑级联：AND 输出接入 OR，观察三级信号传播',
    circuit: buildAndOrLed(),
  },
];
