/**
 * Hardware Lab — 单个面包板孔（React.memo 优化）
 *
 * 830 个孔中，只有视觉分类（category）发生变化的孔才会重新渲染。
 * 悬停某个节点时，最多只有该节点的 5（终端）或 25（电源分段）个孔更新，
 * 其余孔因 props 未变被 memo 跳过。
 */

import { memo } from 'react';

/** 孔的视觉分类 */
export type HoleCategory = 'idle' | 'hover' | 'node' | 'start' | 'self' | 'valid';

interface HoleViewProps {
  id: string;
  cx: number;
  cy: number;
  category: HoleCategory;
  /** '3v3' | 'gnd' 用于电源孔着色，终端孔为 undefined */
  powerTint?: '3v3' | 'gnd';
  nodeLabel: string;
  onEnter: (id: string) => void;
  onLeave: () => void;
  onSelect: (id: string) => void;
}

const HOLE_R = 5.2;

function HoleViewInner({
  id,
  cx,
  cy,
  category,
  powerTint,
  nodeLabel,
  onEnter,
  onLeave,
  onSelect,
}: HoleViewProps) {
  const baseFill = powerTint === '3v3' ? '#7a2a2a' : powerTint === 'gnd' ? '#26324d' : '#20242c';
  const stroke =
    category === 'hover'
      ? '#ffd54f'
      : category === 'start'
        ? '#4caf50'
        : category === 'self'
          ? '#9e9e9e'
          : category === 'valid' || category === 'node'
            ? '#448aff'
            : 'transparent';

  const fill =
    category === 'hover'
      ? '#ffd54f'
      : category === 'start'
        ? '#66bb6a'
        : category === 'self'
          ? '#616161'
          : category === 'valid' || category === 'node'
            ? powerTint
              ? powerTint === '3v3'
                ? '#e57373'
                : '#7986cb'
              : '#64b5f6'
            : baseFill;

  return (
    <circle
      className={`hw-hole hw-hole-${category} ${powerTint ? `hw-hole-power hw-hole-${powerTint}` : ''}`}
      cx={cx}
      cy={cy}
      r={HOLE_R}
      fill={fill}
      stroke={stroke}
      strokeWidth={category === 'idle' ? 0 : 1.6}
      onMouseEnter={() => onEnter(id)}
      onMouseLeave={onLeave}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      <title>{`${id}  →  节点 ${nodeLabel}`}</title>
    </circle>
  );
}

export const HoleView = memo(HoleViewInner);
