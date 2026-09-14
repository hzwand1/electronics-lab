import { Device } from '../../engine/types';
import { NOT_BUBBLE_CX, NOT_BUBBLE_CY, NOT_BUBBLE_R, NOT_PATH } from './shapes';

export function NotDevice({ device }: { device: Device }) {
  void device;
  return (
    <g>
      <path d={NOT_PATH} className="dev-body" />
      <circle
        cx={NOT_BUBBLE_CX}
        cy={NOT_BUBBLE_CY}
        r={NOT_BUBBLE_R}
        fill="none"
        stroke="#9aa4b5"
        strokeWidth={1.5}
      />
      <text x={10} y={14} textAnchor="middle" className="dev-label" style={{ fontSize: 7.5 }}>
        NOT
      </text>
    </g>
  );
}
