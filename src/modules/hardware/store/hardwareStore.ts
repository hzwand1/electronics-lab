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
  GridPoint,
  HardwareWire,
} from '../types/hardwareTypes';
import type { Component, ComponentRotation, ComponentType } from '../types/componentTypes';
import { buildBreadboardIndex, createBreadboard } from '../engine/breadboardFactory';
import { HardwareEngine, HARDWARE_STATE_VERSION } from '../engine/hardwareEngine';
import { createComponent } from '../engine/componentFactory';
import {
  connectPinToNode as engineConnectPinToNode,
  disconnectPin as engineDisconnectPin,
  removeComponent as engineRemoveComponent,
  safeLoadComponents,
  type ConnectStatus,
} from '../engine/connectivity';

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
  /** Stage 2：元件（Component → Pin → Node），结构数据，持久化 */
  components: Component[];

  /** 以两个锚点孔建立导线，返回判定结果供 UI 反馈 */
  addWireByHoles: (startHoleId: string, endHoleId: string) => AddWireStatus;
  removeWire: (wireId: string) => void;
  clearWires: () => void;

  /** 添加一个元件，返回其 id */
  addComponent: (type: ComponentType, position: GridPoint) => string;
  /** 删除元件（连同其 Pins），不删 Node / Wire / 其他元件 */
  removeComponent: (componentId: string) => void;
  /** 移动元件：只改 position，绝不改变 pins.nodeId（视觉位置 ≠ 电气连接） */
  moveComponent: (componentId: string, position: GridPoint) => void;
  /** 旋转元件 90°：只改 rotation，绝不改变 pins.nodeId */
  rotateComponent: (componentId: string) => void;
  /** 将指定 Pin 连接到 Node，返回连接状态（委托纯 TS connectivity） */
  connectPinToNode: (pinId: string, nodeId: string) => ConnectStatus;
  /** 断开指定 Pin，返回连接状态 */
  disconnectPin: (pinId: string) => ConnectStatus;
}

export const useHardwareStore = create<HardwareStore>()(
  persist(
    (set, get) => ({
      breadboard,
      index: breadboardIndex,
      version: HARDWARE_STATE_VERSION,
      wires: [],
      components: [],

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

      // === Stage 2：Component / Pin → Node（连接逻辑全部委托纯 TS connectivity）===
      addComponent: (type, position) => {
        const comp = createComponent(type, position);
        set({ components: [...get().components, comp] });
        return comp.id;
      },

      removeComponent: (componentId) => {
        const result = engineRemoveComponent(get().components, componentId);
        if (result.status === 'ok') {
          set({ components: result.components });
        }
      },

      // S2-2：移动 / 旋转只改物理属性，绝不触碰 pins.nodeId（电气连接与视觉位置分离）
      moveComponent: (componentId, position) => {
        set({
          components: get().components.map((c) =>
            c.id === componentId ? { ...c, position: { x: position.x, y: position.y } } : c,
          ),
        });
      },

      rotateComponent: (componentId) => {
        set({
          components: get().components.map((c) =>
            c.id === componentId
              ? { ...c, rotation: (((c.rotation + 90) % 360) as ComponentRotation) }
              : c,
          ),
        });
      },

      connectPinToNode: (pinId, nodeId) => {
        const validNodeIds = new Set(get().index.nodeById.keys());
        const result = engineConnectPinToNode(
          get().components,
          pinId,
          nodeId,
          validNodeIds,
        );
        if (result.status === 'ok') {
          set({ components: result.components });
        }
        return result.status;
      },

      disconnectPin: (pinId) => {
        const result = engineDisconnectPin(get().components, pinId);
        if (result.status === 'ok') {
          set({ components: result.components });
        }
        return result.status;
      },
    }),
    {
      name: STORAGE_KEY,
      // 仅持久化电路结构（导线 + 元件）；面包板/索引为确定性数据，不持久化。
      partialize: (state) => ({
        wires: state.wires,
        components: state.components,
      }),
      // rehydrate 时用引擎严格校验引用，丢弃任何非法/过期导线。
      merge: (persisted, current) => {
        const persistedWires =
          persisted && typeof persisted === 'object' && 'wires' in persisted
            ? (persisted as { wires?: unknown }).wires
            : undefined;
        const persistedComponents =
          persisted && typeof persisted === 'object' && 'components' in persisted
            ? (persisted as { components?: unknown }).components
            : undefined;
        const safeWires = hardwareEngine.safeLoadWires(persistedWires);
        const safeComponents = safeLoadComponents(persistedComponents);
        return {
          ...current,
          wires: safeWires,
          components: safeComponents,
        };
      },
    },
  ),
);
