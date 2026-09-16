/**
 * GPIO 入门实验模块 — 独立 Zustand Store
 *
 * 职责：
 *  - 保存 config（用户配置）
 *  - 保存 derived（引擎派生状态）
 *  - 提供 setter
 *  - 调用 GpioEngine.evaluate() 并更新 derived
 *
 * 禁止：
 *  - Store 不得自己实现 GPIO 电平判断逻辑，必须委托 gpioEngine。
 *  - 不与 circuitStore / uiStore 共享状态。
 */

import { create } from 'zustand';
import { DEFAULT_CONFIG, Direction, External, GpioConfig, GpioDerived, OutType, Pull } from '../engine/gpioTypes';
import { gpioEngine } from '../engine/gpioEngine';

interface GpioStore {
  config: GpioConfig;
  derived: GpioDerived;

  // === Setters（每次更新后自动调用 engine 重新计算 derived）===
  setDirection: (direction: Direction) => void;
  setPull: (pull: Pull) => void;
  setOutType: (outType: OutType) => void;
  setOdr: (odr: 0 | 1) => void;
  setExternal: (external: External) => void;
  setConfig: (config: Partial<GpioConfig>) => void;
  resetConfig: () => void;
}

/** 内部：用给定 config 计算 derived 并返回新状态片段 */
function recompute(config: GpioConfig): { config: GpioConfig; derived: GpioDerived } {
  return { config, derived: gpioEngine.evaluate(config) };
}

export const useGpioStore = create<GpioStore>((set) => ({
  config: DEFAULT_CONFIG,
  derived: gpioEngine.evaluate(DEFAULT_CONFIG),

  setDirection: (direction) =>
    set((state) => recompute({ ...state.config, direction })),

  setPull: (pull) =>
    set((state) => recompute({ ...state.config, pull })),

  setOutType: (outType) =>
    set((state) => recompute({ ...state.config, outType })),

  setOdr: (odr) =>
    set((state) => recompute({ ...state.config, odr })),

  setExternal: (external) =>
    set((state) => recompute({ ...state.config, external })),

  setConfig: (partial) =>
    set((state) => recompute({ ...state.config, ...partial })),

  resetConfig: () => set(recompute(DEFAULT_CONFIG)),
}));
