import { Device } from '../../engine/types';
import {
  SWITCH_KNOB_CY,
  SWITCH_KNOB_OFF_CX,
  SWITCH_KNOB_ON_CX,
  SWITCH_KNOB_R,
  SWITCH_TRACK_H,
  SWITCH_TRACK_R,
  SWITCH_TRACK_W,
  SWITCH_TRACK_X,
  SWITCH_TRACK_Y,
} from './shapes';

/** Switch 器件：拨动开关，on/off 状态颜色区分 */
export function SwitchDevice({ device }: { device: Device }) {
  const on = device.state.on === true;
  const knobCx = on ? SWITCH_KNOB_ON_CX : SWITCH_KNOB_OFF_CX;
  return (
    <g>
      <rect
        x={SWITCH_TRACK_X}
        y={SWITCH_TRACK_Y}
        width={SWITCH_TRACK_W}
        height={SWITCH_TRACK_H}
        rx={SWITCH_TRACK_R}
        fill={on ? '#24455f' : '#323a49'}
        stroke={on ? '#4fc3f7' : '#5c6675'}
        strokeWidth={1.2}
      />
      <circle
        cx={knobCx}
        cy={SWITCH_KNOB_CY}
        r={SWITCH_KNOB_R}
        fill={on ? '#4fc3f7' : '#8a93a5'}
        stroke="#0d1117"
        strokeWidth={1}
      />
      <text x={30} y={8} textAnchor="middle" className="dev-label" style={{ fontSize: 7.5 }}>
        SWITCH
      </text>
    </g>
  );
}
