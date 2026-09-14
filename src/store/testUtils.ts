/** 测试专用：Store 重置与固定电路 */

import { Circuit } from '../engine/types';
import { createDevice } from '../engine/types';
import { useCircuitStore } from './circuitStore';
import { useUIStore } from './uiStore';

/** 固定 ID 的 Button → LED 电路（用于 loadCircuit / removeDevice 等测试） */
export function emptyCircuitForTest(buttonId: string, ledId: string): Circuit {
  const b = createDevice('button', { x: 1, y: 1 }, buttonId);
  const l = createDevice('led', { x: 5, y: 1 }, ledId);
  return {
    version: '0.1',
    devices: [b, l],
    wires: [
      {
        id: 'test_w1',
        from: { deviceId: buttonId, portId: `${buttonId}_out` },
        to: { deviceId: ledId, portId: `${ledId}_in` },
      },
    ],
  };
}

/** 将两个 Store 重置到初始状态（测试隔离） */
export function resetStore(): void {
  useCircuitStore.setState({
    circuit: { version: '0.1', devices: [], wires: [] },
    past: [],
    future: [],
  });
  useUIStore.setState({ toasts: [] });
}
