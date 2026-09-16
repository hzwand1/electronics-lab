/**
 * Hardware Lab — Component 右键上下文菜单（S2-2）
 *
 * 当前只有"删除元件"一个选项（属性面板属于 S2-10，本阶段不做）。
 * 复用 WireContextMenu 的 .hw-context-menu / .hw-context-menu-item 视觉样式。
 *
 * 通过 forwardRef 暴露外层 div，供 BreadboardView 的 onDocMouseDown 检查
 * "点击是否在菜单内"，从而实现点击菜单外关闭。
 */
import { forwardRef } from 'react';
import type { ScreenPoint } from '../ui/hardwareOverlays';

interface ComponentContextMenuProps {
  componentId: string;
  pos: ScreenPoint;
  onDelete: (componentId: string) => void;
}

export const ComponentContextMenu = forwardRef<HTMLDivElement, ComponentContextMenuProps>(
  function ComponentContextMenu({ componentId, pos, onDelete }, ref) {
    return (
      <div
        ref={ref}
        className="hw-context-menu"
        style={{ left: pos.x, top: pos.y }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="hw-context-menu-item hw-context-menu-item-danger"
          onClick={() => onDelete(componentId)}
        >
          删除元件
        </button>
      </div>
    );
  },
);
