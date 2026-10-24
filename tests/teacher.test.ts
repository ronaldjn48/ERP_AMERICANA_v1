import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/erp/missions';
import { parseBackup } from '../src/erp/report';
import { createWorkspace } from '../src/erp/seed';
import { teacherContentText } from '../src/erp/teacherContent';

describe('vista del docente', () => {
  it('el contenido incluye cada misión, cada respuesta y no tiene valores vacíos', () => {
    const text = teacherContentText();
    for (const m of MISSIONS) {
      expect(text).toContain(m.title);
      expect(text).toContain(m.takeaway);
      for (const o of m.objectives) if (o.kind === 'question') expect(text).toContain(o.solution);
    }
    expect(text).not.toMatch(/undefined|NaN|\[object/);
  });

  it('acepta un respaldo del ERP y rechaza textos que no lo son', () => {
    const s = createWorkspace({ name: 'Ana', group: 'G1' }, 'moda', 3);
    const ok = parseBackup(JSON.stringify(s));
    expect(typeof ok).not.toBe('string');
    expect(typeof parseBackup('hola')).toBe('string');
    expect(typeof parseBackup('{"version":1}')).toBe('string');
  });
});
