import { Device } from '../../engine/types';
import { AND_PATH } from './shapes';

export function AndDevice({ device }: { device: Device }) {
  void device;
  return (
    <g>
      <path d={AND_PATH} className="dev-body" />
      <text x={22} y={53} textAnchor="middle" className="dev-label">
        AND
      </text>
    </g>
  );
}
