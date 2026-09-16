/**
 * Hardware Lab — 独立 Zustand Store（阶段 1）
 *
 * 职责：
 *  - 持有固定面包板模型 + 预建索引（不持久化，确定性重建）
 *  - 持有电路结构 wires（持久化到 localStorage）
 *  - 所有导线判断委托纯 TS HardwareEngine，Store 不自行实现节点逻辑
 *
 * 不持久化：hover、选中、鼠标位置、导线预览等 UI 临时状态（由组件本地管理）。
 * 与 circuitStore / gpioStore 完全隔离，不共享状态。
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AddWireStatus,
  Breadboard,
  BreadboardIndex,
  HardwareWire,
} from '../types/hardwareTypes';
import { buildBreadboardIndex, createBreadboard } from '../engine/breadboardFactory';
import { HardwareEngine, HARDWARE_STATE_VERSION } from '../engine/hardwareEngine';

const STORAGE_KEY = 'electronics-lab-hardware-v0.1';

// 模块级单例：面包板是固定确定性模型，索引只建立一次。
export const breadboard: Breadboard = createBreadboard();
export const breadboardIndex: BreadboardIndex = buildBreadboardIndex(breadboard);
export const hardwareEngine = new HardwareEngine(breadboardIndex);

interface HardwareStore {
  breadboard: Breadboard;
  index: BreadboardIndex;
  version: string;
  /** 电路结构：导线（Node ↔ Node） */
  wires: HardwareWire[];

  /** 以两个锚点孔建立导线，返回判定结果供 UI 反馈 */
  addWireByHoles: (startHoleId: string, endHoleId: string) => AddWireStatus;
  removeWire: (wireId: string) => void;
  clearWires: () => void;
}

export const useHardwareStore = create<HardwareStore>()(
  persist(
    (set, get) => ({
      breadboard,
      index: breadboardIndex,
      version: HARDWARE_STATE_VERSION,
      wires: [],

      addWireByHoles: (startHoleId, endHoleId) => {
        const current = { version: get().version, wires: get().wires };
        const result = hardwareEngine.addWire(current, startHoleId, endHoleId);
        if (result.status === 'created') {
          set({ wires: result.state.wires });
        }
        return result.status;
      },

      removeWire: (wireId) => {
        const current = { version: get().version, wires: get().wires };
        set({ wires: hardwareEngine.removeWire(current, wireId).wires });
      },

      clearWires: () => {
        set({ wires: [] });
      },
    }),
    {
      name: STORAGE_KEY,
      // 仅持久化电路结构（导线）；面包板/索引为确定性数据，不持久化。
      partialize: (state) => ({ wires: state.wires }),
      // rehydrate 时用引擎严格校验引用，丢弃任何非法/过期导线。
      merge: (persisted, current) => {
        const persistedWires =
          persisted && typeof persisted === 'object' && 'wires' in persisted
            ? (persisted as { wires?: unknown }).wires
            : undefined;
        const safeWires = hardwareEngine.safeLoadWires(persistedWires);
        return {
          ...current,
          wires: safeWires,
        };
      },
    },
  ),
);
