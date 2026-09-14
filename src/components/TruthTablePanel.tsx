import { useMemo } from 'react';
import { generateTruthTable } from '../engine/truthTable';
import { engine } from '../store/circuitStore';
import { useCircuitStore } from '../store/circuitStore';

export function TruthTablePanel() {
  const circuit = useCircuitStore((s) => s.circuit);
  const table = useMemo(() => generateTruthTable(circuit, engine), [circuit]);

  if (!table.ok) {
    return (
      <div className="panel-empty">
        <div className="panel-empty-title">真值表</div>
        <p>{table.message}</p>
      </div>
    );
  }

  return (
    <div className="truth-wrap">
      <div className="truth-scroll">
        <table className="truth-table">
          <thead>
            <tr>
              {table.inputs.map((c) => (
                <th key={c.deviceId}>{c.label}</th>
              ))}
              <th className="sep" />
              {table.outputs.map((c) => (
                <th key={c.deviceId}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {row.inputs.map((v, j) => (
                  <td key={j} className={v === 1 ? 'v1' : 'v0'}>
                    {v}
                  </td>
                ))}
                <td className="sep" />
                {row.outputs.map((v, j) => (
                  <td key={j} className={v === 'X' ? 'vx' : v === 1 ? 'v1' : 'v0'}>
                    {v === 'X' ? '—' : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.hasUndefined && (
        <div className="truth-note">存在未连接输入，部分输出未定义（—）。</div>
      )}
    </div>
  );
}
