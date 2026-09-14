import { Device } from '../../engine/types';
import { OR_PATH } from './shapes';

export function OrDevice({ device }: { device: Device }) {
  void device;
  return (
    <g>
      <path d={OR_PATH} className="dev-body" />
      <text x={22} y={53} textAnchor="middle" className="dev-label">
        OR
      </text>
    </g>
  );
}
