import { useId, useState } from 'react';

export interface Series {
  name: string;
  values: number[];
  color: string;
  dashed?: boolean;
}

interface LineChartProps {
  title: string;
  labels: string[];
  series: Series[];
  format: (v: number) => string;
  /** Línea de referencia horizontal (por ejemplo, la meta). */
  reference?: { value: number; label: string };
  minZero?: boolean;
}

const W = 640;
const H = 240;
const PAD = { l: 64, r: 16, t: 16, b: 32 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

export function LineChart({ title, labels, series, format, reference, minZero = true }: LineChartProps) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values).concat(reference ? [reference.value] : []);
  if (labels.length === 0 || all.length === 0) {
    return <p className="empty">La gráfica aparece después del primer mes.</p>;
  }
  let min = Math.min(...all, minZero ? 0 : Infinity);
  let max = Math.max(...all, minZero ? 0 : -Infinity);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const ticks = niceTicks(min, max);
  min = Math.min(min, ticks[0]);
  max = Math.max(max, ticks[ticks.length - 1]);
  const x = (i: number) => PAD.l + (labels.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (labels.length - 1));
  const y = (v: number) => PAD.t + ((max - v) * (H - PAD.t - PAD.b)) / (max - min);
  const step = labels.length > 1 ? (W - PAD.l - PAD.r) / (labels.length - 1) : W;

  return (
    <figure className="chart">
      <figcaption id={`${id}-t`}>{title}</figcaption>
      <div className="chart-legend" aria-hidden="true">
        {series.map((s) => (
          <span key={s.name}>
            <i style={{ background: s.color }} className={s.dashed ? 'dashed' : ''} />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="axis">
              {format(t)}
            </text>
          </g>
        ))}
        {min < 0 && max > 0 ? <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="zero" /> : null}
        {reference ? (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(reference.value)} y2={y(reference.value)} className="reference" />
            <text x={W - PAD.r} y={y(reference.value) - 4} textAnchor="end" className="axis">
              {reference.label}
            </text>
          </g>
        ) : null}
        {labels.map((l, i) =>
          labels.length <= 12 || i % Math.ceil(labels.length / 12) === 0 ? (
            <text key={i} x={x(i)} y={H - 10} textAnchor="middle" className="axis">
              {l}
            </text>
          ) : null,
        )}
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeDasharray={s.dashed ? '6 4' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : 3} fill={s.color} />
            ))}
          </g>
        ))}
        {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className="cursor" /> : null}
        {labels.map((_, i) => (
          <rect
            key={i}
            x={x(i) - step / 2}
            y={PAD.t}
            width={step}
            height={H - PAD.t - PAD.b}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null ? (
        <div className="chart-tip" aria-hidden="true">
          <strong>{labels[hover]}</strong>
          {series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} />
              {s.name}: {format(s.values[hover])}
            </span>
          ))}
        </div>
      ) : null}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            {series.map((s) => (
              <th key={s.name} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={i}>
              <th scope="row">{l}</th>
              {series.map((s) => (
                <td key={s.name}>{format(s.values[i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
