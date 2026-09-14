import { Device } from '../../engine/types';
import { BUTTON_H, BUTTON_R, BUTTON_W } from './shapes';

/** Button 器件：圆角矩形，按住时有"按下"视觉效果 */
export function ButtonDevice({ device }: { device: Device }) {
  const pressed = device.state.pressed === true;
  return (
    <g transform={pressed ? 'translate(0, 2)' : undefined}>
      <rect
        x={0}
        y={0}
        width={BUTTON_W}
        height={BUTTON_H}
        rx={BUTTON_R}
        className="dev-body"
        fill={pressed ? '#3d4a5d' : undefined}
      />
      <text x={BUTTON_W / 2} y={BUTTON_H / 2 + 3.5} textAnchor="middle" className="dev-label">
        BUTTON
      </text>
    </g>
  );
}
