import { useState } from 'react';
import { ConfirmAction } from '../components/ui';
import { copyText, EMBED } from '../export';
import { cop } from '../engine/format';
import { getScenario } from '../engine/scenarios';
import { CORE_MODULES, MODULE_LABEL } from '../erp/meta';
import { updateSettings } from '../erp/ops';
import { ALL_MODULES } from '../erp/seed';
import { replaceWorkspace, resetWorkspace, run, toast } from '../erp/store';
import type { ErpState, Settings } from '../erp/types';
import { CheckField, FormGrid, NumberInput, PageHeader, Section, SelectField, TextArea, TextField } from '../ui/kit';

export function SettingsModule({ s }: { s: ErpState }) {
  const [f, setF] = useState<Settings>(s.settings);
  const [profile, setProfile] = useState(s.profile);
  const [backup, setBackup] = useState('');
  const set = (p: Partial<Settings>) => setF({ ...f, ...p });
  const dirty = JSON.stringify(f) !== JSON.stringify(s.settings);

  return (
    <div className="page">
      <PageHeader title="Configuración" crumbs={['Plataforma', 'Configuración']} subtitle={`${getScenario(s.scenarioId).sector} · semilla del mercado ${s.seed}`} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run((x) => updateSettings(x, f), 'Configuración guardada');
        }}
      >
        <Section title="Datos de la empresa">
          <FormGrid>
            <TextField label="Razón social" value={f.companyName} onChange={(v) => set({ companyName: v })} required />
            <TextField label="NIT" value={f.nit} onChange={(v) => set({ nit: v.replace(/[^\d-]/g, '') })} placeholder="901234567-8" help="9 dígitos y dígito de verificación." inputMode="numeric" />
            <TextField label="Ciudad" value={f.city} onChange={(v) => set({ city: v })} placeholder="Ciudad de la sede principal" help="Escribe la ciudad donde estudias o trabajas; la empresa vende a todo el país." />
            <TextField label="Dirección" value={f.address} onChange={(v) => set({ address: v })} placeholder="Calle 72 # 45-10" />
          </FormGrid>
        </Section>

        <Section title="Parámetros de operación">
          <FormGrid>
            <NumberInput label="Tarifa de IVA" value={Math.round(f.ivaRate * 100)} onChange={(v) => set({ ivaRate: v / 100 })} max={30} suffix="%" help="Tarifa general en Colombia: 19 %." />
            <NumberInput label="Plazo de pago por defecto" value={f.defaultPaymentTerm} onChange={(v) => set({ defaultPaymentTerm: Math.round(v) })} suffix="días" />
            <NumberInput label="Límite para aprobar órdenes de compra" value={f.poApprovalLimit} onChange={(v) => set({ poApprovalLimit: v })} step={500000} suffix="COP" help={`Actual: ${cop(s.settings.poApprovalLimit)}`} />
            <SelectField
              label="Actividad del mercado"
              value={String(f.marketIntensity)}
              onChange={(v) => set({ marketIntensity: Number(v) })}
              options={[
                { value: '0.6', label: 'Tranquila (menos pedidos y casos)' },
                { value: '1', label: 'Normal' },
                { value: '1.4', label: 'Exigente (más pedidos y casos)' },
              ]}
            />
            <CheckField label="Permitir despachar sin inventario (stock negativo)" checked={f.allowNegativeStock} onChange={(v) => set({ allowNegativeStock: v })} help="No recomendado: genera diferencias entre el kardex y la bodega." />
          </FormGrid>
        </Section>

        <Section title="Módulos visibles">
          <p className="muted small">El docente puede ocultar módulos para enfocar la práctica. Inicio, Misiones y Configuración siempre están visibles.</p>
          <div className="module-toggles">
            {ALL_MODULES.filter((m) => !CORE_MODULES.includes(m)).map((m) => (
              <CheckField key={m} label={MODULE_LABEL[m]} checked={f.enabledModules[m] !== false} onChange={(v) => set({ enabledModules: { ...f.enabledModules, [m]: v } })} />
            ))}
          </div>
        </Section>
        <div className="row end sticky-save">
          <button type="button" className="btn-secondary" disabled={!dirty} onClick={() => setF(s.settings)}>
            Descartar cambios
          </button>
          <button type="submit" className="btn-primary" disabled={!dirty}>
            Guardar configuración
          </button>
        </div>
      </form>

      <Section title="Perfil del estudiante">
        <FormGrid>
          <TextField label="Nombre completo" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} required />
          <TextField label="Curso, grupo o ficha" value={profile.group} onChange={(v) => setProfile({ ...profile, group: v })} />
        </FormGrid>
        <button
          type="button"
          className="btn-secondary"
          disabled={profile.name.trim().length < 2 || JSON.stringify(profile) === JSON.stringify(s.profile)}
          onClick={() => {
            run((x) => ({ ...x, profile: { name: profile.name.trim(), group: profile.group.trim() } }), 'Perfil actualizado');
          }}
        >
          Guardar perfil
        </button>
      </Section>

      <Section title="Respaldo de la práctica">
        <p className="muted">
          Copia el respaldo para entregarlo al docente o continuar en otro equipo. Para restaurar, pega un respaldo y presiona Restaurar.
        </p>
        <div className="row wrap">
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              const ok = await copyText(JSON.stringify(s));
              toast(ok ? 'exito' : 'error', ok ? 'Respaldo copiado al portapapeles' : 'El navegador no permitió copiar', ok ? `${Math.round(JSON.stringify(s).length / 1024)} KB` : undefined);
            }}
          >
            Copiar respaldo
          </button>
          {!EMBED ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const blob = new Blob([JSON.stringify(s)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `erp-americana-respaldo-dia-${s.day}.json`;
                a.click();
                window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
              }}
            >
              Descargar respaldo
            </button>
          ) : null}
        </div>
        <TextArea label="Pegar respaldo" value={backup} onChange={setBackup} rows={3} />
        <button
          type="button"
          className="btn-secondary"
          disabled={!backup.trim()}
          onClick={() => {
            try {
              const data = JSON.parse(backup) as ErpState;
              if (data.version !== 1 || !Array.isArray(data.products) || !Array.isArray(data.journal)) throw new Error('formato');
              replaceWorkspace(data);
              setBackup('');
              toast('exito', 'Respaldo restaurado', `Día ${data.day} · ${data.settings.companyName}`);
            } catch {
              toast('error', 'El respaldo no es válido', 'Copia el texto completo generado por el botón Copiar respaldo.');
            }
          }}
        >
          Restaurar
        </button>
      </Section>

      <Section title="Reiniciar">
        <p className="muted">Borra la empresa, los movimientos y el progreso de misiones de este navegador. El simulador gerencial conserva su propia partida.</p>
        <ConfirmAction label="Reiniciar espacio de trabajo" question="¿Borrar toda la práctica del ERP? Esta acción no se puede deshacer." confirmLabel="Sí, reiniciar" onConfirm={resetWorkspace} />
      </Section>
    </div>
  );
}
