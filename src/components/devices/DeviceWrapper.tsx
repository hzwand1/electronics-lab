import { useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import { Device, GRID_SIZE, DEVICE_META } from '../../engine/types';
import { useCircuitStore } from '../../store/circuitStore';
import { useUIStore } from '../../store/uiStore';
import { CanvasApiContext } from '../CanvasApiContext';
import { PortDot } from './PortDot';

interface DeviceWrapperProps {
  device: Device;
  children: ReactNode;
}

interface DragState {
  sx: number;
  sy: number;
  offX: number;
  offY: number;
  moved: boolean;
}

/**
 * 通用器件外壳：位置变换、Pointer Events 拖拽移动、选中状态、端口渲染。
 * 一次完整拖拽只产生一条 Undo 历史（beginDeviceDrag → moveDevice → endDeviceDrag）。
 */
export function DeviceWrapper({ device, children }: DeviceWrapperProps) {
  const { getCanvasPoint } = useContext(CanvasApiContext);
  const selected = useUIStore((s) => s.selectedDeviceId === device.id);
  const selectDevice = useUIStore((s) => s.selectDevice);
  const groupRef = useRef<SVGGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const meta = DEVICE_META[device.type];

  const pressButton = (pressed: boolean) => {
    useCircuitStore.getState().setDeviceState(device.id, { pressed }, false);
  };

  const cleanup = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    useCircuitStore.getState().endDeviceDrag(device.id);
    if (device.type === 'button') pressButton(false);
  };

  return (
    <g
      ref={groupRef}
      className={selected ? 'device dev-selected' : 'device'}
      transform={`translate(${device.position.x * GRID_SIZE}, ${device.position.y * GRID_SIZE})`}
      style={{ cursor: 'grab' }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        groupRef.current?.setPointerCapture(e.pointerId);
        selectDevice(device.id);
        useCircuitStore.getState().beginDeviceDrag(device.id);
        const p = getCanvasPoint(e.clientX, e.clientY);
        dragRef.current = {
          sx: e.clientX,
          sy: e.clientY,
          offX: device.position.x * GRID_SIZE - p.x,
          offY: device.position.y * GRID_SIZE - p.y,
          moved: false,
        };
        if (device.type === 'button') pressButton(true);
      }}
      onPointerMove={(e) => {
        const d = dragRef.current;
        if (!d) return;
        if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) {
          d.moved = true;
          // 拖拽开始后按钮不再视为"按住"
          if (device.type === 'button') pressButton(false);
        }
        if (d.moved) {
          const p = getCanvasPoint(e.clientX, e.clientY);
          const gx = Math.round((p.x + d.offX) / GRID_SIZE);
          const gy = Math.round((p.y + d.offY) / GRID_SIZE);
          useCircuitStore.getState().moveDevice(device.id, { x: gx, y: gy });
        }
      }}
      onPointerUp={(e) => {
        const d = dragRef.current;
        if (!d) return;
        const moved = d.moved;
        dragRef.current = null;
        try {
          groupRef.current?.releasePointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
        useCircuitStore.getState().endDeviceDrag(device.id);
        if (!moved && device.type === 'button') pressButton(false);
        if (!moved && device.type === 'switch') {
          const nextOn = !(device.state.on === true);
          useCircuitStore.getState().setDeviceState(device.id, { on: nextOn }, true);
        }
      }}
      onPointerCancel={cleanup}
      onLostPointerCapture={cleanup}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        selectDevice(device.id);
        useUIStore
          .getState()
          .setContextMenu({ x: e.clientX, y: e.clientY, kind: 'device', id: device.id });
      }}
    >
      {selected && (
        <rect
          x={-3}
          y={-3}
          width={meta.width + 6}
          height={meta.height + 6}
          rx={7}
          fill="none"
          stroke="#2196F3"
          strokeWidth={1.6}
        />
      )}
      {children}
      {meta.ports.map((pm) => {
        const port = device.ports.find((p) => p.name === pm.name);
        if (!port) return null;
        return (
          <g key={port.id} transform={`translate(${pm.dx}, ${pm.dy})`}>
            <PortDot deviceId={device.id} port={port} />
          </g>
        );
      })}
    </g>
  );
}
