import { Device } from '../../engine/types';
import { XOR_INNER, XOR_PATH } from './shapes';

export function XorDevice({ device }: { device: Device }) {
  void device;
  return (
    <g>
      <path d={XOR_PATH} className="dev-body" />
      <path d={XOR_INNER} fill="none" stroke="#9aa4b5" strokeWidth={1.3} />
      <text x={22} y={53} textAnchor="middle" className="dev-label">
        XOR
      </text>
    </g>
  );
}
