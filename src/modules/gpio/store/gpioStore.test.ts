/**
 * GPIO 入门模块 — Store 行为测试
 * 验证：setter 能正确更新 config 并触发 Engine 重新计算 derived。
 * Store 不得自己实现电平判断逻辑（委托 gpioEngine）。
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useGpioStore } from './gpioStore';
import { DEFAULT_CONFIG } from '../engine/gpioTypes';

describe('gpioStore 基础', () => {
  beforeEach(() => {
    useGpioStore.getState().resetConfig();
  });

  it('初始状态为 DEFAULT_CONFIG，derived 由 engine 计算', () => {
    const { config, derived } = useGpioStore.getState();
    expect(config).toEqual(DEFAULT_CONFIG);
    // 默认配置：输入+浮空 → pinLevel=X, floating 警告
    expect(derived.pinLevel).toBe('X');
    expect(derived.warnings).toContain('floating');
  });

  it('setDirection 更新 config 并重新计算 derived', () => {
    useGpioStore.getState().setDirection('out');
    const { config, derived } = useGpioStore.getState();
    expect(config.direction).toBe('out');
    // 输出模式推挽 odr=0 + 外部断开 → strong-l → pinLevel=0
    expect(derived.pinLevel).toBe(0);
    expect(derived.nmosOn).toBe(true);
  });

  it('setPull 更新 config（输入模式下生效）', () => {
    useGpioStore.getState().setPull('up');
    const { config, derived } = useGpioStore.getState();
    expect(config.pull).toBe('up');
    expect(derived.pinLevel).toBe(1); // weak-h
    expect(derived.pullActive).toBe(true);
  });

  it('setOutType 更新 config', () => {
    useGpioStore.getState().setDirection('out');
    useGpioStore.getState().setOutType('open-drain');
    expect(useGpioStore.getState().config.outType).toBe('open-drain');
  });

  it('setOdr 更新 config 并重新计算 derived', () => {
    useGpioStore.getState().setDirection('out');
    useGpioStore.getState().setOdr(1);
    const { config, derived } = useGpioStore.getState();
    expect(config.odr).toBe(1);
    expect(derived.pmosOn).toBe(true);
    expect(derived.pinLevel).toBe(1);
  });

  it('setExternal 更新 config 并重新计算 derived', () => {
    useGpioStore.getState().setExternal('high');
    const { config, derived } = useGpioStore.getState();
    expect(config.external).toBe('high');
    expect(derived.pinLevel).toBe(1);
    expect(derived.idr).toBe(1);
  });

  it('setConfig 支持部分更新', () => {
    useGpioStore.getState().setConfig({ direction: 'out', odr: 1 });
    const { config } = useGpioStore.getState();
    expect(config.direction).toBe('out');
    expect(config.odr).toBe(1);
    // 未指定的字段保持默认
    expect(config.outType).toBe('push-pull');
    expect(config.external).toBe('floating');
  });

  it('resetConfig 恢复默认配置', () => {
    useGpioStore.getState().setConfig({ direction: 'out', odr: 1, pull: 'up' });
    useGpioStore.getState().resetConfig();
    const { config, derived } = useGpioStore.getState();
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(derived.pinLevel).toBe('X');
  });

  it('开漏 odr=1 + 外部断开 → derived 包含 open-drain-needs-pull 警告', () => {
    useGpioStore.getState().setConfig({
      direction: 'out',
      outType: 'open-drain',
      odr: 1,
      external: 'floating',
    });
    const { derived } = useGpioStore.getState();
    expect(derived.warnings).toContain('open-drain-needs-pull');
    expect(derived.warnings).toContain('floating');
    expect(derived.pinLevel).toBe('X');
  });

  it('推挽 odr=1 + 外部低 → contention 警告', () => {
    useGpioStore.getState().setConfig({
      direction: 'out',
      outType: 'push-pull',
      odr: 1,
      external: 'low',
    });
    const { derived } = useGpioStore.getState();
    expect(derived.contention).toBe(true);
    expect(derived.warnings).toContain('contention');
    expect(derived.pinLevel).toBe('X');
  });

  it('derived 随 config 变化实时更新（数据链路验证）', () => {
    // 初始：浮空 X
    expect(useGpioStore.getState().derived.pinLevel).toBe('X');
    // 切换外部高 → 1
    useGpioStore.getState().setExternal('high');
    expect(useGpioStore.getState().derived.pinLevel).toBe(1);
    // 切换外部低 → 0
    useGpioStore.getState().setExternal('low');
    expect(useGpioStore.getState().derived.pinLevel).toBe(0);
    // 切换回断开 → X
    useGpioStore.getState().setExternal('floating');
    expect(useGpioStore.getState().derived.pinLevel).toBe('X');
  });
});
