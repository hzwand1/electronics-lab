import { useUIStore } from '../store/uiStore';
import { TruthTablePanel } from './TruthTablePanel';
import { DeviceInfoPanel } from './DeviceInfoPanel';

export function BottomPanel() {
  const activePanel = useUIStore((s) => s.activePanel);
  const setActivePanel = useUIStore((s) => s.setActivePanel);

  return (
    <section className="bottom-panel">
      <div className="tabs" role="tablist">
        <button
          role="tab"
          className={`tab ${activePanel === 'truthTable' ? 'active' : ''}`}
          onClick={() => setActivePanel('truthTable')}
        >
          真值表
        </button>
        <button
          role="tab"
          className={`tab ${activePanel === 'deviceInfo' ? 'active' : ''}`}
          onClick={() => setActivePanel('deviceInfo')}
        >
          器件信息
        </button>
      </div>
      <div className="panel-body">
        {activePanel === 'truthTable' ? <TruthTablePanel /> : <DeviceInfoPanel />}
      </div>
    </section>
  );
}
