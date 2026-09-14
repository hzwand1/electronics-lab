/**
 * Electronics Lab V0.1 — UI Store（界面状态）
 *
 * uiStore 不持久化到 localStorage，刷新后重置为默认值。
 */

import { create } from 'zustand';
import { PortRef } from '../engine/types';

export type ToastType = 'info' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface PendingWire {
  from: PortRef;
  /** 逻辑画布坐标（px） */
  toMousePos: { x: number; y: number };
}

/** 右键上下文菜单（屏幕坐标，position:fixed） */
export interface ContextMenuState {
  x: number;
  y: number;
  kind: 'device' | 'wire';
  id: string;
}

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4.0;

interface UIStoreState {
  // === 选中状态 ===
  selectedDeviceId: string | null;
  selectedWireId: string | null;
  // === 画布视图 ===
  zoom: number;
  panOffset: { x: number; y: number };
  // === 底部面板 ===
  activePanel: 'truthTable' | 'deviceInfo';
  // === 交互临时状态 ===
  hoverPort: PortRef | null;
  pendingWire: PendingWire | null;
  isPanning: boolean;
  errorPortId: string | null;
  contextMenu: ContextMenuState | null;
  // === Toast ===
  toasts: Toast[];
  // === Actions ===
  selectDevice: (id: string | null) => void;
  selectWire: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setActivePanel: (panel: 'truthTable' | 'deviceInfo') => void;
  setHoverPort: (port: PortRef | null) => void;
  setPendingWire: (wire: PendingWire | null) => void;
  setIsPanning: (panning: boolean) => void;
  setErrorPortId: (id: string | null) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

let toastSeq = 0;

export const useUIStore = create<UIStoreState>((set) => ({
  selectedDeviceId: null,
  selectedWireId: null,
  zoom: 1,
  panOffset: { x: 40, y: 40 },
  activePanel: 'truthTable',
  hoverPort: null,
  pendingWire: null,
  isPanning: false,
  errorPortId: null,
  contextMenu: null,
  toasts: [],

  selectDevice: (id) => set({ selectedDeviceId: id, selectedWireId: null }),
  selectWire: (id) => set({ selectedWireId: id, selectedDeviceId: null }),
  setZoom: (zoom) => set({ zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) }),
  setPanOffset: (panOffset) => set({ panOffset }),
  setActivePanel: (activePanel) => set({ activePanel }),
  setHoverPort: (hoverPort) => set({ hoverPort }),
  setPendingWire: (pendingWire) => set({ pendingWire }),
  setIsPanning: (isPanning) => set({ isPanning }),
  setErrorPortId: (errorPortId) => set({ errorPortId }),
  setContextMenu: (contextMenu) => set({ contextMenu }),
  showToast: (message, type = 'info') => {
    toastSeq += 1;
    const id = `toast_${Date.now().toString(36)}_${toastSeq.toString(36)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      useUIStore.getState().dismissToast(id);
    }, 2600);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
