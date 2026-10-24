// Genera docs/CONTENIDO_DOCENTE.md desde el código del aplicativo: npm run docs:docente
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { teacherContentText } = await server.ssrLoadModule('/src/erp/teacherContent.ts');
  writeFileSync('docs/CONTENIDO_DOCENTE.md', teacherContentText());
  console.log('docs/CONTENIDO_DOCENTE.md generado');
} finally {
  await server.close();
}
