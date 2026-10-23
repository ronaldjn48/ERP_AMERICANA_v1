// Arma la versión incrustada en un solo HTML: dist-embed/erp-americana.html
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

execSync('npx vite build --config vite.embed.config.ts', { stdio: 'inherit' });
const js = readFileSync('dist-embed/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync('dist-embed/app.css', 'utf8');
const html = `<title>ERP Americana</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Simulador educativo de toma de decisiones gerenciales con ERP, CRM, e-commerce y automatización de procesos.">
<style>${css}</style>
<div id="root"></div>
<noscript>Este simulador necesita JavaScript habilitado.</noscript>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js}</script>
`;
writeFileSync('dist-embed/erp-americana.html', html);
console.log(`dist-embed/erp-americana.html: ${(html.length / 1024).toFixed(0)} KB`);
