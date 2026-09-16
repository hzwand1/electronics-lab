/**
 * Hardware Lab — Parts Library（元件库，S2-2 基础版）
 *
 * S2-2 只有 Generic Component 一个占位元件，用于验证放置流程。
 * 未来 S2-3+ 会逐步加入 3.3V / GND / Resistor / LED / Button / Switch / Buzzer。
 *
 * 点击元件 → 进入 placement mode → 用户在面包板空白处点击完成放置。
 * 再次点击同一元件或按 Esc 取消 placement。
 */
import type { ComponentType } from '../types/componentTypes';

interface PartsLibraryProps {
  placementType: ComponentType | null;
  onSelect: (type: ComponentType) => void;
}

export function PartsLibrary({ placementType, onSelect }: PartsLibraryProps) {
  const isActive = placementType === 'generic';

  return (
    <aside className="hw-parts-library">
      <h3 className="hw-parts-title">元件库</h3>

      <div className="hw-part-group">
        <div className="hw-part-group-title">Basic</div>

        <button
          type="button"
          className={`hw-part-item ${isActive ? 'hw-part-item-active' : ''}`}
          onClick={() => onSelect('generic')}
          title="S2-2 UI 验证用占位元件，不是真实电子元件"
        >
          <span className="hw-part-icon">
            <svg viewBox="0 0 32 20" width="28" height="18" aria-hidden="true">
              <rect x="6" y="2" width="20" height="16" rx="3" className="hw-part-icon-body" />
              <circle cx="3" cy="10" r="2.5" className="hw-part-icon-pin" />
              <circle cx="29" cy="10" r="2.5" className="hw-part-icon-pin" />
            </svg>
          </span>
          <span className="hw-part-name">Generic Component</span>
        </button>
      </div>

      <p className="hw-parts-hint">
        {isActive
          ? '放置模式：在面包板空白处点击放置；再次点击或按 Esc 取消。'
          : '点击元件后在面包板空白处放置。'}
      </p>
    </aside>
  );
}
