/**
 * GPIO 入门实验模块 — 纯 TS 仿真引擎
 *
 * 架构边界（强制）：
 * - 本文件只能依赖 gpioTypes.ts 中定义的数据结构和纯逻辑。
 * - 禁止 import React、Zustand、DOM API、SVG API、Toast、Store 或任何界面层模块。
 * - 禁止在 Engine 内部调用任何 Store 方法或 setState。
 * - evaluate 为纯函数：不修改输入 config，相同 config 必然返回相同 derived。
 *
 * 正确数据流：用户操作 → gpioStore（调用 Engine）→ GpioEngine.evaluate(config)
 *   → 返回 GpioDerived → Store 更新 derived → React UI 重渲染。
 */

import {
  DriveStrength,
  GpioConfig,
  GpioDerived,
  GpioWarning,
  Level,
} from './gpioTypes';

export class GpioEngine {
  /**
   * 对给定配置执行一次完整解析，返回派生状态。
   * 纯函数：不修改输入 config，不依赖任何外部状态。
   */
  evaluate(config: GpioConfig): GpioDerived {
    const drives = this.collectDrives(config);
    const activeDrives = drives.filter((d) => d !== 'z') as Exclude<DriveStrength, 'z'>[];

    const hasStrongH = activeDrives.includes('strong-h');
    const hasStrongL = activeDrives.includes('strong-l');
    const hasWeakH = activeDrives.includes('weak-h');
    const hasWeakL = activeDrives.includes('weak-l');

    // 1. 冲突检测：strong-h + strong-l 同时存在
    const contention = hasStrongH && hasStrongL;

    // 2. 解析引脚电平
    let pinLevel: Level;
    if (contention) {
      pinLevel = 'X';
    } else if (hasStrongH) {
      pinLevel = 1;
    } else if (hasStrongL) {
      pinLevel = 0;
    } else if (hasWeakH) {
      pinLevel = 1;
    } else if (hasWeakL) {
      pinLevel = 0;
    } else {
      pinLevel = 'X'; // 全高阻
    }

    // 3. 施密特整形 → IDR
    const idr = this.schmitt(pinLevel);

    // 4. P/N-MOS 导通状态
    const { pmosOn, nmosOn } = this.mosfetState(config);

    // 5. 内部上下拉是否接入（仅输入模式生效）
    const pullActive = config.direction === 'in' && config.pull !== 'none';

    // 6. 当前导通路径标识（供 UI 流光使用）
    const activePath = this.buildActivePath(config, pmosOn, nmosOn, pullActive);

    // 7. 警告
    const warnings: GpioWarning[] = [];
    if (contention) {
      warnings.push('contention');
    } else if (activeDrives.length === 0) {
      warnings.push('floating');
    }
    // 开漏释放（ODR=1）且外部断开 → 开漏不能主动输出高，需其他上拉来源
    if (
      config.direction === 'out' &&
      config.outType === 'open-drain' &&
      config.odr === 1 &&
      config.external === 'floating'
    ) {
      warnings.push('open-drain-needs-pull');
    }

    return {
      pinLevel,
      contention,
      pmosOn,
      nmosOn,
      pullActive,
      idr,
      activePath,
      warnings,
    };
  }

  /**
   * 收集引脚节点上所有驱动源（含 z）。
   * 输入模式下输出驱动器强制高阻；输出模式下内部上下拉被忽略。
   */
  collectDrives(config: GpioConfig): DriveStrength[] {
    const drives: DriveStrength[] = [];

    // 外部源
    if (config.external === 'high') drives.push('strong-h');
    else if (config.external === 'low') drives.push('strong-l');
    else drives.push('z'); // floating

    if (config.direction === 'out') {
      // 输出模式：输出驱动器生效，内部上下拉被忽略
      if (config.outType === 'push-pull') {
        if (config.odr === 1) drives.push('strong-h'); // P-MOS 导通
        else drives.push('strong-l'); // N-MOS 导通
      } else {
        // open-drain：P-MOS 恒关
        if (config.odr === 0) drives.push('strong-l'); // N-MOS 导通
        else drives.push('z'); // 两管都断（高阻）
      }
    } else {
      // 输入模式：输出驱动器强制高阻，内部上下拉生效
      drives.push('z'); // 输出驱动器高阻
      if (config.pull === 'up') drives.push('weak-h');
      else if (config.pull === 'down') drives.push('weak-l');
      else drives.push('z');
    }

    return drives;
  }

  /**
   * 施密特触发器（教学简化整形缓冲）。
   * H→1，L→0，X→X。不模拟具体阈值电压与迟滞。
   */
  schmitt(pinLevel: Level): Level {
    return pinLevel; // 三值模型下施密特仅做概念缓冲，电平直接透传
  }

  /** P/N-MOS 导通状态（教学简化） */
  private mosfetState(config: GpioConfig): { pmosOn: boolean; nmosOn: boolean } {
    if (config.direction !== 'out') {
      return { pmosOn: false, nmosOn: false };
    }
    if (config.outType === 'push-pull') {
      if (config.odr === 1) return { pmosOn: true, nmosOn: false };
      return { pmosOn: false, nmosOn: true };
    }
    // open-drain：P-MOS 恒关
    if (config.odr === 0) return { pmosOn: false, nmosOn: true };
    return { pmosOn: false, nmosOn: false };
  }

  /** 构建当前导通路径标识列表 */
  private buildActivePath(
    config: GpioConfig,
    pmosOn: boolean,
    nmosOn: boolean,
    pullActive: boolean,
  ): string[] {
    const path: string[] = [];

    // 外部激励路径
    if (config.external !== 'floating') {
      path.push('external');
    }

    // 输出驱动器路径
    if (config.direction === 'out') {
      if (pmosOn) path.push('pmos');
      if (nmosOn) path.push('nmos');
    }

    // 内部上下拉路径
    if (pullActive) {
      path.push(config.pull === 'up' ? 'pull-up' : 'pull-down');
    }

    // 施密特输入路径始终存在（IDR 始终读取引脚）
    path.push('schmitt');

    return path;
  }
}

/** 全局单例，供 Store 使用 */
export const gpioEngine = new GpioEngine();
