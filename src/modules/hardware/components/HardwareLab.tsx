/**
 * Hardware Lab — 模块根视图（S2-2：Component UI 基础层）
 *
 * 布局：顶部标题 + 规则说明 + 主体（左侧 Parts Library + 右侧 BreadboardView）。
 * placementType 由本组件管理，传给 PartsLibrary（选中高亮）和 BreadboardView（放置逻辑）。
 */
import { useState } from 'react';
import { BreadboardView } from './BreadboardView';
import { PartsLibrary } from './PartsLibrary';
import type { ComponentType } from '../types/componentTypes';
import './hardwareLab.css';

export function HardwareLab() {
  // placement 模式：null = 正常；非 null = 等待用户在面包板空白处点击放置该类型元件
  const [placementType, setPlacementType] = useState<ComponentType | null>(null);

  return (
    <div className="hw-lab">
      <div className="hw-header">
        <div>
          <h2>Hardware Lab · 面包板基础</h2>
          <span className="hw-badge">阶段 2 / 共 4 阶段 · Component UI 基础层</span>
        </div>
        <div className="hw-legend">
          <span className="hw-legend-item">
            <i className="hw-dot hw-dot-3v3" /> +3.3V 电源母线（上/下分段）
          </span>
          <span className="hw-legend-item">
            <i className="hw-dot hw-dot-gnd" /> GND 电源母线（上/下分段）
          </span>
          <span className="hw-legend-item">
            <i className="hw-dot hw-dot-term" /> 信号孔 A~E / F~J
          </span>
        </div>
      </div>

      <div className="hw-rules">
        <p>
          <strong>孔 ≠ 节点。</strong>同一行的 A~E 五个孔在电气上是同一个节点；F~J 是另一个节点；中央沟槽左右绝缘，
          相邻行默认不连接。悬停任意孔，属于同一节点的孔会一起高亮。
        </p>
        <p>
          <strong>导线连接的是节点。</strong>点击一个孔作为起点，再点另一个节点的孔即建立
          Node ↔ Node 连接；同一节点内连线无效，重复连接不会创建第二条。两侧电源母线默认<strong>上下分段</strong>，
          需要跨段时请用导线自行连接。
        </p>
        <p>
          <strong>元件（S2-2）。</strong>从左侧元件库选择 Generic Component，在面包板空白处点击放置；
          拖动移动，R 键旋转，Delete / Backspace 或右键删除。移动与旋转<strong>不改变</strong> Pin 的电气连接（视觉位置 ≠ 电气连接）。
        </p>
      </div>

      <div className="hw-lab-body">
        <PartsLibrary placementType={placementType} onSelect={setPlacementType} />
        <BreadboardView
          placementType={placementType}
          onPlacementDone={() => setPlacementType(null)}
        />
      </div>
    </div>
  );
}
