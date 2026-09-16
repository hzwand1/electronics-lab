/**
 * Hardware Lab — 导线右键上下文菜单（阶段 1 收尾）
 *
 * 当前只支持 wire 目标（属性 / 删除导线）。
 * 结构上通过 ContextTarget.kind 预留未来 component / board 对象的扩展点，
 * 但本阶段不实现任何未来元件菜单。
 */

import { forwardRef } from 'react';
import type { ContextMenuState } from '../ui/hardwareOverlays';

interface WireContextMenuProps {
  menu: ContextMenuState;
  onProperties: (wireId: string) => void;
  onDelete: (wireId: string) => void;
}

const MENU_W = 168;
const MENU_H = 88;
const EDGE = 8;

export const WireContextMenu = forwardRef<HTMLDivElement, WireContextMenuProps>(
  function WireContextMenu({ menu, onProperties, onDelete }, ref) {
    // 防止菜单超出视口
    const x = Math.min(menu.pos.x, window.innerWidth - MENU_W - EDGE);
    const y = Math.min(menu.pos.y, window.innerHeight - MENU_H - EDGE);
    const wireId = menu.target.wireId;

    return (
      <div
        ref={ref}
        className="hw-context-menu"
        style={{ left: Math.max(EDGE, x), top: Math.max(EDGE, y) }}
        // 菜单内部按下不穿透到 window“点击外部关闭”监听
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        role="menu"
      >
        <button
          role="menuitem"
          className="hw-context-item"
          onClick={() => onProperties(wireId)}
        >
          属性
        </button>
        <button
          role="menuitem"
          className="hw-context-item hw-context-item-danger"
          onClick={() => onDelete(wireId)}
        >
          删除导线
        </button>
      </div>
    );
  },
);
