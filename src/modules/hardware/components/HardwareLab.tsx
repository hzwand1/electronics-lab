/**
 * Hardware Lab — 阶段 1 模块根视图
 *
 * 内容：标准 830-point 面包板 + Hole/Node 电气节点模型 + Node↔Node 导线。
 * 本阶段不包含任何元件（LED / 电阻 / 按钮 / MCU 等）。
 */

import { BreadboardView } from './BreadboardView';
import './hardwareLab.css';

export function HardwareLab() {
  return (
    <div className="hw-lab">
      <div className="hw-header">
        <div>
          <h2>Hardware Lab · 面包板基础</h2>
          <span className="hw-badge">阶段 1 / 共 4 阶段 · Breadboard + Node + Wire</span>
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
      </div>

      <BreadboardView />
    </div>
  );
}
