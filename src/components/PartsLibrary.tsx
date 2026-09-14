import { DeviceType } from '../engine/types';
import { useCircuitStore } from '../store/circuitStore';
import { useUIStore } from '../store/uiStore';
import { AND_PATH, OR_PATH, NOT_PATH, XOR_PATH, XOR_INNER, NOT_BUBBLE_CX, NOT_BUBBLE_CY, NOT_BUBBLE_R } from './devices/shapes';

interface PartDef {
  type: DeviceType;
  name: string;
  sub: string;
}

const PARTS: PartDef[] = [
  { type: 'switch', name: '开关', sub: 'Switch · 点击切换' },
  { type: 'button', name: '按钮', sub: 'Button · 按住输出1' },
  { type: 'led', name: 'LED', sub: '输出指示 · 1点亮' },
  { type: 'and', name: '与门', sub: 'AND · 全1出1' },
  { type: 'or', name: '或门', sub: 'OR · 有1出1' },
  { type: 'not', name: '非门', sub: 'NOT · 取反' },
  { type: 'xor', name: '异或门', sub: 'XOR · 相异出1' },
];

function PartIcon({ type }: { type: DeviceType }) {
  const common = {
    fill: 'none',
    stroke: '#9aa4b5',
    strokeWidth: 1.6,
  } as const;
  switch (type) {
    case 'switch':
      return (
        <svg viewBox="0 0 60 40" aria-hidden="true">
          <rect x="14" y="13" width="34" height="14" rx="7" fill="none" stroke="#9aa4b5" strokeWidth="1.6" />
          <circle cx="42" cy="20" r="6" fill="#4fc3f7" />
        </svg>
      );
    case 'button':
      return (
        <svg viewBox="0 0 60 40" aria-hidden="true">
          <rect x="2" y="4" width="56" height="32" rx="6" {...common} />
        </svg>
      );
    case 'led':
      return (
        <svg viewBox="0 0 60 40" aria-hidden="true">
          <circle cx="30" cy="20" r="11" fill="none" stroke="#ff5252" strokeWidth="1.6" />
          <circle cx="30" cy="20" r="4" fill="#ff5252" />
        </svg>
      );
    case 'and':
      return (
        <svg viewBox="0 0 60 60" aria-hidden="true">
          <path d={AND_PATH} {...common} />
        </svg>
      );
    case 'or':
      return (
        <svg viewBox="0 0 60 60" aria-hidden="true">
          <path d={OR_PATH} {...common} />
        </svg>
      );
    case 'not':
      return (
        <svg viewBox="0 0 60 60" aria-hidden="true">
          <path d={NOT_PATH} {...common} />
          <circle cx={NOT_BUBBLE_CX} cy={NOT_BUBBLE_CY} r={NOT_BUBBLE_R} {...common} />
        </svg>
      );
    case 'xor':
      return (
        <svg viewBox="0 0 60 60" aria-hidden="true">
          <path d={XOR_PATH} {...common} />
          <path d={XOR_INNER} {...common} strokeWidth={1.2} />
        </svg>
      );
  }
}

export function PartsLibrary() {
  const deviceCount = useCircuitStore((s) => s.circuit.devices.length);

  const addPart = (type: DeviceType) => {
    const n = deviceCount;
    const position = {
      x: 4 + (n % 8) * 2,
      y: 4 + Math.floor(n / 8) * 2,
    };
    const id = useCircuitStore.getState().addDevice(type, position);
    useUIStore.getState().selectDevice(id);
    useUIStore.getState().showToast('已添加器件，可拖拽移动、从右侧端口拖线连接', 'info');
  };

  return (
    <aside className="sidebar">
      <h3>器件库</h3>
      <div className="parts">
        {PARTS.map((p) => (
          <button key={p.type} className="part-item" onClick={() => addPart(p.type)}>
            <PartIcon type={p.type} />
            <span className="part-text">
              <span className="part-name">{p.name}</span>
              <span className="part-sub">{p.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="sidebar-foot">
        拖线：输出端口（右）按下 → 输入端口（左）松开
        <br />
        删除：右键器件 / 连线，或选中后按 Delete
      </div>
    </aside>
  );
}
