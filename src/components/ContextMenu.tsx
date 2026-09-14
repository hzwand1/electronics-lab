import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DEVICE_META } from '../engine/types';
import { useCircuitStore } from '../store/circuitStore';
import { useUIStore } from '../store/uiStore';

const MENU_W = 190;
const MENU_H = 72;
const MARGIN = 6;

function deviceLabel(type: keyof typeof DEVICE_META): string {
  switch (type) {
    case 'switch':
      return '开关';
    case 'button':
      return '按钮';
    case 'led':
      return 'LED';
    case 'and':
      return '与门 AND';
    case 'or':
      return '或门 OR';
    case 'not':
      return '非门 NOT';
    case 'xor':
      return '异或门 XOR';
  }
}

/**
 * 右键上下文菜单：删除单个器件（连带删除相关连线）或单条连线。
 * 轻量浮层，不使用模态弹窗；点击菜单外、Esc、滚动/缩放时自动关闭。
 */
export function ContextMenu() {
  const menu = useUIStore((s) => s.contextMenu);
  const circuit = useCircuitStore((s) => s.circuit);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!menu) return;
    const x = Math.min(menu.x, window.innerWidth - MENU_W - MARGIN);
    const y = Math.min(menu.y, window.innerHeight - MENU_H - MARGIN);
    setPos({ x: Math.max(MARGIN, x), y: Math.max(MARGIN, y) });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const close = () => useUIStore.getState().setContextMenu(null);
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', close, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', close);
    };
  }, [menu]);

  if (!menu) return null;

  let detail = '';
  if (menu.kind === 'device') {
    const d = circuit.devices.find((x) => x.id === menu.id);
    if (d) detail = deviceLabel(d.type);
  } else {
    const w = circuit.wires.find((x) => x.id === menu.id);
    if (w) {
      const fromD = circuit.devices.find((d) => d.id === w.from.deviceId);
      const toD = circuit.devices.find((d) => d.id === w.to.deviceId);
      if (fromD && toD) {
        const fp = fromD.ports.find((p) => p.id === w.from.portId)?.name ?? '';
        const tp = toD.ports.find((p) => p.id === w.to.portId)?.name ?? '';
        detail = `${deviceLabel(fromD.type)}.${fp} → ${deviceLabel(toD.type)}.${tp}`;
      }
    }
  }

  const doDelete = () => {
    if (menu.kind === 'device') {
      useCircuitStore.getState().removeDevice(menu.id);
      useUIStore.getState().selectDevice(null);
      useUIStore.getState().showToast('已删除器件（相关连线一并删除，可撤销）', 'info');
    } else {
      useCircuitStore.getState().removeWire(menu.id);
      useUIStore.getState().selectWire(null);
      useUIStore.getState().showToast('已删除连线（可撤销）', 'info');
    }
    useUIStore.getState().setContextMenu(null);
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: pos.x, top: pos.y }}
      role="menu"
    >
      <div className="context-menu-head">
        {menu.kind === 'device' ? '器件' : '连线'}
        {detail && <span className="context-menu-detail">{detail}</span>}
      </div>
      <button className="context-menu-item danger" role="menuitem" onClick={doDelete}>
        <span className="ctx-icon">✕</span>
        {menu.kind === 'device' ? '删除器件' : '删除连线'}
        <span className="ctx-shortcut">Del</span>
      </button>
    </div>
  );
}
