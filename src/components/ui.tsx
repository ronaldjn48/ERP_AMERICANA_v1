import { useId, useState, type ReactNode } from 'react';
import { narrator, useNarrator } from '../audio';
import { toSpeech } from '../engine/format';

export function SpeakButton({ text, id, label = 'Escuchar' }: { text: string; id: string; label?: string }) {
  const snap = useNarrator();
  if (!snap.supported || !snap.options.enabled) return null;
  const active = snap.currentId === id && snap.status !== 'idle';
  return (
    <button
      type="button"
      className={`btn-speak${active ? ' is-active' : ''}`}
      onClick={() => narrator.toggle(toSpeech(text), id)}
      aria-pressed={active}
      title={active ? 'Detener lectura' : 'Leer en voz alta'}
    >
      <span aria-hidden="true">{active ? '■' : '🔊'}</span> {active ? 'Detener' : label}
    </button>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  help?: ReactNode;
  disabled?: boolean;
  suffix?: string;
}

export function NumberField({ label, value, onChange, min, max, step, format, help, disabled, suffix }: NumberFieldProps) {
  const id = useId();
  const clampNum = (v: number) => Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
  return (
    <div className={`field${disabled ? ' is-disabled' : ''}`}>
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="field-value">
          {format ? format(value) : value}
          {suffix ? ` ${suffix}` : ''}
        </output>
      </div>
      <div className="field-controls">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={`${label} (control deslizante)`}
          onChange={(e) => onChange(clampNum(Number(e.target.value)))}
        />
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(clampNum(Number(e.target.value)))}
        />
      </div>
      {help ? <p className="field-help">{help}</p> : null}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  help,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  help?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={`toggle${disabled ? ' is-disabled' : ''}`}>
      <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        <span className="toggle-track" aria-hidden="true">
          <span className="toggle-thumb" />
        </span>
        <span className="toggle-label">{label}</span>
      </label>
      {help ? <p className="field-help">{help}</p> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'good' | 'bad' | 'warn' | 'neutral';
}) {
  return (
    <div className={`stat tone-${tone ?? 'neutral'}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub ? <span className="stat-sub">{sub}</span> : null}
    </div>
  );
}

export function Meter({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const ratio = Math.max(0, Math.min(1, value / max));
  const tone = ratio >= 0.8 ? 'good' : ratio >= 0.5 ? 'warn' : 'bad';
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <strong>
          {value.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
          {suffix ?? ` / ${max}`}
        </strong>
      </div>
      <div className="meter-track" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        <div className={`meter-fill tone-${tone}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

/**
 * Botón con confirmación dentro de la página. Reemplaza window.confirm(), que los iframes
 * (aulas virtuales, páginas incrustadas) bloquean o devuelven siempre "cancelar".
 */
export function ConfirmAction({
  label,
  question,
  confirmLabel,
  onConfirm,
  className = 'btn-secondary',
}: {
  label: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <div className="confirm" role="alertdialog" aria-label={question}>
      <p>{question}</p>
      <div className="row wrap">
        <button
          type="button"
          className="btn-primary"
          autoFocus
          onClick={() => {
            setAsking(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setAsking(false)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
