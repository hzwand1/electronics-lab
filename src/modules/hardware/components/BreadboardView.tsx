/**
 * Hardware Lab — 面包板视图（阶段 1）
 *
 * 交互：
 *  - 悬停孔：高亮当前孔 + 同一电气节点的所有孔（O(1) 查表，不重算整板）
 *  - 点击一个孔作为导线起点，再点另一个节点的孔完成 Node ↔ Node 连接
 *  - 同节点点击 = 无操作；重复连接不创建
 *  - 点击导线选中，Delete/Backspace 删除；空白处取消选择/起点
 *  - 滚轮缩放，滚动条平移
 *
 * 性能：孔组件 React.memo；hover 只改变相关节点（终端 5 孔 / 电源 25 孔）。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHardwareStore } from '../store/hardwareStore';
import { BreadboardHole } from '../types/hardwareTypes';
import { HoleView, HoleCategory } from './HoleView';

const PAD_X = 54;
const PAD_Y = 46;
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.2;

interface PendingStart {
  holeId: string;
  nodeId: string;
}

function manhattanPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = Math.round((x1 + x2) / 2);
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
}

export function BreadboardView() {
  const breadboard = useHardwareStore((s) => s.breadboard);
  const index = useHardwareStore((s) => s.index);
  const wires = useHardwareStore((s) => s.wires);
  const addWireByHoles = useHardwareStore((s) => s.addWireByHoles);
  const removeWire = useHardwareStore((s) => s.removeWire);
  const clearWires = useHardwareStore((s) => s.clearWires);

  const { layout } = breadboard;
  const pitch = layout.pitch;

  // 世界/视口尺寸
  const worldW = 17 * pitch; // 列 0~16
  const worldH = layout.rowCount * pitch;
  const svgW = worldW + PAD_X * 2;
  const svgH = worldH + PAD_Y * 2;

  // === 纯 UI 临时状态（不进 store、不持久化）===
  const [hoverHoleId, setHoverHoleId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingStart | null>(null);
  const [mouseWorld, setMouseWorld] = useState<{ x: number; y: number } | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  const pendingRef = useRef<PendingStart | null>(null);
  pendingRef.current = pending;
  const msgTimer = useRef<number | null>(null);

  const flash = useCallback((text: string) => {
    setMessage(text);
    if (msgTimer.current) window.clearTimeout(msgTimer.current);
    msgTimer.current = window.setTimeout(() => setMessage(null), 1800);
  }, []);

  // 孔按种类分组（只计算一次）
  const { terminalHoles, powerHoles } = useMemo(() => {
    const terminal: BreadboardHole[] = [];
    const power: BreadboardHole[] = [];
    for (const h of breadboard.holes) (h.kind === 'power' ? power : terminal).push(h);
    return { terminalHoles: terminal, powerHoles: power };
  }, [breadboard.holes]);

  const hoverNodeId = hoverHoleId ? index.holeToNode.get(hoverHoleId) ?? null : null;
  const pendingNodeId = pending?.nodeId ?? null;

  // 当前高亮节点的孔集合（最多 5 / 25 个）
  const hoverSet = useMemo(
    () => (hoverNodeId ? new Set(index.nodeToHoles.get(hoverNodeId)) : null),
    [hoverNodeId, index.nodeToHoles],
  );
  const pendingSet = useMemo(
    () => (pendingNodeId ? new Set(index.nodeToHoles.get(pendingNodeId)) : null),
    [pendingNodeId, index.nodeToHoles],
  );

  const categoryFor = useCallback(
    (hole: BreadboardHole): HoleCategory => {
      if (pendingSet) {
        if (pendingNodeId && hole.nodeId === pendingNodeId) {
          return pending && hole.id === pending.holeId ? 'start' : 'self';
        }
        if (hoverSet && hoverNodeId && hole.nodeId === hoverNodeId) {
          return hole.id === hoverHoleId ? 'hover' : 'valid';
        }
        return 'idle';
      }
      if (hoverSet && hoverNodeId && hole.nodeId === hoverNodeId) {
        return hole.id === hoverHoleId ? 'hover' : 'node';
      }
      return 'idle';
    },
    [pendingSet, pending, pendingNodeId, hoverSet, hoverNodeId, hoverHoleId],
  );

  // === 稳定回调（供 memo 孔使用）===
  const handleEnter = useCallback((id: string) => setHoverHoleId(id), []);
  const handleLeave = useCallback(() => setHoverHoleId(null), []);

  const handleHoleSelect = useCallback(
    (holeId: string) => {
      const nodeId = index.holeToNode.get(holeId);
      if (!nodeId) return;
      const start = pendingRef.current;

      if (!start) {
        setPending({ holeId, nodeId });
        return;
      }

      // 完成连接
      if (start.nodeId === nodeId) {
        flash('同一电气节点，无需连接');
      } else {
        const status = addWireByHoles(start.holeId, holeId);
        if (status === 'created') flash('已建立节点连接');
        else if (status === 'duplicate') flash('该节点连接已存在');
        else if (status === 'invalid-hole') flash('无效的孔');
      }
      setPending(null);
      setSelectedWireId(null);
    },
    [index.holeToNode, addWireByHoles, flash],
  );

  // Esc 取消起点；Delete 删除选中导线
  const keyHandlersRef = useRef({ removeWire, selectedWireId });
  keyHandlersRef.current = { removeWire, selectedWireId };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') setPending(null);
      if ((e.key === 'Delete' || e.key === 'Backspace') && keyHandlersRef.current.selectedWireId) {
        e.preventDefault();
        keyHandlersRef.current.removeWire(keyHandlersRef.current.selectedWireId);
        setSelectedWireId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 鼠标移动：换算世界坐标用于导线预览
  const svgRef = useRef<SVGSVGElement | null>(null);
  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!pendingRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setMouseWorld({
      x: (e.clientX - rect.left) / zoom - PAD_X,
      y: (e.clientY - rect.top) / zoom - PAD_Y,
    });
  }, [zoom]);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    // 仅在按住 Ctrl 或直接在板体上滚动时缩放；普通滚动保留给页面滚动条
    setZoom((z) => {
      const next = e.deltaY < 0 ? z * 1.08 : z / 1.08;
      return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(next.toFixed(3))));
    });
  }, []);

  // 导线预览起点坐标
  const previewStart = pending
    ? index.holeById.get(pending.holeId)?.position ?? null
    : null;

  const columnLabels = useMemo(() => {
    const labels: { col: string; x: number }[] = [];
    for (const col of layout.leftTerminalColumns) labels.push({ col, x: layout.columnX[col] * pitch });
    for (const col of layout.rightTerminalColumns) labels.push({ col, x: layout.columnX[col] * pitch });
    return labels;
  }, [layout, pitch]);

  return (
    <div className="hw-board-scroll">
      <div className="hw-toolbar">
        <span className="hw-toolbar-hint">
          {pending
            ? '起点已选：再点击另一个节点的孔完成连接（Esc 取消）'
            : '点击一个孔开始连线；悬停查看同一电气节点'}
        </span>
        <div className="hw-toolbar-actions">
          <button onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z / 1.15).toFixed(2)))}>－</button>
          <span className="hw-zoom-label">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z * 1.15).toFixed(2)))}>＋</button>
          <button onClick={() => setZoom(1)}>复位</button>
          <button
            className="hw-clear-btn"
            onClick={() => {
              clearWires();
              setSelectedWireId(null);
            }}
          >
            清空导线
          </button>
        </div>
      </div>

      <div className="hw-canvas-inner" style={{ width: svgW * zoom, height: svgH * zoom }}>
        <svg
          ref={svgRef}
          width={svgW * zoom}
          height={svgH * zoom}
          viewBox={`0 0 ${svgW} ${svgH}`}
          onMouseMove={handleSvgMouseMove}
          onWheel={handleWheel}
          onMouseDown={() => {
            setSelectedWireId(null);
            setPending(null);
          }}
        >
          <g transform={`translate(${PAD_X}, ${PAD_Y})`}>
            {/* 板体 */}
            <rect x={-16} y={-16} width={worldW + 32} height={worldH + 32} rx={10} className="hw-board-body" />

            {/* 电源轨色带（分段，默认上下不连通） */}
            {breadboard.powerRails.map((rail) =>
              rail.segments.map((seg) => {
                const first = index.holeById.get(seg.holeIds[0]);
                if (!first) return null;
                return (
                  <rect
                    key={seg.id}
                    x={first.position.x - 9}
                    y={(seg.rowStart - 1) * pitch - 7}
                    width={18}
                    height={(seg.rowEnd - seg.rowStart + 1) * pitch + 14}
                    rx={4}
                    className={`hw-rail-band hw-rail-${rail.type}`}
                  />
                );
              }),
            )}

            {/* 中央沟槽 */}
            <rect x={7 * pitch + pitch / 2 + 1} y={-16} width={pitch - 2} height={worldH + 32} className="hw-groove" />

            {/* 列标签 */}
            {columnLabels.map(({ col, x }) => (
              <text key={col} x={x} y={-26} className="hw-col-label" textAnchor="middle">
                {col}
              </text>
            ))}
            {/* 电源轨符号标签 */}
            <text x={layout.columnX['L-3V3'] * pitch} y={-26} className="hw-rail-label hw-rail-3v3" textAnchor="middle">+</text>
            <text x={layout.columnX['L-GND'] * pitch} y={-26} className="hw-rail-label hw-rail-gnd" textAnchor="middle">−</text>
            <text x={layout.columnX['R-3V3'] * pitch} y={-26} className="hw-rail-label hw-rail-3v3" textAnchor="middle">+</text>
            <text x={layout.columnX['R-GND'] * pitch} y={-26} className="hw-rail-label hw-rail-gnd" textAnchor="middle">−</text>

            {/* 行号（每 5 行） */}
            {Array.from({ length: layout.rowCount }, (_, i) => i + 1)
              .filter((r) => r % 5 === 0 || r === 1)
              .map((r) => (
                <text key={r} x={-26} y={(r - 1) * pitch + 4} className="hw-row-label" textAnchor="middle">
                  {r}
                </text>
              ))}

            {/* 导线层 */}
            <g>
              {wires.map((wire) => {
                const a = index.holeById.get(wire.startHoleId)?.position;
                const b = index.holeById.get(wire.endHoleId)?.position;
                if (!a || !b) return null;
                const selected = wire.id === selectedWireId;
                return (
                  <path
                    key={wire.id}
                    d={manhattanPath(a.x, a.y, b.x, b.y)}
                    className={`hw-wire ${selected ? 'hw-wire-selected' : ''}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setPending(null);
                      setSelectedWireId(wire.id);
                    }}
                  >
                    <title>{`${wire.startNodeId}  ↔  ${wire.endNodeId}（点击选中，Delete 删除）`}</title>
                  </path>
                );
              })}
            </g>

            {/* 导线预览 */}
            {pending && previewStart && mouseWorld && (
              <path
                d={manhattanPath(previewStart.x, previewStart.y, mouseWorld.x, mouseWorld.y)}
                className="hw-wire-preview"
              />
            )}

            {/* 孔层：电源孔 + 终端孔 */}
            <g>
              {powerHoles.map((hole) => (
                <HoleView
                  key={hole.id}
                  id={hole.id}
                  cx={hole.position.x}
                  cy={hole.position.y}
                  category={categoryFor(hole)}
                  powerTint={hole.col === '3V3' ? '3v3' : 'gnd'}
                  nodeLabel={hole.nodeId}
                  onEnter={handleEnter}
                  onLeave={handleLeave}
                  onSelect={handleHoleSelect}
                />
              ))}
              {terminalHoles.map((hole) => (
                <HoleView
                  key={hole.id}
                  id={hole.id}
                  cx={hole.position.x}
                  cy={hole.position.y}
                  category={categoryFor(hole)}
                  nodeLabel={hole.nodeId}
                  onEnter={handleEnter}
                  onLeave={handleLeave}
                  onSelect={handleHoleSelect}
                />
              ))}
            </g>
          </g>
        </svg>
      </div>

      {message && <div className="hw-flash-msg">{message}</div>}
    </div>
  );
}
