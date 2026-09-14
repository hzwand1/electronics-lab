import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCircuitStore } from './circuitStore';
import { useUIStore } from './uiStore';
import { emptyCircuitForTest, resetStore } from './testUtils';

describe('circuitStore 基础结构操作', () => {
  beforeEach(() => {
    resetStore();
  });

  it('addDevice 生成正确结构并返回 ID', () => {
    const id = useCircuitStore.getState().addDevice('and', { x: 2, y: 3 });
    const c = useCircuitStore.getState().circuit;
    expect(typeof id).toBe('string');
    expect(c.devices).toHaveLength(1);
    const d = c.devices[0];
    expect(d.id).toBe(id);
    expect(d.type).toBe('and');
    expect(d.position).toEqual({ x: 2, y: 3 });
    expect(d.ports.map((p) => p.name)).toEqual(['A', 'B', 'Y']);
    expect(d.ports.every((p) => p.direction === 'in' || p.direction === 'out')).toBe(true);
  });

  it('addDevice 产生一条 Undo 历史', () => {
    useCircuitStore.getState().addDevice('led', { x: 1, y: 1 });
    expect(useCircuitStore.getState().past.length).toBe(1);
  });

  it('addWire 成功并产生历史；合法连接可被撤销', () => {
    useCircuitStore.getState().addDevice('button', { x: 1, y: 1 });
    useCircuitStore.getState().addDevice('led', { x: 5, y: 1 });
    const st = useCircuitStore.getState();
    const res = st.addWire(
      { deviceId: st.circuit.devices[0].id, portId: st.circuit.devices[0].ports[0].id },
      { deviceId: st.circuit.devices[1].id, portId: st.circuit.devices[1].ports[0].id },
    );
    expect(res.success).toBe(true);
    expect(useCircuitStore.getState().circuit.wires).toHaveLength(1);
    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().circuit.wires).toHaveLength(0);
  });

  it('addWire 非法分支：输出→输出 拒绝且不产生历史', () => {
    useCircuitStore.getState().addDevice('button', { x: 1, y: 1 });
    useCircuitStore.getState().addDevice('and', { x: 4, y: 1 });
    const st = useCircuitStore.getState();
    const btnOut = st.circuit.devices.find((d) => d.type === 'button')!.ports[0];
    const andOut = st.circuit.devices.find((d) => d.type === 'and')!.ports.find((p) => p.name === 'Y')!;
    const res = st.addWire(
      { deviceId: btnOut.deviceId, portId: btnOut.id },
      { deviceId: andOut.deviceId, portId: andOut.id },
    );
    expect(res.success).toBe(false);
    expect(res.error).toContain('输出端口不能连接输出端口');
    expect(useCircuitStore.getState().circuit.wires).toHaveLength(0);
  });

  it('addWire 拒绝反馈回路', () => {
    useCircuitStore.getState().addDevice('not', { x: 1, y: 1 });
    useCircuitStore.getState().addDevice('or', { x: 3, y: 1 });
    const st = useCircuitStore.getState();
    const notDev = st.circuit.devices.find((d) => d.type === 'not')!;
    const orDev = st.circuit.devices.find((d) => d.type === 'or')!;
    const ok1 = st.addWire(
      { deviceId: notDev.id, portId: notDev.ports.find((p) => p.name === 'Y')!.id },
      { deviceId: orDev.id, portId: orDev.ports.find((p) => p.name === 'A')!.id },
    );
    expect(ok1.success).toBe(true);
    const res = st.addWire(
      { deviceId: orDev.id, portId: orDev.ports.find((p) => p.name === 'Y')!.id },
      { deviceId: notDev.id, portId: notDev.ports.find((p) => p.name === 'A')!.id },
    );
    expect(res.success).toBe(false);
    expect(res.error).toContain('反馈回路');
  });

  it('removeDevice 连带删除相关 Wire 并产生历史', () => {
    useCircuitStore.getState().loadCircuit(emptyCircuitForTest('b1', 'led1'));
    const st = useCircuitStore.getState();
    expect(st.circuit.wires).toHaveLength(1);
    st.removeDevice('b1');
    const c = useCircuitStore.getState().circuit;
    expect(c.devices.some((d) => d.id === 'b1')).toBe(false);
    expect(c.wires).toHaveLength(0);
    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().circuit.devices.some((d) => d.id === 'b1')).toBe(true);
  });

  it('moveDevice 不产生历史（拖拽历史由 begin/end 管理）', () => {
    useCircuitStore.getState().addDevice('led', { x: 1, y: 1 });
    const before = useCircuitStore.getState().past.length;
    useCircuitStore.getState().moveDevice(
      useCircuitStore.getState().circuit.devices[0].id,
      { x: 5, y: 5 },
    );
    expect(useCircuitStore.getState().past.length).toBe(before);
    expect(useCircuitStore.getState().circuit.devices[0].position).toEqual({ x: 5, y: 5 });
  });
});

describe('拖拽历史：一次完整拖拽只产生一条历史', () => {
  beforeEach(() => {
    resetStore();
  });

  it('拖拽（begin → move → end）提交一条历史，undo 恢复拖拽前位置', () => {
    useCircuitStore.getState().addDevice('led', { x: 1, y: 1 });
    const id = useCircuitStore.getState().circuit.devices[0].id;
    const pastBefore = useCircuitStore.getState().past.length;
    useCircuitStore.getState().beginDeviceDrag(id);
    useCircuitStore.getState().moveDevice(id, { x: 3, y: 3 });
    useCircuitStore.getState().moveDevice(id, { x: 6, y: 6 });
    useCircuitStore.getState().endDeviceDrag(id);
    expect(useCircuitStore.getState().past.length).toBe(pastBefore + 1);
    useCircuitStore.getState().undo();
    const d = useCircuitStore.getState().circuit.devices[0];
    expect(d.position).toEqual({ x: 1, y: 1 });
  });

  it('位置未变化则不提交历史', () => {
    useCircuitStore.getState().addDevice('led', { x: 1, y: 1 });
    const id = useCircuitStore.getState().circuit.devices[0].id;
    const pastBefore = useCircuitStore.getState().past.length;
    useCircuitStore.getState().beginDeviceDrag(id);
    useCircuitStore.getState().moveDevice(id, { x: 1, y: 1 });
    useCircuitStore.getState().endDeviceDrag(id);
    expect(useCircuitStore.getState().past.length).toBe(pastBefore);
  });

  it('未调用 beginDeviceDrag 的 endDeviceDrag 不产生历史', () => {
    useCircuitStore.getState().addDevice('led', { x: 1, y: 1 });
    const id = useCircuitStore.getState().circuit.devices[0].id;
    const pastBefore = useCircuitStore.getState().past.length;
    useCircuitStore.getState().endDeviceDrag(id);
    expect(useCircuitStore.getState().past.length).toBe(pastBefore);
  });
});

describe('setDeviceState 历史行为', () => {
  beforeEach(() => {
    resetStore();
  });

  it('Button press/release 不产生历史（pushHistory 默认 false）', () => {
    useCircuitStore.getState().addDevice('button', { x: 1, y: 1 });
    const id = useCircuitStore.getState().circuit.devices[0].id;
    const pastBefore = useCircuitStore.getState().past.length;
    useCircuitStore.getState().setDeviceState(id, { pressed: true });
    useCircuitStore.getState().setDeviceState(id, { pressed: false });
    expect(useCircuitStore.getState().past.length).toBe(pastBefore);
    expect(useCircuitStore.getState().circuit.devices[0].state.pressed).toBe(false);
  });

  it('Switch toggle 产生历史（pushHistory=true）且可撤销', () => {
    useCircuitStore.getState().addDevice('switch', { x: 1, y: 1 });
    const id = useCircuitStore.getState().circuit.devices[0].id;
    const pastBefore = useCircuitStore.getState().past.length;
    useCircuitStore.getState().setDeviceState(id, { on: true }, true);
    expect(useCircuitStore.getState().past.length).toBe(pastBefore + 1);
    expect(useCircuitStore.getState().circuit.devices[0].state.on).toBe(true);
    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().circuit.devices[0].state.on).toBe(false);
  });
});

describe('Undo / Redo', () => {
  beforeEach(() => {
    resetStore();
  });

  it('addDevice → undo 恢复空电路 → redo 恢复器件', () => {
    useCircuitStore.getState().addDevice('led', { x: 2, y: 2 });
    const id = useCircuitStore.getState().circuit.devices[0].id;
    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().circuit.devices).toHaveLength(0);
    expect(useCircuitStore.getState().canUndo()).toBe(false);
    useCircuitStore.getState().redo();
    expect(useCircuitStore.getState().circuit.devices[0].id).toBe(id);
    expect(useCircuitStore.getState().canRedo()).toBe(false);
  });

  it('超过 20 步丢弃最旧历史', () => {
    for (let i = 0; i < 25; i += 1) {
      useCircuitStore.getState().addDevice('led', { x: i, y: 1 });
    }
    expect(useCircuitStore.getState().past.length).toBe(20);
  });

  it('undo 后新操作清空 future', () => {
    useCircuitStore.getState().addDevice('led', { x: 1, y: 1 });
    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().canRedo()).toBe(true);
    useCircuitStore.getState().addDevice('switch', { x: 1, y: 4 });
    expect(useCircuitStore.getState().canRedo()).toBe(false);
  });

  it('clearCircuit 产生历史并可撤销', () => {
    useCircuitStore.getState().loadCircuit(emptyCircuitForTest('b1', 'led1'));
    useCircuitStore.getState().clearCircuit();
    expect(useCircuitStore.getState().circuit.devices).toHaveLength(0);
    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().circuit.devices).toHaveLength(2);
  });

  it('loadCircuit 整体替换并产生历史（含重算端口值）', () => {
    useCircuitStore.getState().addDevice('led', { x: 9, y: 9 });
    useCircuitStore.getState().loadCircuit(emptyCircuitForTest('b1', 'led1'));
    const c = useCircuitStore.getState().circuit;
    expect(c.devices.map((d) => d.id)).toEqual(['b1', 'led1']);
    // 导入后由 _simulate 重算：pressed=false → LED 熄灭
    const led = c.devices.find((d) => d.id === 'led1')!;
    expect(led.ports.find((p) => p.direction === 'in')!.value).toBe(0);
    useCircuitStore.getState().undo();
    expect(useCircuitStore.getState().circuit.devices.map((d) => d.id)).not.toEqual(['b1', 'led1']);
  });
});

describe('uiStore 基础行为', () => {
  it('showToast 添加并自动消失', () => {
    vi.useFakeTimers();
    try {
      const idBefore = useUIStore.getState().toasts.length;
      useUIStore.getState().showToast('测试提示', 'info');
      expect(useUIStore.getState().toasts.length).toBe(idBefore + 1);
      vi.advanceTimersByTime(2700);
      expect(useUIStore.getState().toasts.length).toBe(idBefore);
    } finally {
      vi.useRealTimers();
    }
  });

  it('selectDevice / selectWire 互斥', () => {
    const st = useUIStore.getState();
    st.selectDevice('d1');
    expect(useUIStore.getState().selectedDeviceId).toBe('d1');
    expect(useUIStore.getState().selectedWireId).toBeNull();
    st.selectWire('w1');
    expect(useUIStore.getState().selectedWireId).toBe('w1');
    expect(useUIStore.getState().selectedDeviceId).toBeNull();
  });

  it('setZoom 限制在 0.25 ~ 4.0', () => {
    const st = useUIStore.getState();
    st.setZoom(10);
    expect(useUIStore.getState().zoom).toBe(4);
    st.setZoom(0.01);
    expect(useUIStore.getState().zoom).toBe(0.25);
  });
});
