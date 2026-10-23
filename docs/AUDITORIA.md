# Auditoría técnica del proyecto ERP Americana

Fecha: 23 de octubre de 2026.

## 1. Estado inicial

Se revisaron los dos repositorios del proyecto en GitHub, en todas sus ramas y su historial.

| Repositorio | Contenido encontrado | Historial |
|---|---|---|
| `ronaldjn48/ERP_AMERICANA` | Solo `README.md` con una línea: "Un simulador educativo que integra un ERP con CRM, el Ecommerce y la automatización de procesos". | 1 commit ("Initial commit"), rama `main`. |
| `ronaldjn48/ERP_AMERICANA_v1` | Solo `README.md` con la plantilla genérica de Google AI Studio ("Built with AI Studio"). | 1 commit ("Initial commit"), rama `main`. |

Ninguno de los dos repositorios contenía código fuente, dependencias, configuración de build, pruebas ni archivos de audio. El README de `ERP_AMERICANA_v1` indica que la aplicación se generó en Google AI Studio, pero solo se subió la plantilla del README y no el código exportado.

## 2. Hallazgos

| # | Hallazgo | Severidad | Acción |
|---|---|---|---|
| H1 | No existe código del aplicativo en ningún repositorio. | Crítica | Se construyó el simulador completo en `ERP_AMERICANA_v1`. |
| H2 | El README de `v1` es la plantilla de AI Studio y no describe el proyecto. | Media | Se reemplazó por documentación del producto. |
| H3 | Sin `.gitignore`, sin control de versiones de dependencias ni lockfile. | Media | Se agregaron `.gitignore`, `package-lock.json` y versiones exactas. |
| H4 | Sin pruebas ni integración continua. | Alta | Se agregaron 40 pruebas automatizadas y un flujo de GitHub Actions. |
| H5 | Las aplicaciones de AI Studio suelen depender de la API de Gemini con clave en el navegador y de audio por streaming en la nube. Esto expone la clave y vuelve inestable el audio en clase (red, cuotas, latencia). | Alta | El simulador no usa servicios externos. La voz usa la síntesis del navegador con las protecciones descritas en el README. |
| H6 | El objetivo pedagógico no estaba definido en el repositorio. | Alta | Se definieron seis resultados de aprendizaje, rúbrica, glosario, evaluación y reflexión (ver la guía docente). |

## 3. Decisiones de ingeniería

1. Motor de simulación puro y determinista, separado de la interfaz. Con la misma semilla y las mismas decisiones produce el mismo resultado. Esto permite comparar estudiantes y probar el modelo.
2. Todas las decisiones se validan en el motor (`sanitizeDecisions`). Un valor fuera de rango desde la interfaz no puede romper la simulación.
3. La contabilidad cumple la ecuación patrimonial: la variación del patrimonio de cada mes es igual a la utilidad neta. Una prueba lo verifica en los 3 escenarios y los 3 niveles.
4. Las compras se limitan por caja y cupo de sobregiro. La empresa se liquida si el patrimonio queda negativo. Esto elimina el error típico de los simuladores en que la deuda crece sin límite.
5. El modelo se calibró con tres políticas de prueba en 12 meses (nivel intermedio):

| Escenario | Gestión informada | Política sin cambios | Gestión descuidada |
|---|---|---|---|
| Americana Tech | 4,5 | 3,5 | 2,5 |
| Moda Caribe | 4,6 | 3,9 | 3,6 |
| Café del Atlántico | 4,7 | 3,8 | 3,7 |

   La gestión descuidada sube el precio 40 %, compra en exceso, invierte de más en pauta y deja un solo asesor. Se ajustaron elasticidades, costos y el cuadro de mando para que el precio alto no fuera una estrategia dominante.
6. Persistencia local tolerante a fallos: si el navegador bloquea el almacenamiento (modo privado o LMS en iframe), la partida sigue en memoria.
7. Un límite de errores (`ErrorBoundary`) evita la pantalla en blanco y ofrece recuperar la partida.
8. Dependencias: solo React en producción. `npm audit` reporta 0 vulnerabilidades.

## 4. Verificación realizada

| Verificación | Resultado |
|---|---|
| `tsc --noEmit` (modo estricto) | Sin errores. |
| `vitest run` | 40 de 40 pruebas aprobadas (27 del motor, 13 del audio). |
| `vite build` | Build de producción de 310 kB (98 kB comprimido). |
| Prueba de extremo a extremo en Chromium | Configuración, sesión informativa, 12 meses con evento corporativo, recarga y reanudación de la partida, tablero, glosario, informe final y evaluación sin errores de consola. |
| Narración en el navegador | 32 locuciones en la prueba, ningún fragmento mayor a 160 caracteres, idioma es-CO. |
| Celular (375 px) | Sin desplazamiento horizontal en configuración, decisiones y resultados. |
| Enlace del docente | El código en la URL bloquea la configuración y la muestra al estudiante. |

## 5. Recomendaciones pendientes

1. Activar GitHub Pages (Settings → Pages → Source: GitHub Actions) para publicar el simulador.
2. Si el código original de AI Studio existe, subirlo a una rama aparte para compararlo con esta versión antes de descartarlo.
3. Para reportes centralizados de notas, conectar la exportación JSON con el LMS institucional o con un formulario. La versión actual guarda los datos solo en el navegador del estudiante por privacidad.
