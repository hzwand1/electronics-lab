/**
 * Hardware Lab — 导线属性面板（阶段 1 收尾）
 *
 * 只展示当前导线在 Store 中已有的真实数据（Wire/Hole/Node 标识），
 * 不维护第二份数据，也不提供电阻/电流/电压等阶段 2 才会有的元件属性。
 */

import { forwardRef } from 'react';
import type { HardwareWire } from '../types/hardwareTypes';

interface WirePropertiesPanelProps {
  wire: HardwareWire;
  onClose: () => void;
}

export const WirePropertiesPanel = forwardRef<HTMLDivElement, WirePropertiesPanelProps>(
  function WirePropertiesPanel({ wire, onClose }, ref) {
    return (
      <div
        ref={ref}
        className="hw-props-panel"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hw-props-head">
          <span>导线属性</span>
          <button className="hw-props-close" onClick={onClose} aria-label="关闭属性">
            ×
          </button>
        </div>

        <div className="hw-props-row">
          <span className="hw-props-label">Wire</span>
          <code className="hw-props-value">{wire.id}</code>
        </div>

        <div className="hw-props-group">
          <div className="hw-props-group-title">起点</div>
          <div className="hw-props-row">
            <span className="hw-props-label">Hole</span>
            <code className="hw-props-value">{wire.startHoleId}</code>
          </div>
          <div className="hw-props-row">
            <span className="hw-props-label">Node</span>
            <code className="hw-props-value hw-props-node">{wire.startNodeId}</code>
          </div>
        </div>

        <div className="hw-props-group">
          <div className="hw-props-group-title">终点</div>
          <div className="hw-props-row">
            <span className="hw-props-label">Hole</span>
            <code className="hw-props-value">{wire.endHoleId}</code>
          </div>
          <div className="hw-props-row">
            <span className="hw-props-label">Node</span>
            <code className="hw-props-value hw-props-node">{wire.endNodeId}</code>
          </div>
        </div>

        <p className="hw-props-note">导线连接的是两个电气 Node；Hole 仅为渲染锚点。</p>
      </div>
    );
  },
);
