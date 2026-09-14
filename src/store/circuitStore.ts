/**
 * Electronics Lab V0.1 — Circuit Store（电路数据）
 *
 * 关键规则：
 *  - 除器件拖拽外，所有结构操作（addDevice/removeDevice/addWire/removeWire/
 *    loadCircuit/clearCircuit）在修改前调用 _pushHistory()。
 *  - 器件移动的历史由 beginDeviceDrag / endDeviceDrag 配对管理：moveDevice 本身
 *    只更新当前位置并 _simulate()，不调用 _pushHistory()；一次完整拖拽只在结束时
 *    提交一条历史；位置未变化则不提交。
 *  - setDeviceState 的 pushHistory 默认 false：Button press/release 不产生历史，
 *    Switch toggle 传 true 产生历史。
 *  - 所有结构操作和信号操作完成后调用 _simulate() 执行信号传播并更新端口值。
 *  - past 最多 20 条，超出丢弃最旧。
 */

import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { Circuit, DeviceType, GridPos, PortRef, Wire } from '../engine/types';
import { createDevice, nextWireId } from '../engine/types';
import { SimulationEngine } from '../engine/SimulationEngine';
import { stripPortValues } from '../utils/serialize';
import { useUIStore } from './uiStore';

const HISTORY_LIMIT = 20;
const STORAGE_KEY = 'electronics-lab-circuit-v0.1';

export const engine = new SimulationEngine();

export interface AddWireResult {
  success: boolean;
  error?: string;
}

interface CircuitStoreState {
  // === 数据 ===
  circuit: Circuit;
  past: Circuit[];
  future: Circuit[];
  // === 结构操作（产生 Undo 历史）===
  addDevice: (type: DeviceType, position: GridPos) => string;
  removeDevice: (deviceId: string) => void;
  moveDevice: (deviceId: string, position: GridPos) => void;
  addWire: (from: PortRef, to: PortRef) => AddWireResult;
  removeWire: (wireId: string) => void;
  loadCircuit: (circuit: Circuit) => void;
  clearCircuit: () => void;
  // === 拖拽历史 ===
  beginDeviceDrag: (deviceId: string) => void;
  endDeviceDrag: (deviceId: string) => void;
  // === 信号操作 ===
  setDeviceState: (deviceId: string, state: Record<string, unknown>, pushHistory?: boolean) => void;
  // === Undo / Redo ===
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  // === 内部 ===
  _pushHistory: () => void;
  _simulate: () => void;
}

/** 拖拽临时快照（模块级，不入 state，避免被持久化） */
let dragSnapshot: Circuit | null = null;

function emptyCircuit(): Circuit {
  return { version: '0.1', devices: [], wires: [] };
}

const creator: StateCreator<CircuitStoreState, [], []> = (set, get) => ({
  circuit: emptyCircuit(),
  past: [],
  future: [],

  addDevice: (type, position) => {
    const device = createDevice(type, position);
    get()._pushHistory();
    set({ circuit: { ...get().circuit, devices: [...get().circuit.devices, device] } });
    get()._simulate();
    return device.id;
  },

  removeDevice: (deviceId) => {
    if (!get().circuit.devices.some((d) => d.id === deviceId)) return;
    get()._pushHistory();
    set({
      circuit: {
        ...get().circuit,
        devices: get().circuit.devices.filter((d) => d.id !== deviceId),
        wires: get().circuit.wires.filter(
          (w) => w.from.deviceId !== deviceId && w.to.deviceId !== deviceId,
        ),
      },
    });
    get()._simulate();
  },

  moveDevice: (deviceId, position) => {
    set({
      circuit: {
        ...get().circuit,
        devices: get().circuit.devices.map((d) =>
          d.id === deviceId
            ? { ...d, position: { x: Math.round(position.x), y: Math.round(position.y) } }
            : d,
        ),
      },
    });
    get()._simulate();
  },

  addWire: (from, to) => {
    const wire: Wire = { id: nextWireId(), from, to };
    const legality = engine.checkWireLegality(wire, get().circuit);
    if (legality) {
      return { success: false, error: legality.message };
    }
    const trial: Circuit = {
      ...get().circuit,
      wires: [...get().circuit.wires, wire],
    };
    if (engine.hasLoop(trial)) {
      return { success: false, error: 'V0.1 暂不支持包含反馈回路的电路' };
    }
    get()._pushHistory();
    set({ circuit: trial });
    get()._simulate();
    return { success: true };
  },

  removeWire: (wireId) => {
    if (!get().circuit.wires.some((w) => w.id === wireId)) return;
    get()._pushHistory();
    set({ circuit: { ...get().circuit, wires: get().circuit.wires.filter((w) => w.id !== wireId) } });
    get()._simulate();
  },

  loadCircuit: (circuit) => {
    get()._pushHistory();
    set({
      circuit: {
        version: circuit.version || '0.1',
        devices: circuit.devices,
        wires: circuit.wires,
      },
      future: [],
    });
    get()._simulate();
  },

  clearCircuit: () => {
    get()._pushHistory();
    set({ circuit: emptyCircuit(), future: [] });
    get()._simulate();
  },

  beginDeviceDrag: (_deviceId) => {
    dragSnapshot = get().circuit;
  },

  endDeviceDrag: (deviceId) => {
    if (!dragSnapshot) return;
    const snap = dragSnapshot;
    const before = snap.devices.find((d) => d.id === deviceId);
    const after = get().circuit.devices.find((d) => d.id === deviceId);
    dragSnapshot = null;
    const moved =
      before && after && (before.position.x !== after.position.x || before.position.y !== after.position.y);
    if (!moved) return;
    // 提交拖拽前的完整电路快照作为一条历史
    set((s) => ({
      past: [...s.past, snap].slice(-HISTORY_LIMIT),
      future: [],
    }));
  },

  setDeviceState: (deviceId, state, pushHistory = false) => {
    if (pushHistory) get()._pushHistory();
    set({
      circuit: {
        ...get().circuit,
        devices: get().circuit.devices.map((d) =>
          d.id === deviceId ? { ...d, state: { ...d.state, ...state } } : d,
        ),
      },
    });
    get()._simulate();
  },

  undo: () => {
    const { past, future, circuit } = get();
    if (past.length === 0) {
      useUIStore.getState().showToast('没有可撤销的操作', 'info');
      return;
    }
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [...future, circuit],
      circuit: prev,
    });
    get()._simulate();
  },

  redo: () => {
    const { past, future, circuit } = get();
    if (future.length === 0) {
      useUIStore.getState().showToast('没有可重做的操作', 'info');
      return;
    }
    const next = future[future.length - 1];
    set({
      past: [...past, circuit].slice(-HISTORY_LIMIT),
      future: future.slice(0, -1),
      circuit: next,
    });
    get()._simulate();
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  _pushHistory: () => {
    set((s) => ({
      past: [...s.past, s.circuit].slice(-HISTORY_LIMIT),
      future: [],
    }));
  },

  _simulate: () => {
    const result = engine.evaluate(get().circuit);
    if (result.hasLoop) {
      useUIStore.getState().showToast(
        result.errors[0]?.message ?? '检测到反馈回路，V0.1 不支持',
        'error',
      );
    }
    set({ circuit: result.circuit });
  },
});

export const useCircuitStore = create<CircuitStoreState>()(
  persist(creator, {
    name: STORAGE_KEY,
    partialize: (state) => ({
      circuit: stripPortValues(state.circuit),
    }),
    onRehydrateStorage: () => (state) => {
      if (!state) return;
      // 持久化数据不含 ports[].value，重置为 'X' 后由 Engine 重新计算
      for (const device of state.circuit.devices) {
        for (const port of device.ports) {
          port.value = 'X';
        }
      }
      state._simulate();
    },
  }),
);
