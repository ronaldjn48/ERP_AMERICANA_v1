import { cop, millions, num, pct } from '../engine/format';
import { MONTHS, getScenario } from '../engine/scenarios';
import type { PeriodResult, SimConfig, SimState } from '../engine/types';
import { LineChart } from './Charts';

const C = {
  a: 'var(--series-1)',
  b: 'var(--series-2)',
  c: 'var(--series-3)',
  d: 'var(--series-4)',
};

export function historyLabels(history: PeriodResult[]): string[] {
  return history.map((r) => MONTHS[r.month].slice(0, 3));
}

export function Dashboard({ state, config }: { state: SimState; config: SimConfig }) {
  const h = state.history;
  const s = getScenario(config.scenarioId);
  const labels = historyLabels(h);
  if (h.length === 0) {
    return (
      <section className="card">
        <h2>Tablero de control</h2>
        <p className="muted">El tablero muestra la evolución de tus indicadores. Ejecuta el primer mes para ver las gráficas.</p>
      </section>
    );
  }
  return (
    <div className="dashboard">
      <div className="grid-2">
        <section className="card">
          <LineChart
            title="Ventas y utilidad neta (millones de pesos)"
            labels={labels}
            format={millions}
            series={[
              { name: 'Ingresos', values: h.map((r) => r.revenue), color: C.a },
              { name: 'Utilidad neta', values: h.map((r) => r.netIncome), color: C.b },
            ]}
          />
        </section>
        <section className="card">
          <LineChart
            title="Caja, deuda y patrimonio (millones de pesos)"
            labels={labels}
            format={millions}
            series={[
              { name: 'Caja', values: h.map((r) => r.cashEnd), color: C.a },
              { name: 'Deuda + sobregiro', values: h.map((r) => r.debt + r.overdraft), color: C.d, dashed: true },
              { name: 'Patrimonio', values: h.map((r) => r.equity), color: C.c },
            ]}
          />
        </section>
        <section className="card">
          <LineChart
            title={`Demanda, ventas e inventario (${s.unitName})`}
            labels={labels}
            format={num}
            series={[
              { name: 'Demanda', values: h.map((r) => r.demandUnits), color: C.d, dashed: true },
              { name: 'Vendidas', values: h.map((r) => r.unitsSold), color: C.a },
              { name: 'Inventario final', values: h.map((r) => r.endInventory), color: C.c },
            ]}
          />
        </section>
        <section className="card">
          <LineChart
            title="Satisfacción del cliente y nivel de servicio (%)"
            labels={labels}
            format={(v) => `${Math.round(v)}`}
            reference={{ value: 95, label: 'Meta de servicio 95 %' }}
            series={[
              { name: 'Satisfacción', values: h.map((r) => r.satisfaction), color: C.b },
              { name: 'Nivel de servicio', values: h.map((r) => r.fillRate * 100), color: C.a },
            ]}
          />
        </section>
        <section className="card">
          <LineChart
            title="ROAS frente al ROAS de equilibrio"
            labels={labels}
            format={(v) => v.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
            series={[
              { name: 'ROAS Meta', values: h.map((r) => r.kpis.roasMeta ?? 0), color: C.a },
              { name: 'ROAS TikTok', values: h.map((r) => r.kpis.roasTiktok ?? 0), color: C.c },
              { name: 'Equilibrio', values: h.map((r) => r.kpis.breakEvenRoas ?? 0), color: C.d, dashed: true },
            ]}
          />
        </section>
        <section className="card">
          <LineChart
            title="Puntaje mensual del cuadro de mando (0 a 100)"
            labels={labels}
            format={(v) => `${Math.round(v)}`}
            reference={{ value: 60, label: 'Aprobación (3,0)' }}
            series={[{ name: 'Puntaje', values: h.map((r) => r.score.total), color: C.b }]}
          />
        </section>
      </div>

      <section className="card">
        <h3>Historial de decisiones y resultados</h3>
        <div className="table-scroll">
          <table className="table table-history">
            <thead>
              <tr>
                <th scope="col">Mes</th>
                <th scope="col">Precio</th>
                <th scope="col">Compra</th>
                <th scope="col">Pauta</th>
                <th scope="col">Asesores</th>
                <th scope="col">Vendidas</th>
                <th scope="col">Servicio</th>
                <th scope="col">Ingresos</th>
                <th scope="col">Utilidad</th>
                <th scope="col">Caja</th>
                <th scope="col">Satisf.</th>
                <th scope="col">Puntaje</th>
              </tr>
            </thead>
            <tbody>
              {h.map((r) => (
                <tr key={r.period}>
                  <th scope="row">
                    {r.period}. {MONTHS[r.month].slice(0, 3)}
                  </th>
                  <td>{cop(r.decisions.price)}</td>
                  <td>{num(r.unitsPurchasedLocal + r.unitsPurchasedImport)}</td>
                  <td>{millions(r.decisions.metaBudget + r.decisions.tiktokBudget)}</td>
                  <td>{r.decisions.agents}</td>
                  <td>{num(r.unitsSold)}</td>
                  <td className={r.fillRate < 0.95 ? 'bad-text' : ''}>{pct(r.fillRate, 0)}</td>
                  <td>{millions(r.revenue)}</td>
                  <td className={r.netIncome < 0 ? 'bad-text' : 'good-text'}>{millions(r.netIncome)}</td>
                  <td>{millions(r.cashEnd)}</td>
                  <td>{num(r.satisfaction)}</td>
                  <td>{Math.round(r.score.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
