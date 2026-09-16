/**
 * GPIO 入门模块 — 纯引擎单元测试
 * 覆盖 SPEC 第 6、7 节全部解析规则。
 */

import { describe, expect, it } from 'vitest';
import { GpioEngine } from './gpioEngine';
import { DEFAULT_CONFIG, GpioConfig } from './gpioTypes';

const engine = new GpioEngine();

/** 辅助：构建 config */
function cfg(partial: Partial<GpioConfig> = {}): GpioConfig {
  return { ...DEFAULT_CONFIG, ...partial };
}

// ============================================================
// 输入模式（direction = 'in'）— 第 7.1 节 9 种组合
// ============================================================
describe('输入模式解析（第 7.1 节）', () => {
  it('floating + none → 全 z → pinLevel=X, idr=X, floating', () => {
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'none', external: 'floating' }));
    expect(r.pinLevel).toBe('X');
    expect(r.idr).toBe('X');
    expect(r.warnings).toContain('floating');
    expect(r.contention).toBe(false);
  });

  it('floating + up → weak-h → pinLevel=1, idr=1', () => {
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'up', external: 'floating' }));
    expect(r.pinLevel).toBe(1);
    expect(r.idr).toBe(1);
    expect(r.warnings).not.toContain('floating');
    expect(r.pullActive).toBe(true);
  });

  it('floating + down → weak-l → pinLevel=0, idr=0', () => {
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'down', external: 'floating' }));
    expect(r.pinLevel).toBe(0);
    expect(r.idr).toBe(0);
    expect(r.pullActive).toBe(true);
  });

  it('high + none → strong-h → pinLevel=1, idr=1', () => {
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'none', external: 'high' }));
    expect(r.pinLevel).toBe(1);
    expect(r.idr).toBe(1);
  });

  it('high + up → strong-h + weak-h 同向 → pinLevel=1', () => {
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'up', external: 'high' }));
    expect(r.pinLevel).toBe(1);
    expect(r.idr).toBe(1);
    expect(r.contention).toBe(false);
  });

  it('high + down → strong-h + weak-l（强胜弱）→ pinLevel=1, 无冲突', () => {
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'down', external: 'high' }));
    expect(r.pinLevel).toBe(1);
    expect(r.idr).toBe(1);
    expect(r.contention).toBe(false);
    expect(r.warnings).not.toContain('contention');
  });

  it('low + none → strong-l → pinLevel=0, idr=0', () => {
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'none', external: 'low' }));
    expect(r.pinLevel).toBe(0);
    expect(r.idr).toBe(0);
  });

  it('low + up → strong-l + weak-h（强胜弱）→ pinLevel=0, 无冲突', () => {
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'up', external: 'low' }));
    expect(r.pinLevel).toBe(0);
    expect(r.idr).toBe(0);
    expect(r.contention).toBe(false);
  });

  it('low + down → strong-l + weak-l 同向 → pinLevel=0', () => {
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'down', external: 'low' }));
    expect(r.pinLevel).toBe(0);
    expect(r.idr).toBe(0);
  });
});

// ============================================================
// 输出模式 · 推挽 — 第 7.2 节 6 种组合
// ============================================================
describe('推挽输出解析（第 7.2 节）', () => {
  it('odr=1 + floating → strong-h（P通）→ pinLevel=1, pmosOn=true', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'push-pull', odr: 1, external: 'floating' }));
    expect(r.pinLevel).toBe(1);
    expect(r.idr).toBe(1);
    expect(r.pmosOn).toBe(true);
    expect(r.nmosOn).toBe(false);
  });

  it('odr=1 + high → strong-h + strong-h 同向 → pinLevel=1', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'push-pull', odr: 1, external: 'high' }));
    expect(r.pinLevel).toBe(1);
    expect(r.contention).toBe(false);
  });

  it('odr=1 + low → strong-h + strong-l 对拉 → contention, pinLevel=X', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'push-pull', odr: 1, external: 'low' }));
    expect(r.contention).toBe(true);
    expect(r.pinLevel).toBe('X');
    expect(r.idr).toBe('X');
    expect(r.warnings).toContain('contention');
  });

  it('odr=0 + floating → strong-l（N通）→ pinLevel=0, nmosOn=true', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'push-pull', odr: 0, external: 'floating' }));
    expect(r.pinLevel).toBe(0);
    expect(r.idr).toBe(0);
    expect(r.pmosOn).toBe(false);
    expect(r.nmosOn).toBe(true);
  });

  it('odr=0 + high → strong-l + strong-h 对拉 → contention, pinLevel=X', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'push-pull', odr: 0, external: 'high' }));
    expect(r.contention).toBe(true);
    expect(r.pinLevel).toBe('X');
    expect(r.warnings).toContain('contention');
  });

  it('odr=0 + low → strong-l + strong-l 同向 → pinLevel=0', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'push-pull', odr: 0, external: 'low' }));
    expect(r.pinLevel).toBe(0);
    expect(r.contention).toBe(false);
  });
});

// ============================================================
// 输出模式 · 开漏 — 第 7.3 节 6 种组合
// ============================================================
describe('开漏输出解析（第 7.3 节）', () => {
  it('odr=0 + floating → strong-l（N通）→ pinLevel=0, nmosOn=true, pmosOn=false', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'open-drain', odr: 0, external: 'floating' }));
    expect(r.pinLevel).toBe(0);
    expect(r.idr).toBe(0);
    expect(r.nmosOn).toBe(true);
    expect(r.pmosOn).toBe(false);
  });

  it('odr=0 + high → strong-l + strong-h 对拉 → contention', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'open-drain', odr: 0, external: 'high' }));
    expect(r.contention).toBe(true);
    expect(r.pinLevel).toBe('X');
    expect(r.warnings).toContain('contention');
  });

  it('odr=0 + low → strong-l + strong-l 同向 → pinLevel=0', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'open-drain', odr: 0, external: 'low' }));
    expect(r.pinLevel).toBe(0);
    expect(r.contention).toBe(false);
  });

  it('odr=1 + floating → 全 z（两管都断）→ pinLevel=X, floating + open-drain-needs-pull', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'open-drain', odr: 1, external: 'floating' }));
    expect(r.pinLevel).toBe('X');
    expect(r.idr).toBe('X');
    expect(r.pmosOn).toBe(false);
    expect(r.nmosOn).toBe(false);
    expect(r.warnings).toContain('floating');
    expect(r.warnings).toContain('open-drain-needs-pull');
  });

  it('odr=1 + high → strong-h（外部）→ pinLevel=1（开漏释放后由外部上拉来源决定）', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'open-drain', odr: 1, external: 'high' }));
    expect(r.pinLevel).toBe(1);
    expect(r.idr).toBe(1);
    expect(r.pmosOn).toBe(false);
    expect(r.nmosOn).toBe(false);
    expect(r.warnings).not.toContain('open-drain-needs-pull');
  });

  it('odr=1 + low → strong-l（外部）→ pinLevel=0', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'open-drain', odr: 1, external: 'low' }));
    expect(r.pinLevel).toBe(0);
    expect(r.idr).toBe(0);
  });
});

// ============================================================
// 驱动强度模型专项
// ============================================================
describe('驱动强度模型', () => {
  it('strong + weak 反向时强胜弱，不产生 contention', () => {
    // 输入模式：外部强低 + 内部上拉弱高
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'up', external: 'low' }));
    expect(r.pinLevel).toBe(0); // strong-l wins
    expect(r.contention).toBe(false);
    expect(r.warnings).not.toContain('contention');
  });

  it('strong-h + strong-l 同时存在 → contention=true, pinLevel=X', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'push-pull', odr: 1, external: 'low' }));
    expect(r.contention).toBe(true);
    expect(r.pinLevel).toBe('X');
  });

  it('全 z（无任何驱动）→ pinLevel=X, floating 警告', () => {
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'none', external: 'floating' }));
    const drives = engine.collectDrives(r && cfg({ direction: 'in', pull: 'none', external: 'floating' }));
    expect(drives.filter((d) => d !== 'z').length).toBe(0);
    expect(r.pinLevel).toBe('X');
    expect(r.warnings).toContain('floating');
  });

  it('collectDrives 返回正确的驱动源集合', () => {
    // 输入 + 上拉 + 外部高
    const d1 = engine.collectDrives(cfg({ direction: 'in', pull: 'up', external: 'high' }));
    expect(d1).toContain('strong-h');
    expect(d1).toContain('weak-h');

    // 推挽输出 odr=0 + 外部断开
    const d2 = engine.collectDrives(cfg({ direction: 'out', outType: 'push-pull', odr: 0, external: 'floating' }));
    expect(d2).toContain('strong-l');
    expect(d2.filter((d) => d === 'z').length).toBeGreaterThan(0);
  });
});

// ============================================================
// 施密特触发器
// ============================================================
describe('施密特触发器（教学简化）', () => {
  it('H → 1', () => expect(engine.schmitt(1)).toBe(1));
  it('L → 0', () => expect(engine.schmitt(0)).toBe(0));
  it('X → X', () => expect(engine.schmitt('X')).toBe('X'));
});

// ============================================================
// 输出模式忽略 pull
// ============================================================
describe('输出模式忽略 pull 配置', () => {
  it('输出模式下 pull=up 不产生 weak-h 驱动', () => {
    const drives = engine.collectDrives(
      cfg({ direction: 'out', outType: 'push-pull', odr: 1, pull: 'up', external: 'floating' }),
    );
    expect(drives).not.toContain('weak-h');
    expect(drives).not.toContain('weak-l');
  });

  it('输出模式下 pull=down 不产生 weak-l 驱动', () => {
    const drives = engine.collectDrives(
      cfg({ direction: 'out', outType: 'open-drain', odr: 1, pull: 'down', external: 'floating' }),
    );
    expect(drives).not.toContain('weak-l');
  });

  it('输出模式下 pullActive=false', () => {
    const r = engine.evaluate(cfg({ direction: 'out', pull: 'up', external: 'floating' }));
    expect(r.pullActive).toBe(false);
  });
});

// ============================================================
// P/N-MOS 导通状态
// ============================================================
describe('P/N-MOS 导通状态', () => {
  it('推挽 odr=1 → pmosOn=true, nmosOn=false', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'push-pull', odr: 1 }));
    expect(r.pmosOn).toBe(true);
    expect(r.nmosOn).toBe(false);
  });

  it('推挽 odr=0 → pmosOn=false, nmosOn=true', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'push-pull', odr: 0 }));
    expect(r.pmosOn).toBe(false);
    expect(r.nmosOn).toBe(true);
  });

  it('开漏 odr=1 → 都 false（两管都断）', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'open-drain', odr: 1 }));
    expect(r.pmosOn).toBe(false);
    expect(r.nmosOn).toBe(false);
  });

  it('开漏 odr=0 → pmosOn=false, nmosOn=true', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'open-drain', odr: 0 }));
    expect(r.pmosOn).toBe(false);
    expect(r.nmosOn).toBe(true);
  });

  it('输入模式 → 都 false', () => {
    const r = engine.evaluate(cfg({ direction: 'in' }));
    expect(r.pmosOn).toBe(false);
    expect(r.nmosOn).toBe(false);
  });
});

// ============================================================
// 不可变性 & 纯函数性
// ============================================================
describe('不可变性与纯函数性', () => {
  it('evaluate 不修改输入 config 对象', () => {
    const input = cfg({ direction: 'out', outType: 'push-pull', odr: 1, external: 'low' });
    const snapshot = JSON.stringify(input);
    engine.evaluate(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('相同 config 多次调用返回相同 derived', () => {
    const c = cfg({ direction: 'in', pull: 'up', external: 'floating' });
    const r1 = engine.evaluate(c);
    const r2 = engine.evaluate(c);
    expect(r1).toEqual(r2);
  });

  it('DEFAULT_CONFIG → 浮空 X + floating 警告', () => {
    const r = engine.evaluate(DEFAULT_CONFIG);
    expect(r.pinLevel).toBe('X');
    expect(r.idr).toBe('X');
    expect(r.warnings).toContain('floating');
    expect(r.contention).toBe(false);
    expect(r.pmosOn).toBe(false);
    expect(r.nmosOn).toBe(false);
  });
});

// ============================================================
// activePath 导通路径
// ============================================================
describe('activePath 导通路径标识', () => {
  it('输入+外部高 → 包含 external 和 schmitt', () => {
    const r = engine.evaluate(cfg({ direction: 'in', external: 'high' }));
    expect(r.activePath).toContain('external');
    expect(r.activePath).toContain('schmitt');
  });

  it('输入+上拉 → 包含 pull-up 和 schmitt', () => {
    const r = engine.evaluate(cfg({ direction: 'in', pull: 'up', external: 'floating' }));
    expect(r.activePath).toContain('pull-up');
    expect(r.activePath).toContain('schmitt');
  });

  it('推挽 odr=1 → 包含 pmos 和 schmitt', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'push-pull', odr: 1 }));
    expect(r.activePath).toContain('pmos');
    expect(r.activePath).toContain('schmitt');
  });

  it('推挽 odr=0 → 包含 nmos', () => {
    const r = engine.evaluate(cfg({ direction: 'out', outType: 'push-pull', odr: 0 }));
    expect(r.activePath).toContain('nmos');
  });
});
