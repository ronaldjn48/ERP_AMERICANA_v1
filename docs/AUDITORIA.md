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
| Americana Moda | 4,6 | 3,9 | 3,6 |
| Americana Café | 4,7 | 3,8 | 3,7 |

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
| Diseño adaptable | Prueba automática en 6 anchos (320, 375, 414, 768, 1024 y 1440 px) y 10 vistas (configuración, panel de audio, panel docente, sesión informativa, decisiones, decisiones con evento, resultados, tablero, glosario e informe final): 0 px de desplazamiento horizontal en la versión completa y en la incrustada. |
| Enlace del docente | El código en la URL bloquea la configuración y la muestra al estudiante. |

## 5. Correcciones de diseño adaptable (segunda revisión)

| Problema encontrado | Corrección |
|---|---|
| El tablero se desbordaba 77 px a 320 px: las tablas ocultas para lectores de pantalla ignoraban el ancho de 1 px. | Las tablas quedan dentro de un contenedor recortado. |
| En celular el texto de las gráficas medía cerca de 5 px. | Cada gráfica se dibuja al ancho real de su contenedor y reduce las etiquetas del eje X si no caben. |
| Las pestañas se cortaban en celular. | Cuadrícula de 2 × 2 por debajo de 560 px. |
| Cifras partidas en dos líneas ("$" arriba y el número abajo). | Espacio no separable en moneda, porcentajes y millones. |
| La barra de audio no cabía a 320 px mientras narraba. | El botón muestra solo el ícono en pantallas angostas. |
| Las confirmaciones usaban `window.confirm`, que los iframes de las aulas virtuales bloquean. | Confirmación dentro de la página. |

## 6. Tercera revisión: transformación en suite ERP

Solicitud: que el aplicativo se parezca a un ERP real, con múltiples módulos, registros editables y configurables, una práctica o misión por módulo con gamificación y navegación de software empresarial, conservando el audio.

### Arquitectura agregada

| Capa | Archivos | Responsabilidad |
|---|---|---|
| Datos y reglas de negocio | `src/erp/ops.ts`, `accounts.ts`, `day.ts`, `seed.ts` | Operaciones puras con validación (NIT, cupo de crédito, inventario disponible, saldo en bancos, partida doble), asientos automáticos con PUC, kardex a costo promedio y cierre diario determinista con eventos de mercado y reglas de automatización. |
| Gamificación | `src/erp/missions.ts` | 20 misiones con objetivos que se verifican en los datos, preguntas de cálculo con datos propios del estudiante, XP, 6 niveles y 10 insignias. Las acciones de las automatizaciones no cuentan como acciones del estudiante. |
| Estado de la interfaz | `src/erp/store.ts` | Persistencia local, navegación, avisos, celebración de logros, sonidos y narración. |
| Interfaz empresarial | `src/shell`, `src/modules`, `src/ui` | Barra lateral con contadores de pendientes, barra superior con reloj de operación, buscador global (Ctrl + K), notificaciones, misión activa flotante, tablas ordenables con búsqueda y paginación, paneles laterales de registro y formularios con validación. |

Lo que se conservó sin cambios de lógica: el motor del simulador gerencial, su retroalimentación, la evaluación tipo Saber Pro, el narrador por voz y los efectos de sonido.

### Defectos encontrados y corregidos durante la verificación

| Defecto | Corrección |
|---|---|
| El panel lateral reiniciaba su efecto en cada renderizado: el foco del teclado saltaba al fondo y Escape a veces no lo cerraba. | Referencia estable a la función de cierre; el efecto solo corre al abrir o cerrar. |
| Dentro del panel lateral, las tablas con desplazamiento se comprimían y ocultaban las filas de IVA y total. | Los elementos del panel no se encogen. |
| Los avisos emergentes tapaban los interruptores de la esquina superior derecha. | En escritorio los avisos aparecen abajo a la izquierda; máximo 3 y el resumen del día reemplaza al anterior. |
| El panel de la misión activa tapaba los botones del final de la página. | Espacio inferior reservado según el panel esté desplegado o plegado; en celular empieza plegado. |
| Textos ocultos para lectores de pantalla ensanchaban la página 150 px en celular. | Los contenedores con desplazamiento son su bloque contenedor. |
| El botón "Cerrar día" perdía su nombre accesible cuando solo mostraba el ícono. | Etiqueta accesible fija. |
| Los paneles de audio y notificaciones se salían por la izquierda en celular. | En celular ocupan el ancho útil de la pantalla. |
| El botón de menú aparecía en escritorio. | Solo se muestra por debajo de 1024 px. |

### Verificación

| Verificación | Resultado |
|---|---|
| Pruebas automatizadas | 54 de 54: 10 del ERP (ciclo de venta y compra con asientos, cupo e inventario, pasarela, asientos manuales, ajustes, 60 días con reglas activas, determinismo, libros cuadrados y kardex igual a contabilidad), 4 de misiones, 27 del simulador y 13 del audio. |
| Recorrido completo en Chromium (versión del repositorio y versión web) | Crear espacio, misión 1 con celebración, cliente corporativo y pregunta, ciclo de venta con pregunta de IVA, ciclo de compra con recepción y pago, ajuste y kardex, publicación y campaña, reglas automáticas durante 6 días, balance de prueba cuadrado, buscador global y 2 meses del simulador: sin errores de consola. |
| Diseño adaptable | 108 vistas (18 vistas × 6 anchos de 320 a 1440 px): 0 px de desplazamiento horizontal en las dos versiones. |
| Carga de trabajo diaria | Con actividad normal: unas 2,3 ventas web, 0,3 cotizaciones, 0,5 oportunidades y 0,6 casos por día; cada cierre de día tarda unos 5 ms; un mes de operación ocupa cerca de 100 KB de almacenamiento. |

## 7. Cuarta revisión: prueba como estudiante

Se automatizó un recorrido de estudiante real que completa las 20 misiones usando solo la interfaz. Las respuestas a las preguntas se leen de la pantalla (balance de prueba, estados financieros, ficha del pedido), como lo haría un estudiante. Además, un barrido pulsa todos los botones visibles de cada vista de cada módulo.

### Resultados

| Prueba | Resultado |
|---|---|
| Recorrido de estudiante | 20 de 20 misiones en 32 días de operación, 3.580 XP, nivel Gerente general, 10 insignias, nota 4,4 en el simulador gerencial (modo guiado), sin errores de página. |
| Barrido de interacción | 229 clics en 26 vistas de los 12 módulos, incluidos los paneles de registro: sin errores. |
| Diseño adaptable | 108 vistas en 6 anchos (320 a 1440 px): 0 px de desplazamiento horizontal. |
| Pruebas automatizadas | 54 de 54. |

### Defectos encontrados y corregidos

| Defecto | Efecto en el estudiante | Corrección |
|---|---|---|
| El panel lateral movía el foco al primer campo 30 ms después de abrirse. | Si el estudiante ya escribía en otro campo, el texto terminaba en "Descripción" (se vio en el asiento manual). | El foco inicial solo se aplica si el usuario aún no está dentro del panel. |
| Los clientes pagaban solos casi siempre al vencer la factura. | La misión "Cartera al día" dependía de la suerte y enseñaba que cobrar no requiere gestión. | Sin recordatorio, una factura vencida se paga despacio; cada recordatorio aumenta la probabilidad. Se agregó cartera heredada que vence los días 3 y 5. |
| Un pago logrado después de un recordatorio no contaba como cobro. | El estudiante gestionaba bien y la misión no avanzaba. | Cuenta como cobro gestionado. |
| Los pedidos sin inventario solo mostraban un error. | El estudiante no sabía cómo resolverlo. | La ficha del pedido explica la consecuencia y crea la orden de compra por el faltante. |
| Las facturas heredadas mostraban "día −27". | Confusión. | Se muestran como "Apertura". |
| "Utilidad del mes" aparecía en rojo al inicio de cada mes. | Podía interpretarse como una mala decisión. | Aclara que los gastos fijos se registran el primer día del mes. |

### Mejoras para aprender a decidir

| Mejora | Qué aprende el estudiante |
|---|---|
| Indicadores para decidir (Inicio) | Relacionar datos con decisiones: cada indicador tiene meta, estado, significado y acción recomendada. La recomendación del día prioriza lo más urgente. |
| Simulador de impacto del precio (Comercio electrónico) | Antes de cambiar un precio ve el efecto esperado en pedidos y utilidad bruta, y el precio que maximiza la utilidad según la elasticidad. |
| Regla de decisión por misión | Cada logro deja un principio aplicable a una empresa real; se muestra y se narra al completar la misión. |
| Bitácora de aprendizaje (Centro de misiones) | Metacognición: cuatro preguntas de reflexión con datos de su práctica e informe para entregar. |

## 8. Quinta revisión: contexto nacional, idioma y vista del docente

- Contexto nacional: clientes, proveedores y prospectos en ciudades de todas las regiones. La ciudad de la empresa la registra el estudiante en la misión 1.
- Idioma: los textos usan español de Colombia. La voz prioriza Colombia y Latinoamérica, y deja las voces de España como último recurso con un aviso en el panel de Audio.
- Vista del docente: muestra todo el contenido con respuestas en seis pestañas y revisa el respaldo de un estudiante. Se probó en navegador a 1280 y 390 px: clave correcta e incorrecta, las seis pestañas, respaldo válido e inválido y regreso al ERP, sin desbordes ni errores.
- Corrección del informe anterior: hay 8 preguntas de verificación (no 9) en las misiones 2, 5, 7, 8, 10, 13, 14 y 18.

## 9. Recomendaciones pendientes

1. Activar GitHub Pages (Settings → Pages → Source: GitHub Actions) para publicar el simulador.
2. Si el código original de AI Studio existe, subirlo a una rama aparte para compararlo con esta versión antes de descartarlo.
3. Para reportes centralizados de notas, conectar la exportación JSON con el LMS institucional o con un formulario. La versión actual guarda los datos solo en el navegador del estudiante por privacidad.
