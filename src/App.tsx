import { useEffect } from 'react';
import { useCircuitStore } from './store/circuitStore';
import { useUIStore } from './store/uiStore';
import { Toolbar } from './components/Toolbar';
import { PartsLibrary } from './components/PartsLibrary';
import { Canvas } from './components/Canvas';
import { BottomPanel } from './components/BottomPanel';
import { Toasts } from './components/Toasts';
import { ContextMenu } from './components/ContextMenu';

export default function App() {
  const circuit = useCircuitStore((s) => s.circuit);

  // 键盘快捷键：Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y / Delete / Backspace
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) useCircuitStore.getState().redo();
        else useCircuitStore.getState().undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        useCircuitStore.getState().redo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
        const { selectedWireId, selectedDeviceId } = useUIStore.getState();
        if (selectedWireId) {
          e.preventDefault();
          useCircuitStore.getState().removeWire(selectedWireId);
        } else if (selectedDeviceId) {
          e.preventDefault();
          useCircuitStore.getState().removeDevice(selectedDeviceId);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // undo / redo / 删除后清除失效选中
  useEffect(() => {
    const { selectedDeviceId, selectedWireId } = useUIStore.getState();
    if (selectedDeviceId && !circuit.devices.some((d) => d.id === selectedDeviceId)) {
      useUIStore.getState().selectDevice(null);
    }
    if (selectedWireId && !circuit.wires.some((w) => w.id === selectedWireId)) {
      useUIStore.getState().selectWire(null);
    }
  }, [circuit]);

  return (
    <div className="app">
      <Toolbar />
      <div className="main">
        <PartsLibrary />
        <div className="canvas-wrap">
          <Canvas />
          {circuit.devices.length === 0 && (
            <div className="canvas-hint">
              <div className="hint-title">数字逻辑虚拟实验台</div>
              <p>从左侧器件库添加器件，拖拽移动，从输出端口拖线到输入端口完成连接。</p>
              <p className="hint-sub">试试：按钮 → LED → 按住按钮点亮；或从「示例电路」一键加载。</p>
            </div>
          )}
        </div>
      </div>
      <BottomPanel />
      <Toasts />
      <ContextMenu />
    </div>
  );
}
