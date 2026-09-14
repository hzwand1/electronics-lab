import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Circuit, Device, DEVICE_META, GRID_SIZE } from '../engine/types';
import { useCircuitStore } from '../store/circuitStore';
import { useUIStore } from '../store/uiStore';
import { CanvasApiContext } from './CanvasApiContext';
import { DeviceView } from './devices/DeviceView';

/** 端口绝对逻辑坐标（px） */
function portAbsPos(device: Device | undefined, portId: string): { x: number; y: number } | null {
  if (!device) return null;
  const port = device.ports.find((p) => p.id === portId);
  if (!port) return null;
  const meta = DEVICE_META[device.type].ports.find((m) => m.name === port.name);
  if (!meta) return null;
  return {
    x: device.position.x * GRID_SIZE + meta.dx,
    y: device.position.y * GRID_SIZE + meta.dy,
  };
}

/**
 * Manhattan 直角折线路由（V0.1 不做自动避障）。
 * 正常（输出在输入左侧）：三段折线；反向：U 形绕路。
 */
function manhattanPath(x1: number, y1: number, x2: number, y2: number): string {
  if (x1 < x2) {
    const xMid = (x1 + x2) / 2;
    return `M ${x1} ${y1} L ${xMid} ${y1} L ${xMid} ${y2} L ${x2} ${y2}`;
  }
  const offset = 30;
  const yMid = (y1 + y2) / 2;
  return `M ${x1} ${y1} L ${x1 + offset} ${y1} L ${x1 + offset} ${yMid} L ${x2 - offset} ${yMid} L ${x2 - offset} ${y2} L ${x2} ${y2}`;
}

function WireView({ circuit, wireId }: { circuit: Circuit; wireId: string }) {
  const wire = circuit.wires.find((w) => w.id === wireId);
  const selected = useUIStore((s) => s.selectedWireId === wireId);
  const selectWire = useUIStore((s) => s.selectWire);
  const [hovered, setHovered] = useState(false);
  if (!wire) return null;

  const fromDev = circuit.devices.find((d) => d.id === wire.from.deviceId);
  const toDev = circuit.devices.find((d) => d.id === wire.to.deviceId);
  const p1 = portAbsPos(fromDev, wire.from.portId);
  const p2 = portAbsPos(toDev, wire.to.portId);
  if (!p1 || !p2) return null;
  const d = manhattanPath(p1.x, p1.y, p2.x, p2.y);

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={selected ? '#2196F3' : hovered ? '#9aa4b5' : '#5c6675'}
        strokeWidth={selected ? 3 : hovered ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        pointerEvents="stroke"
        style={{ cursor: 'pointer' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          selectWire(wire.id);
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          selectWire(wire.id);
          useUIStore
            .getState()
            .setContextMenu({ x: e.clientX, y: e.clientY, kind: 'wire', id: wire.id });
        }}
      />
    </g>
  );
}

export function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const circuit = useCircuitStore((s) => s.circuit);
  const panOffset = useUIStore((s) => s.panOffset);
  const zoom = useUIStore((s) => s.zoom);
  const pendingWire = useUIStore((s) => s.pendingWire);
  const panRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const { panOffset: pan, zoom: z } = useUIStore.getState();
    return { x: (clientX - rect.left - pan.x) / z, y: (clientY - rect.top - pan.y) / z };
  }, []);

  const api = useMemo(() => ({ getCanvasPoint }), [getCanvasPoint]);

  // 滚轮缩放：原生非 passive 监听，以鼠标位置为中心（0.25 ~ 4.0）
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const st = useUIStore.getState();
      const factor = Math.exp(-e.deltaY * 0.0015);
      const newZoom = Math.min(4, Math.max(0.25, st.zoom * factor));
      const k = newZoom / st.zoom;
      st.setZoom(newZoom);
      st.setPanOffset({
        x: mx - (mx - st.panOffset.x) * k,
        y: my - (my - st.panOffset.y) * k,
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const handlePointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const st = useUIStore.getState();
    st.selectDevice(null);
    st.selectWire(null);
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: st.panOffset.x, oy: st.panOffset.y };
    st.setIsPanning(true);
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    const st = useUIStore.getState();
    if (st.isPanning && panRef.current) {
      st.setPanOffset({
        x: panRef.current.ox + (e.clientX - panRef.current.sx),
        y: panRef.current.oy + (e.clientY - panRef.current.sy),
      });
    }
    if (st.pendingWire) {
      st.setPendingWire({ ...st.pendingWire, toMousePos: getCanvasPoint(e.clientX, e.clientY) });
    }
  };

  const handlePointerUp = () => {
    panRef.current = null;
    const st = useUIStore.getState();
    st.setIsPanning(false);
    if (st.pendingWire) st.setPendingWire(null);
  };

  const deviceMap = useMemo(() => new Map(circuit.devices.map((d) => [d.id, d])), [circuit.devices]);

  let pendingPath: string | null = null;
  if (pendingWire) {
    const fromDev = deviceMap.get(pendingWire.from.deviceId);
    const p1 = portAbsPos(fromDev, pendingWire.from.portId);
    if (p1) {
      pendingPath = manhattanPath(p1.x, p1.y, pendingWire.toMousePos.x, pendingWire.toMousePos.y);
    }
  }

  return (
    <CanvasApiContext.Provider value={api}>
      <svg
        ref={svgRef}
        className="canvas"
        style={{ cursor: 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          useUIStore.getState().setContextMenu(null);
        }}
      >
        <defs>
          <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#262b34" strokeWidth={0.6} />
          </pattern>
        </defs>
        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
          {/* 网格层 */}
          <rect x={-6000} y={-6000} width={20000} height={20000} fill="url(#grid)" />
          {/* 连线层（器件下方，避免盖住端口） */}
          <g>
            {circuit.wires.map((w) => (
              <WireView key={w.id} circuit={circuit} wireId={w.id} />
            ))}
          </g>
          {/* 临时连线预览层 */}
          {pendingPath && (
            <path
              d={pendingPath}
              fill="none"
              stroke="#2196F3"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.85}
            />
          )}
          {/* 器件层 */}
          <g>
            {circuit.devices.map((d) => (
              <DeviceView key={d.id} device={d} />
            ))}
          </g>
        </g>
      </svg>
    </CanvasApiContext.Provider>
  );
}
