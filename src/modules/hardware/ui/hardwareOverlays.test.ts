/**
 * Hardware Lab — 覆盖层状态机测试（纯 TS，无 DOM/React）
 *
 * 覆盖：导线选中、右键菜单单例与切换、属性进入/关闭、
 * 删除目标后的覆盖层清理、清空确认的取消/确认状态、幂等性。
 * 真正的导线删除/清空由 HardwareEngine + Store 负责，这里只验证 UI 状态迁移。
 */

import { describe, expect, it } from 'vitest';
import {
  initialOverlays,
  overlaysReducer,
  type OverlayAction,
} from './hardwareOverlays';

function reduce(...actions: OverlayAction[]) {
  return actions.reduce(overlaysReducer, initialOverlays);
}

describe('hardwareOverlays — 选中', () => {
  it('selectWire 设置选中导线', () => {
    const s = reduce({ type: 'selectWire', wireId: 'W1' });
    expect(s.selectedWireId).toBe('W1');
  });

  it('clearSelection 清空选中；已为空时返回同一引用（幂等）', () => {
    const s = reduce({ type: 'selectWire', wireId: 'W1' }, { type: 'clearSelection' });
    expect(s.selectedWireId).toBeNull();
    expect(overlaysReducer(initialOverlays, { type: 'clearSelection' })).toBe(initialOverlays);
  });
});

describe('hardwareOverlays — 右键菜单（23~26/32~34 的逻辑部分）', () => {
  it('右键 wire 打开单个菜单，目标 wireId 与位置正确，kind=wire', () => {
    const s = reduce({ type: 'openWireMenu', wireId: 'W::a::b', pos: { x: 120, y: 80 } });
    expect(s.contextMenu).not.toBeNull();
    expect(s.contextMenu?.target).toEqual({ kind: 'wire', wireId: 'W::a::b' });
    expect(s.contextMenu?.pos).toEqual({ x: 120, y: 80 });
  });

  it('右键第二根 wire 立即切换目标，且仍只有一个菜单', () => {
    const s = reduce(
      { type: 'openWireMenu', wireId: 'W1', pos: { x: 1, y: 1 } },
      { type: 'openWireMenu', wireId: 'W2', pos: { x: 2, y: 2 } },
    );
    expect((s.contextMenu?.target as { wireId: string }).wireId).toBe('W2');
    expect(s.contextMenu?.pos).toEqual({ x: 2, y: 2 });
  });

  it('右键打开新菜单时关闭已打开的属性面板', () => {
    const s = reduce(
      { type: 'openWireMenu', wireId: 'W1', pos: { x: 0, y: 0 } },
      { type: 'openWireProperties', wireId: 'W1' },
      { type: 'openWireMenu', wireId: 'W2', pos: { x: 0, y: 0 } },
    );
    expect(s.wireProperties).toBeNull();
    expect((s.contextMenu?.target as { wireId: string }).wireId).toBe('W2');
  });

  it('closeContextMenu 关闭菜单；无菜单时幂等返回同一引用', () => {
    const s = reduce(
      { type: 'openWireMenu', wireId: 'W1', pos: { x: 0, y: 0 } },
      { type: 'closeContextMenu' },
    );
    expect(s.contextMenu).toBeNull();
    expect(overlaysReducer(initialOverlays, { type: 'closeContextMenu' })).toBe(initialOverlays);
  });
});

describe('hardwareOverlays — 属性（27/28 的状态部分）', () => {
  it('从菜单进入属性：菜单关闭、属性打开且指向同一 wireId', () => {
    const s = reduce(
      { type: 'openWireMenu', wireId: 'W1', pos: { x: 0, y: 0 } },
      { type: 'openWireProperties', wireId: 'W1' },
    );
    expect(s.contextMenu).toBeNull();
    expect(s.wireProperties).toEqual({ wireId: 'W1' });
  });

  it('closeWireProperties 关闭属性；无属性时幂等', () => {
    const s = reduce(
      { type: 'openWireMenu', wireId: 'W1', pos: { x: 0, y: 0 } },
      { type: 'openWireProperties', wireId: 'W1' },
      { type: 'closeWireProperties' },
    );
    expect(s.wireProperties).toBeNull();
    expect(overlaysReducer(initialOverlays, { type: 'closeWireProperties' })).toBe(initialOverlays);
  });
});

describe('hardwareOverlays — 删除目标清理（29~31/40）', () => {
  it('删除被右键菜单指向的 wire：菜单关闭', () => {
    const s = reduce(
      { type: 'openWireMenu', wireId: 'W1', pos: { x: 0, y: 0 } },
      { type: 'onWireDeleted', wireId: 'W1' },
    );
    expect(s.contextMenu).toBeNull();
  });

  it('删除属性面板正在查看的 wire：属性关闭', () => {
    const s = reduce(
      { type: 'openWireMenu', wireId: 'W1', pos: { x: 0, y: 0 } },
      { type: 'openWireProperties', wireId: 'W1' },
      { type: 'onWireDeleted', wireId: 'W1' },
    );
    expect(s.wireProperties).toBeNull();
  });

  it('删除选中的 wire：selectedWireId 清空', () => {
    const s = reduce(
      { type: 'selectWire', wireId: 'W1' },
      { type: 'onWireDeleted', wireId: 'W1' },
    );
    expect(s.selectedWireId).toBeNull();
  });

  it('删除其他 wire 不影响当前菜单/属性/选中', () => {
    const s = reduce(
      { type: 'openWireMenu', wireId: 'W1', pos: { x: 0, y: 0 } },
      { type: 'openWireProperties', wireId: 'W1' },
      { type: 'onWireDeleted', wireId: 'W-other' },
    );
    expect(s.contextMenu).toBeNull(); // 进入属性后菜单本就关闭
    expect(s.wireProperties).toEqual({ wireId: 'W1' });

    const s2 = reduce(
      { type: 'selectWire', wireId: 'W1' },
      { type: 'onWireDeleted', wireId: 'W-other' },
    );
    expect(s2.selectedWireId).toBe('W1');
  });
});

describe('hardwareOverlays — 清空确认（35~37）', () => {
  it('requestClearConfirm 打开确认框（不触碰导线）', () => {
    const s = reduce({ type: 'requestClearConfirm' });
    expect(s.confirmClear).toBe(true);
    // 重复请求幂等
    expect(overlaysReducer(s, { type: 'requestClearConfirm' })).toBe(s);
  });

  it('取消：关闭确认框，保留选中状态，不动菜单/属性', () => {
    const s = reduce(
      { type: 'selectWire', wireId: 'W1' },
      { type: 'requestClearConfirm' },
      { type: 'cancelClearConfirm' },
    );
    expect(s.confirmClear).toBe(false);
    expect(s.selectedWireId).toBe('W1');
  });

  it('confirmClearDone：确认框/菜单/属性/选中全部归位', () => {
    const s = reduce(
      { type: 'selectWire', wireId: 'W1' },
      { type: 'openWireMenu', wireId: 'W1', pos: { x: 0, y: 0 } },
      { type: 'confirmClearDone' },
    );
    expect(s).toEqual(initialOverlays);
  });

  it('未打开确认框时取消幂等返回同一引用', () => {
    expect(overlaysReducer(initialOverlays, { type: 'cancelClearConfirm' })).toBe(initialOverlays);
  });
});
