import { useContext } from 'react';
import { Port } from '../../engine/types';
import { useCircuitStore } from '../../store/circuitStore';
import { useUIStore } from '../../store/uiStore';
import { CanvasApiContext } from '../CanvasApiContext';

interface PortDotProps {
  deviceId: string;
  port: Port;
}

/**
 * 通用端口圆点：颜色（未连接/0/1/X/错误）、hover、连线交互。
 * 输出端口 pointerdown 开始连线；输入端口 pointerup 完成连线。
 */
export function PortDot({ deviceId, port }: PortDotProps) {
  const { getCanvasPoint } = useContext(CanvasApiContext);
  const hasWire = useCircuitStore((s) => s.circuit.wires.some((w) => w.to.portId === port.id));
  const errorPortId = useUIStore((s) => s.errorPortId);
  const pendingWire = useUIStore((s) => s.pendingWire);
  const hoverPort = useUIStore((s) => s.hoverPort);

  const isError = errorPortId === port.id;
  const isPendingTarget = port.direction === 'in' && pendingWire !== null;
  const isHovered = hoverPort?.portId === port.id;

  let fill = '#7d8590';
  let opacity = 1;
  let glow = false;
  if (isError) {
    fill = '#e53935';
  } else if (port.direction === 'in' && !hasWire) {
    fill = '#7d8590'; // 未连接（悬空）
  } else if (port.value === 1) {
    fill = '#f44336';
    glow = true;
  } else if (port.value === 0) {
    fill = '#2196F3';
  } else {
    fill = '#7d8590';
    opacity = 0.45; // 上游未定义（X）
  }

  const r = isError || isHovered || isPendingTarget ? 7 : 5;

  return (
    <g
      transform={`translate(${port.direction === 'out' ? 0 : 0}, 0)`}
      style={{ cursor: port.direction === 'out' ? 'crosshair' : 'pointer' }}
      onPointerDown={(e) => {
        if (port.direction !== 'out') return;
        e.stopPropagation();
        e.preventDefault();
        const pos = getCanvasPoint(e.clientX, e.clientY);
        useUIStore.getState().setPendingWire({
          from: { deviceId, portId: port.id },
          toMousePos: pos,
        });
      }}
      onPointerUp={(e) => {
        if (port.direction !== 'in') return;
        e.stopPropagation();
        const pending = useUIStore.getState().pendingWire;
        if (!pending) return;
        useUIStore.getState().setPendingWire(null);
        const res = useCircuitStore.getState().addWire(pending.from, {
          deviceId,
          portId: port.id,
        });
        if (!res.success) {
          const ui = useUIStore.getState();
          ui.setErrorPortId(port.id);
          ui.showToast(res.error ?? '无法连接', 'error');
          window.setTimeout(() => {
            if (useUIStore.getState().errorPortId === port.id) {
              useUIStore.getState().setErrorPortId(null);
            }
          }, 2000);
        }
      }}
      onPointerEnter={() => {
        useUIStore.getState().setHoverPort({ deviceId, portId: port.id });
      }}
      onPointerLeave={() => {
        useUIStore.getState().setHoverPort(null);
      }}
    >
      {glow && <circle r={r + 4} fill="rgba(244,67,54,0.35)" />}
      <circle r={10} fill="transparent" />
      <circle
        r={r}
        fill={fill}
        opacity={opacity}
        stroke={isError ? '#ff8a80' : '#0d1117'}
        strokeWidth={1}
      />
      {isPendingTarget && (
        <circle r={r + 3} fill="none" stroke="#2196F3" strokeWidth={1.2} strokeDasharray="2 2" />
      )}
    </g>
  );
}
