import { useRef } from 'react';
import { useCircuitStore } from '../store/circuitStore';
import { useUIStore } from '../store/uiStore';
import { PRESET_EXAMPLES } from '../presets/examples';
import { validateAndNormalizeCircuit, serializeCircuit } from '../utils/serialize';

export function Toolbar() {
  const canUndo = useCircuitStore((s) => s.past.length > 0);
  const canRedo = useCircuitStore((s) => s.future.length > 0);
  const zoom = useUIStore((s) => s.zoom);
  const fileRef = useRef<HTMLInputElement>(null);

  const undo = () => useCircuitStore.getState().undo();
  const redo = () => useCircuitStore.getState().redo();

  const loadExample = (id: string) => {
    const ex = PRESET_EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    useCircuitStore.getState().loadCircuit(JSON.parse(JSON.stringify(ex.circuit)));
    useUIStore.getState().setZoom(1);
    useUIStore.getState().setPanOffset({ x: 40, y: 40 });
    useUIStore.getState().showToast(`已加载示例：${ex.name}`, 'info');
  };

  const exportJson = () => {
    const json = serializeCircuit(useCircuitStore.getState().circuit);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'electronics-lab-circuit.json';
    a.click();
    URL.revokeObjectURL(url);
    useUIStore.getState().showToast('已导出电路 JSON', 'info');
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        const validation = validateAndNormalizeCircuit(parsed);
        if (!validation.ok || !validation.circuit) {
          useUIStore.getState().showToast(validation.error ?? '文件格式无效', 'error');
          return;
        }
        useCircuitStore.getState().loadCircuit(validation.circuit);
        useUIStore.getState().showToast('已导入电路', 'info');
      } catch {
        useUIStore.getState().showToast('文件格式无效', 'error');
      }
    };
    reader.readAsText(file);
  };

  const clear = () => {
    useCircuitStore.getState().clearCircuit();
    useUIStore.getState().showToast('已清空电路', 'info');
  };

  const zoomIn = () => {
    const st = useUIStore.getState();
    st.setZoom(st.zoom * 1.2);
  };
  const zoomOut = () => {
    const st = useUIStore.getState();
    st.setZoom(st.zoom / 1.2);
  };

  return (
    <header className="toolbar">
      <div className="brand">
        Electronics Lab<span className="ver">V0.1</span>
      </div>

      <button className="tbtn" onClick={undo} disabled={!canUndo} title="撤销 (Ctrl+Z)">
        ↩ 撤销
      </button>
      <button className="tbtn" onClick={redo} disabled={!canRedo} title="重做 (Ctrl+Shift+Z)">
        ↪ 重做
      </button>

      <div className="tsep" />

      <select
        className="tselect"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) loadExample(e.target.value);
          e.target.value = '';
        }}
      >
        <option value="" disabled>
          示例电路 ▾
        </option>
        {PRESET_EXAMPLES.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.name}
          </option>
        ))}
      </select>

      <button className="tbtn" onClick={exportJson} title="导出当前电路为 JSON 文件">
        ⇩ 导出
      </button>
      <button className="tbtn" onClick={() => fileRef.current?.click()} title="导入 JSON 电路文件">
        ⇧ 导入
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importJson(f);
          e.target.value = '';
        }}
      />
      <button className="tbtn" onClick={clear} title="清空画布（可撤销）">
        ✕ 清空
      </button>

      <div className="spacer" />

      <div className="zoom-group">
        <button className="tbtn zoom-btn" onClick={zoomOut} title="缩小">
          −
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button className="tbtn zoom-btn" onClick={zoomIn} title="放大">
          +
        </button>
      </div>
    </header>
  );
}
