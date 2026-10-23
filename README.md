# ERP Americana · Suite empresarial educativa

Aplicativo web que reproduce un software ERP real para enseñar gestión empresarial. El estudiante opera una empresa de Barranquilla desde una suite con barra lateral de módulos, buscador global, notificaciones y registros editables. Cada acción genera sus movimientos de inventario y sus asientos contables de partida doble. Un centro de misiones gamificado guía la práctica módulo por módulo, y el simulador gerencial original queda integrado como módulo estratégico.

Funciona en el navegador, sin servidor, sin claves de API y sin conexión después de cargar. La narración por voz usa la síntesis del propio navegador.

## Módulos del ERP

| Módulo | Qué puede hacer el estudiante |
|---|---|
| Inicio | Indicadores del mes (ventas, utilidad, bancos, cartera, inventario), tareas pendientes con acceso directo, misión activa, gráficas diarias y actividad reciente. |
| CRM | Crear, editar e inactivar clientes con validación de NIT o cédula, cupo y plazo. Embudo de oportunidades en tablero kanban con pronóstico ponderado. Casos de servicio con prioridad, toma y solución. |
| Ventas | Cotizaciones editables con margen en tiempo real, confirmación con control de cupo de crédito, despacho, factura electrónica con IVA, cobro, recordatorios y anulación. Vista de pasos y asientos generados por cada pedido. |
| Comercio electrónico | Publicar y retirar productos del catálogo, cambiar precios, campañas en Meta Ads y TikTok Ads con gasto, clics, pedidos, ventas y ROAS. |
| Inventario | Productos con stock, reservado, disponible, costo promedio, margen, punto de reorden y cantidad de reposición. Kardex valorizado y ajustes por conteo físico. |
| Compras | Órdenes de compra (borrador, aprobada, recibida, pagada) con tiempo de entrega del proveedor, sugerencia de compra por punto de reorden y maestro de proveedores. |
| Contabilidad | Libro diario, asientos manuales con validación de partida doble, balance de prueba, estado de resultados, balance general, cartera por antigüedad, cuentas por pagar y plan de cuentas basado en el PUC. |
| Automatización | Siete reglas cuando–entonces configurables (reabastecimiento, despacho, facturación web, cobro, escalamiento de casos, correo de confirmación y pausa de campañas) con registro de ejecución. |
| Centro de misiones | 20 misiones con objetivos verificados en los datos, preguntas de cálculo, 3.420 XP, 6 niveles y 10 insignias. Panel flotante con la misión activa y botón "Ir" al módulo. |
| Simulador gerencial | El simulador de decisiones mensuales de la versión anterior, con su informe, evaluación tipo Saber Pro y evidencias. |
| Aprendizaje | Resultados de aprendizaje, procesos integrados (order to cash, procure to pay, comercio electrónico) y glosario. |
| Configuración | Datos de la empresa, IVA, plazos, límite de aprobación de compras, actividad del mercado, módulos visibles, perfil, respaldo y reinicio. |

### Reloj de operación

El botón **Cerrar día** avanza el calendario de la empresa. Al cerrar el día llegan pedidos de la tienda virtual, solicitudes de cotización, oportunidades, casos de servicio y pagos de clientes; llega la mercancía de las órdenes aprobadas; se cobra la pauta, y cada 30 días se registran nómina, arriendo y servicios. Después se ejecutan las reglas de automatización activas. La actividad depende del precio, la temporada, la pauta y la semilla del mercado, y es reproducible.

### Código del docente

El código de partida del simulador (por ejemplo `MODA-I-12-2-482913-ECWAF-G`) también configura el ERP: fija la empresa, la semilla del mercado, la actividad (básico, intermedio o avanzado) y los módulos visibles. Se escribe al crear el espacio de trabajo o se agrega al enlace como `#MODA-I-12-2-482913-ECWAF-G`.

## Accesibilidad y diseño adaptable

- Navegación por teclado: buscador con <kbd>Ctrl</kbd> + <kbd>K</kbd>, tablas con filas enfocables, paneles laterales con foco atrapado y cierre con Escape.
- Etiquetas en todos los controles, nombres accesibles en los botones de solo ícono, tablas alternativas en las gráficas y avisos anunciados a lectores de pantalla.
- Modo oscuro automático y respeto por la preferencia de movimiento reducido.
- Verificado sin desplazamiento horizontal en 320, 375, 414, 768, 1024 y 1440 px en 18 vistas: bienvenida, los 12 módulos, el panel de pedido, el formulario de cotización, las notificaciones, el panel de audio y el buscador.

## Estabilidad del audio

La narración lee guías de módulo, misiones, resúmenes del día, logros y resultados del simulador. Se diseñó para no fallar en clase:

- Divide el texto en fragmentos de máximo 160 caracteres. Chrome corta las locuciones largas cerca de los 15 segundos.
- Espera la carga de voces y prefiere español de Colombia, luego Latinoamérica y luego España.
- Un temporizador de vigilancia avanza si el navegador no avisa que terminó un fragmento.
- La pausa cancela y la reanudación repite el fragmento en curso. Así funciona igual en Android, donde `pause()` falla.
- Un token de sesión descarta los avisos tardíos de una lectura detenida. Las lecturas nunca se mezclan.
- Al volver a una pestaña oculta, la lectura se reanuda.
- Desbloquea la voz y el audio en el primer clic, como exigen Safari en iOS y Chrome.
- Tras tres errores seguidos informa el problema en pantalla y el sistema sigue funcionando sin audio.
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
  erp/          Núcleo del ERP: tipos, operaciones con validación, contabilidad, cierre del día, misiones y estado
  modules/      Pantallas de cada módulo (CRM, ventas, inventario, compras, contabilidad, misiones…)
  shell/        Barra lateral, barra superior, buscador, notificaciones, misión activa y avisos
  ui/           Kit de componentes: tablas, formularios, paneles laterales, estados e íconos
  engine/       Motor del simulador gerencial, puro y determinista (sin React)
    simulation.ts   Cálculo de cada mes, indicadores y puntaje
    scenarios.ts    Empresas, costos y estacionalidad
    events.ts       Eventos aleatorios con semilla
    feedback.ts     Retroalimentación pedagógica y modo guiado
    config.ts       Dificultad, módulos, código de partida y validación
  audio/        Narrador por síntesis de voz y efectos de sonido
  content/      Resultados de aprendizaje, glosario, evaluación y reflexión
  components/   Pantallas: configuración, sesión informativa, decisiones, resultados, tablero, informe
tests/          Pruebas del ERP (ciclos de venta y compra, partida doble, cierre del día), misiones, simulador y narrador
docs/           Auditoría técnica y guía docente
```

## Documentación

- [Guía docente](docs/GUIA_DOCENTE.md): resultados de aprendizaje, planeación de sesiones, uso del código de partida y rúbrica.
- [Auditoría técnica](docs/AUDITORIA.md): estado inicial del repositorio, hallazgos, correcciones y verificación.
