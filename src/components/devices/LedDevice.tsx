import { Device } from '../../engine/types';
import { LED_CORE_R, LED_CX, LED_CY, LED_GLOW_R, LED_R } from './shapes';

/** LED 器件：输入端口值决定亮 / 灭 / 未定义（X） */
export function LedDevice({ device }: { device: Device }) {
  const inPort = device.ports.find((p) => p.direction === 'in');
  const value = inPort?.value ?? 'X';
  const on = value === 1;
  const undef = value === 'X';

  let fill = '#4a2b2e';
  if (on) fill = '#ff5252';
  if (undef) fill = '#4a4f59';

  return (
    <g>
      {on && <circle cx={LED_CX} cy={LED_CY} r={LED_GLOW_R} fill="rgba(244,67,54,0.28)" />}
      <circle cx={LED_CX} cy={LED_CY} r={LED_R} fill={fill} stroke="#0d1117" strokeWidth={1.5} opacity={undef ? 0.55 : 1} />
      {on && <circle cx={LED_CX} cy={LED_CY} r={LED_CORE_R} fill="#ffd2d2" />}
      <text x={LED_CX} y={37} textAnchor="middle" className="dev-label">
        LED
      </text>
    </g>
  );
}
