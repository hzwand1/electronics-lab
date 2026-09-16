/**
 * GPIO 入门模块 — G0 占位视图
 *
 * 目的：验证数据链路  用户操作 → Store → Engine → Derived → UI
 * 不包含任何 G1 及以后的视觉功能（SVG 动画台、流光、MOS 图形等）。
 */

import { useGpioStore } from '../store/gpioStore';
import { Direction, External, OutType, Pull } from '../engine/gpioTypes';
import './gpioPlaceholder.css';

export function GpioPlaceholder() {
  const config = useGpioStore((s) => s.config);
  const derived = useGpioStore((s) => s.derived);
  const setDirection = useGpioStore((s) => s.setDirection);
  const setPull = useGpioStore((s) => s.setPull);
  const setOutType = useGpioStore((s) => s.setOutType);
  const setOdr = useGpioStore((s) => s.setOdr);
  const setExternal = useGpioStore((s) => s.setExternal);
  const resetConfig = useGpioStore((s) => s.resetConfig);

  return (
    <div className="gpio-placeholder">
      <div className="gpio-placeholder-header">
        <h2>GPIO 入门模块</h2>
        <span className="gpio-placeholder-badge">G0 占位视图 · 开发中</span>
      </div>

      <p className="gpio-placeholder-desc">
        本视图用于验证数据链路：用户操作 → Store → Engine → Derived → UI。
        G1 起将替换为完整的 GPIO 位单元交互动画台。
      </p>

      <div className="gpio-placeholder-body">
        {/* 配置控件 */}
        <div className="gpio-placeholder-controls">
          <h3>配置（config）</h3>

          <label>
            方向 direction
            <select value={config.direction} onChange={(e) => setDirection(e.target.value as Direction)}>
              <option value="in">输入 in</option>
              <option value="out">输出 out</option>
            </select>
          </label>

          <label>
            内部上下拉 pull{config.direction === 'out' && '（输出模式下忽略）'}
            <select
              value={config.pull}
              onChange={(e) => setPull(e.target.value as Pull)}
              disabled={config.direction === 'out'}
            >
              <option value="none">无 none</option>
              <option value="up">上拉 up</option>
              <option value="down">下拉 down</option>
            </select>
          </label>

          <label>
            输出类型 outType
            <select value={config.outType} onChange={(e) => setOutType(e.target.value as OutType)}>
              <option value="push-pull">推挽 push-pull</option>
              <option value="open-drain">开漏 open-drain</option>
            </select>
          </label>

          <label>
            ODR（输出寄存器）
            <select value={config.odr} onChange={(e) => setOdr(Number(e.target.value) as 0 | 1)}>
              <option value={0}>0</option>
              <option value={1}>1</option>
            </select>
          </label>

          <label>
            外部激励 external
            <select value={config.external} onChange={(e) => setExternal(e.target.value as External)}>
              <option value="high">高电平 high</option>
              <option value="low">低电平 low</option>
              <option value="floating">断开 floating</option>
            </select>
          </label>

          <button className="gpio-placeholder-reset" onClick={resetConfig}>
            重置为默认配置
          </button>
        </div>

        {/* 派生状态显示 */}
        <div className="gpio-placeholder-derived">
          <h3>派生状态（derived）</h3>
          <div className="gpio-placeholder-readout">
            <div>
              <span className="readout-label">引脚电平 pinLevel</span>
              <span className={`readout-value readout-${derived.pinLevel === 'X' ? 'x' : derived.pinLevel === 1 ? 'high' : 'low'}`}>
                {derived.pinLevel}
              </span>
            </div>
            <div>
              <span className="readout-label">IDR（输入寄存器）</span>
              <span className={`readout-value readout-${derived.idr === 'X' ? 'x' : derived.idr === 1 ? 'high' : 'low'}`}>
                {derived.idr}
              </span>
            </div>
            <div>
              <span className="readout-label">冲突 contention</span>
              <span className={`readout-value ${derived.contention ? 'readout-contention' : ''}`}>
                {derived.contention ? 'true ⚠' : 'false'}
              </span>
            </div>
            <div>
              <span className="readout-label">P-MOS</span>
              <span className="readout-value">{derived.pmosOn ? '导通' : '断开'}</span>
            </div>
            <div>
              <span className="readout-label">N-MOS</span>
              <span className="readout-value">{derived.nmosOn ? '导通' : '断开'}</span>
            </div>
            <div>
              <span className="readout-label">上下拉接入</span>
              <span className="readout-value">{derived.pullActive ? '是' : '否'}</span>
            </div>
            <div>
              <span className="readout-label">警告 warnings</span>
              <span className="readout-value">
                {derived.warnings.length > 0 ? derived.warnings.join(', ') : '（无）'}
              </span>
            </div>
            <div>
              <span className="readout-label">导通路径 activePath</span>
              <span className="readout-value">{derived.activePath.join(' → ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* JSON 原始数据 */}
      <div className="gpio-placeholder-json">
        <details>
          <summary>查看 config / derived 原始 JSON</summary>
          <div className="gpio-placeholder-json-grid">
            <pre>{JSON.stringify(config, null, 2)}</pre>
            <pre>{JSON.stringify(derived, null, 2)}</pre>
          </div>
        </details>
      </div>
    </div>
  );
}
