/**
 * Hardware Lab — 面包板视图（S2-2：Component UI 基础层）
 *
 * Stage 1 交互（完整保留）：
 *  - 悬停孔：高亮当前孔 + 同一电气节点的所有孔（O(1) 查表，不重算整板）
 *  - 点击一个孔作为导线起点，再点另一个节点的孔完成 Node ↔ Node 连接
 *  - 同节点点击 = 无操作；重复连接不创建
 *  - 左键点击导线选中，Delete/Backspace 删除；右键导线打开上下文菜单（属性/删除）
 *  - "清空导线"需二次确认；空白左键取消选择/起点，空白右键不弹浏览器菜单
 *  - 鼠标在面包板区域滚动滚轮即缩放（无需 Ctrl），滚动条平移
 *
 * S2-2 新增：
 *  - Parts Library 选择 Generic Component → placement 模式 → 空白点击放置
 *  - 元件选择（点击主体或 Pin 均选中所属 Component）
 *  - 元件拖拽移动（只改 position，绝不改变 pins.nodeId）
 *  - R 键旋转选中元件（只改 rotation）
 *  - Delete / Backspace / 右键菜单删除元件
 *  - 元件右键菜单（删除元件；属性面板留待 S2-10）
 *
 * 性能：孔组件 React.memo；hover 只改变相关节点（终端 5 孔 / 电源 25 孔）。
 * 元件渲染在同一 <g transform> 组内，自动跟随缩放，无需第二套坐标系统。
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHardwareStore } from '../store/hardwareStore';
import { BreadboardHole } from '../types/hardwareTypes';
import type { ComponentType } from '../types/componentTypes';
import { HoleView, HoleCategory } from './HoleView';
import { WireContextMenu } from './WireContextMenu';
import { WirePropertiesPanel } from './WirePropertiesPanel';
import { ConfirmClearDialog } from './ConfirmClearDialog';
import { GenericComponent } from './GenericComponent';
import { ComponentContextMenu } from './ComponentContextMenu';
import {
  initialOverlays,
  overlaysReducer,
} from '../ui/hardwareOverlays';

const PAD_X = 54;
const PAD_Y = 46;
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.2;

interface PendingStart {
  holeId: string;
  nodeId: string;
}

interface BreadboardViewProps {
  /** 当前 placement 模式的元件类型；null = 正常模式 */
  placementType: ComponentType | null;
  /** placement 完成或取消时回调（由 HardwareLab 重置 placementType） */
  onPlacementDone: () => void;
}

function manhattanPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = Math.round((x1 + x2) / 2);
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
}

export function BreadboardView({ placementType, onPlacementDone }: BreadboardViewProps) {
  const breadboard = useHardwareStore((s) => s.breadboard);
  const index = useHardwareStore((s) => s.index);
  const wires = useHardwareStore((s) => s.wires);
  const components = useHardwareStore((s) => s.components);
  const addWireByHoles = useHardwareStore((s) => s.addWireByHoles);
  const removeWire = useHardwareStore((s) => s.removeWire);
  const clearWires = useHardwareStore((s) => s.clearWires);
  const addComponent = useHardwareStore((s) => s.addComponent);
  const removeComponent = useHardwareStore((s) => s.removeComponent);
  const moveComponent = useHardwareStore((s) => s.moveComponent);
  const rotateComponent = useHardwareStore((s) => s.rotateComponent);

  const { layout } = breadboard;
  const pitch = layout.pitch;

  // 世界/视口尺寸
  const worldW = 17 * pitch; // 列 0~16
  const worldH = layout.rowCount * pitch;
  const svgW = worldW + PAD_X * 2;
  const svgH = worldH + PAD_Y * 2;

  // === 纯 UI 临时状态（不进 store、不持久化）===
  // 覆盖层（选中 / 右键菜单 / 属性 / 清空确认）走纯 TS reducer，逻辑可单测
  const [overlays, dispatch] = useReducer(overlaysReducer, initialOverlays);
  const [hoverHoleId, setHoverHoleId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingStart | null>(null);
  const [mouseWorld, setMouseWorld] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  // S2-2：正在拖拽的元件 id
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const pendingRef = useRef<PendingStart | null>(null);
  pendingRef.current = pending;
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;
  const menuRef = useRef<HTMLDivElement | null>(null);
  const msgTimer = useRef<number | null>(null);
  // S2-2 refs
  const draggingRef = useRef<string | null>(null);
  draggingRef.current = draggingId;
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const placementTypeRef = useRef(placementType);
  placementTypeRef.current = placementType;
  const onPlacementDoneRef = useRef(onPlacementDone);
  onPlacementDoneRef.current = onPlacementDone;
  const selectedComponentIdRef = useRef<string | null>(null);
  selectedComponentIdRef.current = overlays.selectedComponentId;

  const flash = useCallback((text: string) => {
    setMessage(text);
    if (msgTimer.current) window.clearTimeout(msgTimer.current);
    msgTimer.current = window.setTimeout(() => setMessage(null), 1800);
  }, []);

  // 所有删除入口最终统一走这一个函数：只确定 wireId，真正删除统一由 Store.removeWire 完成
  const deleteWire = useCallback(
    (wireId: string) => {
      removeWire(wireId);
      dispatch({ type: 'onWireDeleted', wireId });
    },
    [removeWire],
  );

  // S2-2：删除元件统一入口（Store.removeComponent + 覆盖层同步）
  const deleteComponent = useCallback(
    (componentId: string) => {
      removeComponent(componentId);
      dispatch({ type: 'onComponentDeleted', componentId });
    },
    [removeComponent],
  );
  const deleteComponentRef = useRef(deleteComponent);
  deleteComponentRef.current = deleteComponent;
  const rotateComponentRef = useRef(rotateComponent);
  rotateComponentRef.current = rotateComponent;

  // 客户端坐标 → 面包板世界坐标（像素，已扣除 PAD，与孔/元件同一坐标系）
  const clientToWorld = useCallback(
    (e: { clientX: number; clientY: number }) => {
      if (!svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / zoom - PAD_X,
        y: (e.clientY - rect.top) / zoom - PAD_Y,
      };
    },
    [zoom],
  );

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
      // 任何连线主操作都关闭右键菜单；不影响 pending 的既有判断
      dispatch({ type: 'closeContextMenu' });
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
      dispatch({ type: 'clearSelection' });
    },
    [index.holeToNode, addWireByHoles, flash],
  );

  // S2-2：元件鼠标按下 —— 选中 + 开始拖拽（记录鼠标相对元件左上角的偏移）
  const handleComponentMouseDown = useCallback(
    (componentId: string, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      dispatch({ type: 'selectComponent', componentId });
      dispatch({ type: 'closeContextMenu' });
      setPending(null);
      const world = clientToWorld(e);
      if (!world) return;
      const comp = components.find((c) => c.id === componentId);
      if (!comp) return;
      dragOffsetRef.current = {
        x: world.x - comp.position.x * pitch,
        y: world.y - comp.position.y * pitch,
      };
      // 同步设置 ref，避免 React 异步渲染导致首次 mousemove 时 draggingRef 仍为 null
      draggingRef.current = componentId;
      setDraggingId(componentId);
    },
    [components, pitch, clientToWorld],
  );

  // S2-2：元件右键 —— 阻止浏览器默认菜单，打开元件上下文菜单
  const handleComponentContextMenu = useCallback(
    (componentId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch({
        type: 'openComponentMenu',
        componentId,
        pos: { x: e.clientX, y: e.clientY },
      });
    },
    [],
  );

  // S2-2：元件拖拽 —— window 级 mousemove/mouseup（避免 SVG 元素丢失鼠标捕获）
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const world = clientToWorld(e);
      if (!world) return;
      const gridX = (world.x - dragOffsetRef.current.x) / pitch;
      const gridY = (world.y - dragOffsetRef.current.y) / pitch;
      moveComponent(draggingRef.current, { x: gridX, y: gridY });
    };
    const onUp = () => {
      if (draggingRef.current) setDraggingId(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [clientToWorld, moveComponent, pitch]);

  // 键盘：Esc 按优先级关闭覆盖层/取消起点/取消 placement；
  // R 旋转选中元件；Delete/Backspace 删除选中元件（优先）或选中导线
  const deleteWireRef = useRef(deleteWire);
  deleteWireRef.current = deleteWire;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const ov = overlaysRef.current;

      if (e.key === 'Escape') {
        if (ov.confirmClear) {
          dispatch({ type: 'cancelClearConfirm' });
        } else if (ov.contextMenu) {
          dispatch({ type: 'closeContextMenu' });
        } else if (ov.wireProperties) {
          dispatch({ type: 'closeWireProperties' });
        } else if (placementTypeRef.current) {
          onPlacementDoneRef.current();
        } else {
          setPending(null);
        }
        return;
      }

      // R 键旋转选中元件
      if (e.key === 'r' || e.key === 'R') {
        if (
          selectedComponentIdRef.current &&
          !ov.confirmClear &&
          !ov.contextMenu &&
          !ov.wireProperties
        ) {
          e.preventDefault();
          rotateComponentRef.current(selectedComponentIdRef.current);
        }
        return;
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        !ov.confirmClear &&
        !ov.contextMenu &&
        !ov.wireProperties
      ) {
        // 元件删除优先于导线删除
        if (selectedComponentIdRef.current) {
          e.preventDefault();
          deleteComponentRef.current(selectedComponentIdRef.current);
        } else if (ov.selectedWireId) {
          e.preventDefault();
          deleteWireRef.current(ov.selectedWireId);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 点击右键菜单之外：关闭菜单（bubble 阶段，菜单内部已 stopPropagation）
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const ov = overlaysRef.current;
      if (!ov.contextMenu) return;
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      dispatch({ type: 'closeContextMenu' });
    };
    window.addEventListener('mousedown', onDocMouseDown);
    return () => window.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  // 鼠标移动：换算世界坐标用于导线预览 / placement ghost
  const svgRef = useRef<SVGSVGElement | null>(null);
  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      // 导线预览或 placement 模式下才需要追踪鼠标世界坐标
      if (!pendingRef.current && !placementTypeRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      setMouseWorld({
        x: (e.clientX - rect.left) / zoom - PAD_X,
        y: (e.clientY - rect.top) / zoom - PAD_Y,
      });
    },
    [zoom],
  );

  // 实际行为：鼠标在面包板 SVG 区域滚动滚轮即缩放（不检查 ctrlKey），范围 0.55~2.2。
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
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

  // 属性面板读取的导线（真实数据来自 Store；找不到则不显示）
  const propsWire = overlays.wireProperties
    ? wires.find((w) => w.id === overlays.wireProperties?.wireId) ?? null
    : null;

  // S2-2：右键菜单当前指向的元件（如果是 component 类型）
  const contextComponentId =
    overlays.contextMenu?.target.kind === 'component'
      ? overlays.contextMenu.target.componentId
      : null;

  return (
    <div className="hw-board-scroll">
      <div className="hw-toolbar">
        <span className="hw-toolbar-hint">
          {pending
            ? '起点已选：再点击另一个节点的孔完成连接（Esc 取消）'
            : placementType
            ? '放置模式：点击面包板空白处放置元件（Esc 取消）'
            : '点击一个孔开始连线；右键导线/元件查看操作；悬停查看同一电气节点'}
        </span>
        <div className="hw-toolbar-actions">
          <button onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z / 1.15).toFixed(2)))}>－</button>
          <span className="hw-zoom-label">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z * 1.15).toFixed(2)))}>＋</button>
          <button onClick={() => setZoom(1)}>复位</button>
          <button
            className="hw-clear-btn"
            onClick={() => dispatch({ type: 'requestClearConfirm' })}
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
          onMouseDown={(e) => {
            // 仅响应左键空白：placement 模式创建元件，否则取消选中与起点、关闭菜单
            if (e.button !== 0) return;
            if (placementType) {
              const world = clientToWorld(e);
              if (world) {
                addComponent(placementType, { x: world.x / pitch, y: world.y / pitch });
                flash('已放置元件');
              }
              onPlacementDone();
              return;
            }
            dispatch({ type: 'clearSelection' });
            dispatch({ type: 'closeContextMenu' });
            setPending(null);
          }}
          onContextMenu={(e) => {
            // 空白区域右键：阻止浏览器默认菜单，关闭自定义菜单，不创建/取消任何连线
            e.preventDefault();
            dispatch({ type: 'closeContextMenu' });
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
                const selected = wire.id === overlays.selectedWireId;
                return (
                  <path
                    key={wire.id}
                    d={manhattanPath(a.x, a.y, b.x, b.y)}
                    className={`hw-wire ${selected ? 'hw-wire-selected' : ''}`}
                    onMouseDown={(e) => {
                      // 仅左键用于选中；右键不改变 pending / selection，交给 onContextMenu
                      if (e.button !== 0) return;
                      e.stopPropagation();
                      setPending(null);
                      dispatch({ type: 'selectWire', wireId: wire.id });
                    }}
                    onContextMenu={(e) => {
                      // 阻止浏览器默认菜单，打开站点自定义菜单（仅打开菜单，不改 pending、不建线）
                      e.preventDefault();
                      e.stopPropagation();
                      dispatch({
                        type: 'openWireMenu',
                        wireId: wire.id,
                        pos: { x: e.clientX, y: e.clientY },
                      });
                    }}
                  >
                    <title>{`${wire.startNodeId}  ↔  ${wire.endNodeId}（左键选中后 Delete 删除，右键更多操作）`}</title>
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
                  placementActive={!!placementType}
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
                  placementActive={!!placementType}
                />
              ))}
            </g>

            {/* S2-2：元件层（在导线和孔之上；拖拽时自动跟随） */}
            <g>
              {components.map((c) => (
                <GenericComponent
                  key={c.id}
                  component={c}
                  selected={overlays.selectedComponentId === c.id}
                  pitch={pitch}
                  onMouseDown={handleComponentMouseDown}
                  onContextMenu={handleComponentContextMenu}
                />
              ))}
            </g>

            {/* S2-2：placement ghost（半透明预览，跟随鼠标） */}
            {placementType && mouseWorld && (
              <g transform={`translate(${mouseWorld.x}, ${mouseWorld.y})`} opacity={0.45}>
                <rect x={0} y={0} width={3 * pitch} height={2 * pitch} rx={4} className="hw-component-ghost" />
                <circle cx={0} cy={pitch} r={5} className="hw-component-pin" />
                <circle cx={3 * pitch} cy={pitch} r={5} className="hw-component-pin" />
              </g>
            )}
          </g>
        </svg>
      </div>

      {message && <div className="hw-flash-msg">{message}</div>}

      {/* 覆盖层：portal 到 body，避免祖先 transform/backdrop-filter 影响 fixed 定位 */}
      {overlays.contextMenu?.target.kind === 'wire' &&
        createPortal(
          <WireContextMenu
            ref={menuRef}
            menu={overlays.contextMenu}
            onProperties={(wireId) => dispatch({ type: 'openWireProperties', wireId })}
            onDelete={deleteWire}
          />,
          document.body,
        )}

      {/* S2-2：元件右键菜单（与导线菜单共用 menuRef，同时至多一个） */}
      {contextComponentId &&
        overlays.contextMenu &&
        createPortal(
          <ComponentContextMenu
            ref={menuRef}
            componentId={contextComponentId}
            pos={overlays.contextMenu.pos}
            onDelete={deleteComponent}
          />,
          document.body,
        )}

      {propsWire &&
        createPortal(
          <WirePropertiesPanel
            wire={propsWire}
            onClose={() => dispatch({ type: 'closeWireProperties' })}
          />,
          document.body,
        )}

      {overlays.confirmClear &&
        createPortal(
          <ConfirmClearDialog
            onCancel={() => dispatch({ type: 'cancelClearConfirm' })}
            onConfirm={() => {
              clearWires();
              setPending(null);
              dispatch({ type: 'confirmClearDone' });
            }}
          />,
          document.body,
        )}
    </div>
  );
}
