/**
 * Hardware Lab — 画布覆盖层 UI 状态机（阶段 1 收尾）
 *
 * 纯 TypeScript：不依赖 React / DOM / Zustand。
 * 只负责覆盖层的状态迁移逻辑：导线选中、右键上下文菜单、导线属性、清空确认。
 * React 组件只负责渲染与事件转发，所有可判定行为集中在这里，便于脱离浏览器单测。
 *
 * 可扩展性：ContextTarget 当前只支持 'wire'。
 * 未来加入电阻 / LED / Button / C8T6 等对象时，可在此扩展 target kind
 * （如 'component' | 'board'），而无需改动 Breadboard / Node / Wire 核心模型。
 */

/** 覆盖层可作用的对象种类（Stage 1 只有 wire；为未来元件系统预留） */
export type OverlayTargetKind = 'wire';

/** 右键菜单当前目标（ discriminated union，便于未来扩展） */
export type ContextTarget = {
  kind: OverlayTargetKind;
  wireId: string;
};

/** 屏幕坐标（固定定位用，组件传入 clientX/clientY） */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** 右键上下文菜单状态：同一时刻最多一个 */
export interface ContextMenuState {
  target: ContextTarget;
  pos: ScreenPoint;
}

/** 导线属性面板状态：仅记录当前查看的 wireId，真实数据由组件从 Store 读取 */
export interface WirePropertiesState {
  wireId: string;
}

/**
 * 画布覆盖层总状态。
 * 全部属于“不持久化的临时 UI 状态”，刷新/卸载即重置，绝不写入 localStorage。
 */
export interface HardwareOverlays {
  /** 左键选中的导线（Delete/Backspace 删除目标） */
  selectedWireId: string | null;
  /** 右键打开的上下文菜单（至多一个） */
  contextMenu: ContextMenuState | null;
  /** 导线属性面板 */
  wireProperties: WirePropertiesState | null;
  /** “清空全部导线”确认弹窗是否打开 */
  confirmClear: boolean;
}

export const initialOverlays: HardwareOverlays = {
  selectedWireId: null,
  contextMenu: null,
  wireProperties: null,
  confirmClear: false,
};

export type OverlayAction =
  | { type: 'selectWire'; wireId: string }
  | { type: 'clearSelection' }
  | { type: 'openWireMenu'; wireId: string; pos: ScreenPoint }
  | { type: 'closeContextMenu' }
  | { type: 'openWireProperties'; wireId: string }
  | { type: 'closeWireProperties' }
  | { type: 'requestClearConfirm' }
  | { type: 'cancelClearConfirm' }
  /** 删除某导线后同步覆盖层（菜单/属性/选中若指向它则关闭） */
  | { type: 'onWireDeleted'; wireId: string }
  /** 确认清空完成后的覆盖层重置（选中/菜单/属性全清，确认框关闭） */
  | { type: 'confirmClearDone' };

/**
 * 覆盖层状态迁移（不可变）。
 * 不执行任何真正的导线删除 / 清空——那是 HardwareEngine + Store 的职责；
 * 这里只表达“UI 应该呈现什么覆盖层”。
 */
export function overlaysReducer(
  state: HardwareOverlays,
  action: OverlayAction,
): HardwareOverlays {
  switch (action.type) {
    case 'selectWire':
      // 点击同一根切换无效，避免产生新对象引用（利于 memo）
      if (state.selectedWireId === action.wireId && !state.contextMenu) return state;
      return { ...state, selectedWireId: action.wireId };

    case 'clearSelection':
      if (state.selectedWireId === null) return state;
      return { ...state, selectedWireId: null };

    case 'openWireMenu':
      // 无论当前菜单指向谁，都直接替换为单个新菜单（右键第二根即时切换，不会并存）
      return {
        ...state,
        contextMenu: { target: { kind: 'wire', wireId: action.wireId }, pos: action.pos },
        // 右键另开目标时，关闭旧的属性面板
        wireProperties: null,
      };

    case 'closeContextMenu':
      if (!state.contextMenu) return state;
      return { ...state, contextMenu: null };

    case 'openWireProperties':
      // 从菜单进入属性：关菜单，开属性，目标是同一个 wireId
      return {
        ...state,
        contextMenu: null,
        wireProperties: { wireId: action.wireId },
      };

    case 'closeWireProperties':
      if (!state.wireProperties) return state;
      return { ...state, wireProperties: null };

    case 'requestClearConfirm':
      if (state.confirmClear) return state;
      return { ...state, confirmClear: true };

    case 'cancelClearConfirm':
      if (!state.confirmClear) return state;
      // 取消：仅关闭确认框，不动选中/菜单/属性，更不动任何导线
      return { ...state, confirmClear: false };

    case 'onWireDeleted': {
      if (
        state.contextMenu?.target.wireId !== action.wireId &&
        state.wireProperties?.wireId !== action.wireId &&
        state.selectedWireId !== action.wireId
      ) {
        return state;
      }
      return {
        ...state,
        selectedWireId:
          state.selectedWireId === action.wireId ? null : state.selectedWireId,
        contextMenu:
          state.contextMenu?.target.wireId === action.wireId ? null : state.contextMenu,
        wireProperties:
          state.wireProperties?.wireId === action.wireId ? null : state.wireProperties,
      };
    }

    case 'confirmClearDone':
      // 清空后覆盖层全部归位（确认框、菜单、属性、选中）
      return {
        selectedWireId: null,
        contextMenu: null,
        wireProperties: null,
        confirmClear: false,
      };

    default:
      return state;
  }
}
