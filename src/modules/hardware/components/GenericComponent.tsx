/**
 * Hardware Lab — Generic Component 视图（S2-2 UI 验证用占位元件）
 *
 * 不是最终产品中的真实元件，仅用于验证 Component → Pin → Node 整个 UI 生命周期：
 * 放置 / 选择 / 移动 / 旋转 / 删除。
 *
 * 渲染在面包板世界坐标系中（与孔、导线同一 <g transform> 组内），自动跟随缩放。
 * Pin 视觉位置由 componentGeometry 纯函数计算，不在这里硬编码。
 */
import { memo } from 'react';
import type { Component } from '../types/componentTypes';
import { getComponentBodySize, getPinWorldPosition } from '../utils/componentGeometry';

interface GenericComponentProps {
  component: Component;
  selected: boolean;
  pitch: number;
  onMouseDown: (componentId: string, e: React.MouseEvent) => void;
  onContextMenu: (componentId: string, e: React.MouseEvent) => void;
}

function GenericComponentInner({ component, selected, pitch, onMouseDown, onContextMenu }: GenericComponentProps) {
  const compWorldX = component.position.x * pitch;
  const compWorldY = component.position.y * pitch;
  const { width: bodyW, height: bodyH } = getComponentBodySize(component.type, pitch);

  // Pin 相对元件左上角的世界坐标（已旋转）
  const pinPositions = component.pins.map((pin) => {
    const world = getPinWorldPosition(component, pin, pitch);
    return {
      pin,
      relX: world.x - compWorldX,
      relY: world.y - compWorldY,
    };
  });

  return (
    <g transform={`translate(${compWorldX}, ${compWorldY})`} className="hw-component">
      {/* 选中框（虚线，比主体略大） */}
      {selected && (
        <rect
          x={-5}
          y={-5}
          width={bodyW + 10}
          height={bodyH + 10}
          rx={6}
          className="hw-component-sel"
        />
      )}

      {/* 元件主体 */}
      <rect
        x={0}
        y={0}
        width={bodyW}
        height={bodyH}
        rx={4}
        className={`hw-component-body ${selected ? 'hw-component-body-selected' : ''}`}
        onMouseDown={(e) => onMouseDown(component.id, e)}
        onContextMenu={(e) => onContextMenu(component.id, e)}
      />

      {/* 标签 */}
      <text
        x={bodyW / 2}
        y={bodyH / 2 + 4}
        className="hw-component-label"
        textAnchor="middle"
        onMouseDown={(e) => onMouseDown(component.id, e)}
        onContextMenu={(e) => onContextMenu(component.id, e)}
      >
        GENERIC
      </text>

      {/* Pins：点击 Pin 也选中所属 Component（不设独立 Pin selection state） */}
      {pinPositions.map(({ pin, relX, relY }) => (
        <g key={pin.id}>
          <circle
            cx={relX}
            cy={relY}
            r={5}
            className="hw-component-pin"
            onMouseDown={(e) => {
              e.stopPropagation();
              onMouseDown(component.id, e);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContextMenu(component.id, e);
            }}
          >
            <title>{`Pin ${pin.name}（点击选中所属元件）`}</title>
          </circle>
          <text
            x={relX}
            y={relY - 8}
            className="hw-component-pin-label"
            textAnchor="middle"
          >
            {pin.name}
          </text>
        </g>
      ))}
    </g>
  );
}

export const GenericComponent = memo(GenericComponentInner);
