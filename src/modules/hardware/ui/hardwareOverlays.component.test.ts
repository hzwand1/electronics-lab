/**
 * Hardware Lab — 覆盖层 Component 选中/菜单测试（S2-2）
 *
 * 纯 TS，无 DOM/React。验证：
 *  - selectComponent 设置选中，同时清除导线选中（互斥）
 *  - selectWire 清除元件选中（互斥）
 *  - clearSelection 同时清除 wire 和 component
 *  - openComponentMenu 打开 kind=component 的菜单
 *  - onComponentDeleted 清理指向该元件的选中和菜单
 *  - 菜单单例：右键第二根元件切换目标
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

describe('hardwareOverlays — S2-2 Component 选中', () => {
  it('selectComponent 设置 selectedComponentId', () => {
    const s = reduce({ type: 'selectComponent', componentId: 'CMP-1' });
    expect(s.selectedComponentId).toBe('CMP-1');
  });

  it('selectComponent 同时清除 selectedWireId（互斥）', () => {
    const s = reduce(
      { type: 'selectWire', wireId: 'W1' },
      { type: 'selectComponent', componentId: 'CMP-1' },
    );
    expect(s.selectedComponentId).toBe('CMP-1');
    expect(s.selectedWireId).toBeNull();
  });

  it('selectWire 同时清除 selectedComponentId（互斥）', () => {
    const s = reduce(
      { type: 'selectComponent', componentId: 'CMP-1' },
      { type: 'selectWire', wireId: 'W1' },
    );
    expect(s.selectedWireId).toBe('W1');
    expect(s.selectedComponentId).toBeNull();
  });

  it('clearSelection 同时清除 wire 和 component 选中', () => {
    const s = reduce(
      { type: 'selectWire', wireId: 'W1' },
      { type: 'selectComponent', componentId: 'CMP-1' },
      { type: 'clearSelection' },
    );
    expect(s.selectedWireId).toBeNull();
    expect(s.selectedComponentId).toBeNull();
  });

  it('clearSelection 在两者都为空时幂等返回同一引用', () => {
    expect(overlaysReducer(initialOverlays, { type: 'clearSelection' })).toBe(initialOverlays);
  });

  it('重复 selectComponent 同一 id 且无菜单时幂等返回同一引用', () => {
    const s = reduce({ type: 'selectComponent', componentId: 'CMP-1' });
    expect(overlaysReducer(s, { type: 'selectComponent', componentId: 'CMP-1' })).toBe(s);
  });
});

describe('hardwareOverlays — S2-2 Component 右键菜单', () => {
  it('openComponentMenu 打开 kind=component 的菜单，componentId 与位置正确', () => {
    const s = reduce({ type: 'openComponentMenu', componentId: 'CMP-1', pos: { x: 200, y: 150 } });
    expect(s.contextMenu).not.toBeNull();
    expect(s.contextMenu?.target).toEqual({ kind: 'component', componentId: 'CMP-1' });
    expect(s.contextMenu?.pos).toEqual({ x: 200, y: 150 });
  });

  it('右键第二个元件立即切换目标，仍只有一个菜单', () => {
    const s = reduce(
      { type: 'openComponentMenu', componentId: 'CMP-1', pos: { x: 1, y: 1 } },
      { type: 'openComponentMenu', componentId: 'CMP-2', pos: { x: 2, y: 2 } },
    );
    expect(s.contextMenu?.target).toEqual({ kind: 'component', componentId: 'CMP-2' });
    expect(s.contextMenu?.pos).toEqual({ x: 2, y: 2 });
  });

  it('openComponentMenu 关闭已打开的 wireProperties', () => {
    const s = reduce(
      { type: 'openWireMenu', wireId: 'W1', pos: { x: 0, y: 0 } },
      { type: 'openWireProperties', wireId: 'W1' },
      { type: 'openComponentMenu', componentId: 'CMP-1', pos: { x: 0, y: 0 } },
    );
    expect(s.wireProperties).toBeNull();
    expect(s.contextMenu?.target.kind).toBe('component');
  });

  it('closeContextMenu 关闭元件菜单；无菜单时幂等', () => {
    const s = reduce(
      { type: 'openComponentMenu', componentId: 'CMP-1', pos: { x: 0, y: 0 } },
      { type: 'closeContextMenu' },
    );
    expect(s.contextMenu).toBeNull();
    expect(overlaysReducer(initialOverlays, { type: 'closeContextMenu' })).toBe(initialOverlays);
  });
});

describe('hardwareOverlays — S2-2 onComponentDeleted', () => {
  it('删除选中元件后 selectedComponentId 清空', () => {
    const s = reduce(
      { type: 'selectComponent', componentId: 'CMP-1' },
      { type: 'onComponentDeleted', componentId: 'CMP-1' },
    );
    expect(s.selectedComponentId).toBeNull();
  });

  it('删除右键菜单指向的元件后菜单关闭', () => {
    const s = reduce(
      { type: 'openComponentMenu', componentId: 'CMP-1', pos: { x: 0, y: 0 } },
      { type: 'onComponentDeleted', componentId: 'CMP-1' },
    );
    expect(s.contextMenu).toBeNull();
  });

  it('删除其他元件不影响当前选中', () => {
    const s = reduce(
      { type: 'selectComponent', componentId: 'CMP-1' },
      { type: 'onComponentDeleted', componentId: 'CMP-2' },
    );
    expect(s.selectedComponentId).toBe('CMP-1');
  });

  it('删除其他元件不影响当前元件菜单', () => {
    const s = reduce(
      { type: 'openComponentMenu', componentId: 'CMP-1', pos: { x: 0, y: 0 } },
      { type: 'onComponentDeleted', componentId: 'CMP-2' },
    );
    expect(s.contextMenu?.target).toEqual({ kind: 'component', componentId: 'CMP-1' });
  });

  it('onComponentDeleted 不影响导线选中和导线菜单', () => {
    const s = reduce(
      { type: 'selectWire', wireId: 'W1' },
      { type: 'openWireMenu', wireId: 'W1', pos: { x: 0, y: 0 } },
      { type: 'onComponentDeleted', componentId: 'CMP-1' },
    );
    expect(s.selectedWireId).toBe('W1');
    expect(s.contextMenu?.target).toEqual({ kind: 'wire', wireId: 'W1' });
  });
});

describe('hardwareOverlays — S2-2 confirmClearDone 清除全部选中', () => {
  it('confirmClearDone 同时清除 wire 和 component 选中、菜单、属性', () => {
    const s = reduce(
      { type: 'selectWire', wireId: 'W1' },
      { type: 'selectComponent', componentId: 'CMP-1' },
      { type: 'requestClearConfirm' },
      { type: 'confirmClearDone' },
    );
    expect(s.selectedWireId).toBeNull();
    expect(s.selectedComponentId).toBeNull();
    expect(s.contextMenu).toBeNull();
    expect(s.wireProperties).toBeNull();
    expect(s.confirmClear).toBe(false);
  });
});
