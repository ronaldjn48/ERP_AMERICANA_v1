# ERP Americana · Simulador de decisiones gerenciales

Aplicativo web educativo en el que el estudiante dirige una empresa durante 3 a 24 meses. La empresa integra cinco módulos: ERP (inventario y compras), CRM (clientes y servicio), e-commerce (tienda y pauta digital), automatización de procesos y finanzas. Cada mes el estudiante analiza el tablero, decide, ejecuta y recibe retroalimentación que explica qué pasó, por qué pasó y qué concepto aplicar.

El simulador funciona en el navegador, sin servidor, sin claves de API y sin conexión después de cargar. La narración por voz usa la síntesis del propio navegador.

## Funciones

| Área | Qué incluye |
|---|---|
| Configuración del estudiante | Nombre y grupo, 3 empresas (tecnología, moda, café), 3 niveles de dificultad, duración de 3 a 24 meses, mes de inicio, modo guiado y selección de módulos a controlar. |
| Panel docente | Semilla del mercado y código de partida (por ejemplo `TECH-B-12-7-123456-ECWAF-G`) o enlace directo. Todo el grupo enfrenta el mismo mercado y los mismos eventos, y los resultados se comparan en clase. |
| Decisiones | Precio, compra local, importación con TRM y aranceles, asesores, fidelización, Meta Ads, TikTok Ads, envío gratis, mejoras de la tienda, cuatro automatizaciones, préstamos y abonos. |
| Modelo | Demanda con estacionalidad colombiana (Carnaval, Día de la Madre, prima, Black Friday, diciembre), elasticidad precio, rendimientos decrecientes de la pauta, recompra y fuga de clientes, capacidad de servicio, inventario a costo promedio ponderado, obsolescencia, impuesto de renta de 35 %, sobregiro con cupo y liquidación por patrimonio negativo. |
| Eventos | Alza de la TRM, retraso en puerto, promoción del competidor, contenido viral, alza del CPC, falla de la pasarela, reclamo en redes, pedido corporativo (con decisión) y día sin IVA. |
| Retroalimentación | Hasta ocho observaciones por mes, clasificadas en crítico, alerta, logro y sugerencia, con el concepto clave. En modo guiado: pronóstico, compra sugerida, asesores necesarios, ROAS de equilibrio y caja comprometida. |
| Evaluación | Cuadro de mando integral (finanzas 40, clientes 30, procesos 30), nota de 0,0 a 5,0, fortalezas y aspectos a mejorar, cuatro preguntas de reflexión y diez preguntas tipo Saber Pro con explicación. |
| Evidencias | Informe imprimible o en PDF, datos en CSV (separador punto y coma para Excel en español) y evidencia en JSON. |
| Audio | Narración en español con selección de voz, velocidad y volumen, lectura automática de resultados y eventos, botones "Escuchar" en cada texto y efectos de sonido sintetizados. |
| Accesibilidad | Navegación por teclado, etiquetas en todos los controles, tablas alternativas para las gráficas, anuncios para lectores de pantalla y modo oscuro automático. |
| Diseño adaptable | Verificado sin desplazamiento horizontal en 320, 375, 414, 768, 1024 y 1440 px, en las 10 vistas. Las gráficas se dibujan al ancho real de la pantalla para que el texto conserve su tamaño en celular. |

## Estabilidad del audio

La narración se diseñó para no fallar en clase:

- Divide el texto en fragmentos de máximo 160 caracteres. Chrome corta las locuciones largas cerca de los 15 segundos.
- Espera la carga de voces y prefiere español de Colombia, luego Latinoamérica y luego España.
- Un temporizador de vigilancia avanza si el navegador no avisa que terminó un fragmento.
- La pausa cancela y la reanudación repite el fragmento en curso. Así funciona igual en Android, donde `pause()` falla.
- Un token de sesión descarta los avisos tardíos de una lectura detenida. Las lecturas nunca se mezclan.
- Al volver a una pestaña oculta, la lectura se reanuda.
- Desbloquea la voz y el audio en el primer clic, como exigen Safari en iOS y Chrome.
- Tras tres errores seguidos informa el problema en pantalla y el simulador sigue funcionando sin audio.
- Los efectos de sonido se generan con Web Audio API, con envolvente para evitar chasquidos, sin archivos externos.

Estas reglas tienen pruebas automatizadas en `tests/narrator.test.ts`.

## Uso local

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run check      # verificación de tipos + pruebas + build
npm run build      # genera la carpeta dist/
npm run build:incrustado  # un solo HTML para iframes: dist-embed/erp-americana.html
```

La versión incrustada carga React 18 desde cdnjs, no usa ventanas emergentes del navegador y reemplaza la impresión y las descargas por botones que copian el informe y los datos al portapapeles. Sirve para páginas que bloquean descargas, como algunas aulas virtuales.

La carpeta `dist/` usa rutas relativas. Se puede publicar en GitHub Pages, subir como paquete a un LMS (Moodle, Canvas, Blackboard) o abrir desde cualquier servidor estático.

## Publicación en GitHub Pages

El flujo `.github/workflows/ci.yml` ejecuta las pruebas y el build en cada push y pull request. En la rama `main` también publica el sitio. Para activarlo: Settings → Pages → Source: GitHub Actions.

## Estructura

```
src/
  engine/       Motor de simulación puro y determinista (sin React)
    simulation.ts   Cálculo de cada mes, indicadores y puntaje
    scenarios.ts    Empresas, costos y estacionalidad
    events.ts       Eventos aleatorios con semilla
    feedback.ts     Retroalimentación pedagógica y modo guiado
    config.ts       Dificultad, módulos, código de partida y validación
  audio/        Narrador por síntesis de voz y efectos de sonido
  content/      Resultados de aprendizaje, glosario, evaluación y reflexión
  components/   Pantallas: configuración, sesión informativa, decisiones, resultados, tablero, informe
tests/          Pruebas del motor (contabilidad, determinismo, límites) y del narrador
docs/           Auditoría técnica y guía docente
```

## Documentación

- [Guía docente](docs/GUIA_DOCENTE.md): resultados de aprendizaje, planeación de sesiones, uso del código de partida y rúbrica.
- [Auditoría técnica](docs/AUDITORIA.md): estado inicial del repositorio, hallazgos, correcciones y verificación.
