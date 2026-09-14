import { DEVICE_META, Signal } from '../engine/types';
import { useCircuitStore } from '../store/circuitStore';
import { useUIStore } from '../store/uiStore';

const TYPE_NAME: Record<string, string> = {
  switch: '开关 Switch',
  button: '按钮 Button',
  led: 'LED',
  and: '与门 AND',
  or: '或门 OR',
  not: '非门 NOT',
  xor: '异或门 XOR',
};

function signalText(v: Signal): string {
  if (v === 1) return '1 高电平';
  if (v === 0) return '0 低电平';
  return 'X 未定义';
}

function signalClass(v: Signal): string {
  return v === 1 ? 'v1' : v === 0 ? 'v0' : 'vx';
}

export function DeviceInfoPanel() {
  const selectedDeviceId = useUIStore((s) => s.selectedDeviceId);
  const selectedWireId = useUIStore((s) => s.selectedWireId);
  const device = useCircuitStore((s) =>
    s.circuit.devices.find((d) => d.id === selectedDeviceId),
  );
  const wire = useCircuitStore((s) => s.circuit.wires.find((w) => w.id === selectedWireId));

  if (!device && !wire) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-title">器件信息</div>
        <p>未选中器件或连线。点击画布上的器件 / 连线查看信息。</p>
        <p className="dim">提示：右键器件或连线可直接删除；选中后按 Delete 键同样可删除。</p>
      </div>
    );
  }

  // === 选中连线 ===
  if (!device && wire) {
    const c = useCircuitStore.getState().circuit;
    const fromD = c.devices.find((d) => d.id === wire.from.deviceId);
    const toD = c.devices.find((d) => d.id === wire.to.deviceId);
    const fromP = fromD?.ports.find((p) => p.id === wire.from.portId);
    const toP = toD?.ports.find((p) => p.id === wire.to.portId);
    return (
      <div className="devinfo">
        <div className="devinfo-grid">
          <div>
            <span className="k">类型</span>
            <span className="v">连线 Wire</span>
          </div>
          <div>
            <span className="k">起点</span>
            <span className="v mono">
              {TYPE_NAME[fromD?.type ?? ''] ?? '—'} · {fromP?.name ?? '—'}
            </span>
          </div>
          <div>
            <span className="k">终点</span>
            <span className="v mono">
              {TYPE_NAME[toD?.type ?? ''] ?? '—'} · {toP?.name ?? '—'}
            </span>
          </div>
          <div>
            <span className="k">当前信号</span>
            <span className={`v mono ${signalClass(fromP?.value ?? 'X')}`}>
              {signalText(fromP?.value ?? 'X')}
            </span>
          </div>
        </div>
        <button
          className="danger-btn"
          onClick={() => {
            useCircuitStore.getState().removeWire(wire.id);
            useUIStore.getState().selectWire(null);
            useUIStore.getState().showToast('已删除连线（可撤销）', 'info');
          }}
        >
          ✕ 删除此连线
          <span className="danger-btn-hint">Delete</span>
        </button>
      </div>
    );
  }

  if (!device) return null;

  const meta = DEVICE_META[device.type];
  const stateText = Object.keys(device.state).length
    ? Object.entries(device.state)
        .map(([k, v]) => `${k} = ${String(v)}`)
        .join('，')
    : '无';

  return (
    <div className="devinfo">
      <div className="devinfo-grid">
        <div>
          <span className="k">类型</span>
          <span className="v">{TYPE_NAME[device.type] ?? device.type}</span>
        </div>
        <div>
          <span className="k">ID</span>
          <span className="v mono">{device.id}</span>
        </div>
        <div>
          <span className="k">位置</span>
          <span className="v mono">
            ({device.position.x}, {device.position.y}) 格 · 20px
          </span>
        </div>
        <div>
          <span className="k">尺寸</span>
          <span className="v mono">
            {meta.width} × {meta.height} px
          </span>
        </div>
        <div>
          <span className="k">状态</span>
          <span className="v mono">{stateText}</span>
        </div>
      </div>
      <table className="port-table">
        <thead>
          <tr>
            <th>端口</th>
            <th>方向</th>
            <th>信号</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          {device.ports.map((p) => {
            const connected =
              p.direction === 'out' ||
              useCircuitStore.getState().circuit.wires.some((w) => w.to.portId === p.id);
            let note = '未连接';
            if (connected) {
              if (p.value === 1) note = '高电平';
              else if (p.value === 0) note = '低电平';
              else note = '未定义（上游悬空）';
            }
            return (
              <tr key={p.id}>
                <td className="mono">{p.name}</td>
                <td>{p.direction === 'in' ? '输入' : '输出'}</td>
                <td className={`mono ${p.value === 1 ? 'v1' : p.value === 0 ? 'v0' : 'vx'}`}>
                  {p.value === 'X' ? 'X' : p.value}
                </td>
                <td className="dim">{note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        className="danger-btn"
        onClick={() => {
          useCircuitStore.getState().removeDevice(device.id);
          useUIStore.getState().selectDevice(null);
          useUIStore.getState().showToast('已删除器件（相关连线一并删除，可撤销）', 'info');
        }}
      >
        ✕ 删除该器件
        <span className="danger-btn-hint">连带相关连线 · Delete</span>
      </button>
    </div>
  );
}
