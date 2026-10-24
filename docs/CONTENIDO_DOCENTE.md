# ERP Americana · Contenido para el docente

Este documento reúne todo el contenido del ERP y del simulador gerencial, con las respuestas de las preguntas. Se genera desde el código del aplicativo, así que coincide con lo que ve el estudiante.

## 1. Resumen

| Elemento | Cantidad |
|---|---|
| Módulos del ERP | 12 |
| Misiones | 20 |
| Preguntas de verificación | 8 |
| Experiencia total | 3420 XP |
| Niveles | 6 |
| Insignias | 10 |
| Indicadores para decidir | 8 |
| Reglas de automatización | 7 |
| Empresas | 3 |
| Eventos del simulador | 9 |
| Preguntas de conceptos | 10 |
| Términos del glosario | 31 |

### Duración

Las 20 misiones exigen como mínimo 30 días simulados, porque la misión 18 pide cerrar el primer mes. Un día simulado avanza con el botón Cerrar día y toma de 1 a 4 minutos. El tiempo real estimado es de 6 a 8 horas, incluido el simulador gerencial (unos 40 minutos). Se recomiendan cuatro sesiones de 90 a 120 minutos.

| Sesión | Misiones | Días simulados | Enfoque de decisión |
|---|---|---|---|
| 1. Navegación y CRM | 1 a 4 | 1 a 5 | Datos maestros, embudo comercial y servicio al cliente |
| 2. Ventas e inventario | 5 a 8 | 5 a 10 | Descuentos con margen, kardex y punto de reorden |
| 3. Compras y comercio electrónico | 9 a 13 | 10 a 20 | Proveedores, precio y rentabilidad de la pauta |
| 4. Contabilidad, automatización y cierre | 14 a 20 | 20 a 33 | Cartera, flujos automáticos, cierre del mes y simulador |

### Resultados de aprendizaje

1. Interpretar los indicadores de un ERP integrado (inventario, ventas, clientes y caja) para tomar decisiones gerenciales mensuales.
2. Planear compras e inventario con pronósticos estacionales, stock de seguridad y punto de reorden.
3. Evaluar la rentabilidad de la pauta digital comparando el ROAS obtenido con el ROAS de equilibrio.
4. Gestionar la relación con el cliente (CRM) dimensionando la capacidad de servicio y la fidelización.
5. Justificar inversiones en automatización de procesos con un análisis costo-beneficio.
6. Proteger la liquidez de la empresa con un flujo de caja proyectado y el uso responsable del crédito.

### Niveles

| Nivel | Desde |
|---|---|
| Practicante | 0 XP |
| Auxiliar administrativo | 300 XP |
| Analista de operaciones | 800 XP |
| Coordinador(a) de área | 1500 XP |
| Jefe(a) de operaciones | 2300 XP |
| Gerente general | 3200 XP |

### Insignias

| Insignia | Cómo se gana |
|---|---|
| Bienvenida | Completaste tu primer día en la empresa. |
| Relación con el cliente | Completaste todas las misiones del CRM. |
| Ciclo comercial | Completaste las misiones de ventas. |
| Guardián del inventario | Dominas el kardex y el punto de reorden. |
| Abastecimiento | Completaste el ciclo de compras. |
| Comercio digital | Catálogo, pedidos web y pauta rentable. |
| Partida doble | Contabilidad, cartera y cierre de mes. |
| Automatizador | Tus reglas trabajan por ti. |
| Operación impecable | Cinco días seguidos sin quiebres ni casos atrasados. |
| Visión gerencial | Superaste el reto del simulador gerencial. |

### Bitácora de aprendizaje

Una sola bitácora para todo el ejercicio, en el Centro de misiones. El informe copiado incluye nivel, XP, misiones con su regla de decisión, los indicadores al cierre y estas respuestas.

1. ¿Qué decisión tomaste en el ERP que más mejoró un indicador? Nombra el indicador y su valor antes y después.
2. ¿Qué error o faltante tuviste y qué hiciste para corregirlo (compra, cobro, ajuste o automatización)?
3. ¿Cómo se conectan las áreas de la empresa? Explica cómo una venta afectó el inventario, la cartera y la contabilidad.
4. ¿Qué regla de decisión aplicarías en una empresa real de tu región y por qué?

## 2. Módulos del ERP

### CRM: Cómo funciona el CRM

El CRM concentra la relación con los clientes: sus datos, las oportunidades de venta y los casos de servicio. Todo lo que registres aquí lo usan Ventas y Contabilidad.

1. Crea o edita clientes con documento, correo, segmento, cupo de crédito y plazo de pago.
2. Mueve las oportunidades por las etapas del embudo. Una oportunidad ganada se convierte en cotización.
3. Atiende los casos de servicio: ponlos en proceso y registra la solución dada al cliente.

### Ventas: Cómo funciona el ciclo de venta

Cada pedido pasa por cinco estados: cotización, confirmado, despachado, facturado y pagado. Cada paso genera registros automáticos en inventario y contabilidad.

1. Crea una cotización con el cliente, los productos, las cantidades y el descuento.
2. Confirma el pedido: el ERP verifica el cupo de crédito y reserva el inventario.
3. Despacha: sale la mercancía del kardex y se registra el costo de ventas.
4. Factura: se crea la cuenta por cobrar con el IVA. Los pedidos web se pagan al instante por la pasarela.
5. Registra el pago cuando el cliente pague la factura a crédito.

### Comercio electrónico: Cómo funciona la tienda virtual

La tienda vende los productos publicados. Cada noche, al cerrar el día, llegan pedidos según el precio, la temporada y la pauta digital activa.

1. Publica productos con un precio que cubra el costo, la comisión de la pasarela y el margen.
2. Crea campañas en Meta Ads o TikTok Ads con un presupuesto diario.
3. Despacha y factura los pedidos web en Ventas y mide el ROAS de cada campaña.

### Inventario: Cómo funciona el inventario

El inventario se valoriza a costo promedio ponderado. El disponible es el stock menos lo reservado por pedidos confirmados.

1. Revisa el disponible de cada producto y el valor del inventario.
2. Configura el punto de reorden y la cantidad de reposición de cada producto.
3. Consulta el kardex para ver entradas, salidas y ajustes con su costo.
4. Registra ajustes cuando el conteo físico no coincida con el sistema.

### Compras: Cómo funciona el ciclo de compra

Una orden de compra pasa por borrador, aprobada, recibida y pagada. La mercancía llega según el tiempo de entrega del proveedor.

1. Crea la orden con el proveedor, los productos y el costo pactado.
2. Apruébala: el ERP calcula el día de llegada.
3. Cierra días hasta que llegue y registra la recepción: sube el inventario y nace la cuenta por pagar.
4. Paga al proveedor desde bancos antes del vencimiento.

### Contabilidad: Cómo funciona la contabilidad

Cada operación genera su asiento de partida doble con cuentas del PUC colombiano. Los informes se actualizan en tiempo real.

1. Consulta el libro diario para ver los asientos de cada operación.
2. Verifica en el balance de prueba que los débitos sean iguales a los créditos.
3. Revisa el estado de resultados y el balance general.
4. Gestiona la cartera de clientes y las cuentas por pagar a proveedores.

### Automatización: Cómo funcionan las automatizaciones

Las reglas siguen la lógica cuando–entonces y se ejecutan al cerrar cada día. Liberan tiempo en tareas repetitivas, pero tú defines sus parámetros.

1. Lee qué hace cada regla y qué parámetros usa.
2. Activa la regla y ajusta sus parámetros.
3. Cierra días y revisa en el registro de ejecución lo que hizo cada regla.

## 3. Misiones con respuestas

### Misión 1. Primer día en la empresa

Módulo: Inicio · 100 XP · Concepto: Datos maestros y navegación del ERP
Requisitos: ninguno

Bienvenido a tu primer día como analista. Un ERP integra todas las áreas de la empresa en una sola base de datos. Antes de operar, registra los datos legales de la empresa (NIT, ciudad de la sede y dirección; elige la ciudad donde estudias o trabajas), recorre los módulos principales y cierra tu primer día de operación con el botón Cerrar día de la barra superior.

1. Acción: Registra el NIT, la ciudad y la dirección de la empresa en Configuración
2. Acción: Visita los módulos CRM, Ventas, Inventario y Contabilidad
3. Acción: Cierra tu primer día de operación

Regla de decisión: Antes de operar, verifica que los datos maestros estén completos: un NIT o una dirección errados se repiten en cada factura y en cada informe.

### Misión 2. Registra un cliente corporativo

Módulo: CRM · 120 XP · Concepto: Maestro de clientes en el CRM
Requisitos: Primer día en la empresa

En el CRM cada cliente necesita datos completos: documento, correo, segmento, cupo de crédito y plazo de pago. Con esos datos el ERP decide si puede venderle a crédito. Crea un cliente corporativo y luego responde cuántos clientes activos tiene la empresa.

1. Acción: Crea un cliente corporativo con NIT, correo y cupo de crédito
2. Pregunta: ¿Cuántos clientes activos tiene la empresa en este momento?
   Pista para el estudiante: Mira el contador de la lista de clientes en el CRM.
   Respuesta: Clientes con estado activo en el CRM. La empresa abre con 6; cada cliente creado suma 1 y cada cliente inactivado resta 1. Se exige el valor exacto.

Regla de decisión: Asigna cupo de crédito según la capacidad de pago del cliente: un cupo alto vende más, pero aumenta el riesgo de cartera.

### Misión 3. Gestiona el embudo comercial

Módulo: CRM · 150 XP · Concepto: Etapas del embudo y conversión a venta
Requisitos: Registra un cliente corporativo

Las oportunidades avanzan por etapas: prospecto, calificado, propuesta, negociación y cierre. Mueve una oportunidad hasta propuesta, gana otra y conviértela en una cotización. Así el CRM alimenta directamente el módulo de ventas.

1. Acción: Mueve una oportunidad a la etapa Propuesta
2. Acción: Marca una oportunidad como Ganada
3. Acción: Crea la cotización desde la oportunidad ganada

Regla de decisión: Mide el embudo por etapas: el pronóstico ponderado (valor × probabilidad) es más realista que sumar todas las oportunidades.

### Misión 4. Servicio al cliente

Módulo: CRM · 150 XP · Concepto: Gestión de casos y tiempos de respuesta
Requisitos: Registra un cliente corporativo

Los casos de servicio registran reclamos y solicitudes. Un caso sin respuesta afecta la reputación de la marca. Toma un caso, resuelve tres y atiende al menos uno de prioridad alta. Registra la solución con claridad: queda en el historial del cliente.

1. Acción: Pon un caso en proceso
2. Acción: Resuelve 3 casos
3. Acción: Resuelve un caso de prioridad alta

Regla de decisión: Atiende primero los casos de prioridad alta y responde en menos de dos días: la demora convierte una duda en un reclamo.

### Misión 5. Ciclo completo de venta

Módulo: Ventas · 200 XP · Concepto: Del pedido al recaudo (order to cash)
Requisitos: Primer día en la empresa

El ciclo de venta tiene cuatro pasos: confirmar el pedido, despachar la mercancía, emitir la factura electrónica y registrar el pago. Cada paso genera un registro: la reserva de inventario, la salida en el kardex, la cuenta por cobrar con el IVA y el ingreso a bancos.

1. Acción: Confirma una cotización
2. Acción: Despacha un pedido
3. Acción: Emite una factura electrónica
4. Acción: Registra el pago de un pedido
5. Pregunta: ¿Cuánto IVA se causó en la última factura que emitiste?
   Pista para el estudiante: Abre el pedido facturado y mira el resumen: subtotal × tarifa de IVA.
   Respuesta: IVA de la última factura que emitió el estudiante: subtotal después de descuentos × 19 %. Se lee en el resumen del pedido. Tolerancia de 0,1 %.

Regla de decisión: Una venta solo termina cuando se cobra: vigila el ciclo completo, no solo el pedido.

### Misión 6. Descuento sin perder margen

Módulo: Ventas · 120 XP · Concepto: Margen bruto y política de descuentos
Requisitos: Ciclo completo de venta

Un descuento ayuda a cerrar ventas, pero reduce el margen. La política de la empresa permite hasta 10 % de descuento siempre que el margen bruto del pedido sea de al menos 25 %. Crea y confirma un pedido que cumpla las dos condiciones. El formulario del pedido muestra el margen en tiempo real.

1. Acción: Confirma un pedido con descuento de 1 % a 10 % y margen bruto ≥ 25 %

Regla de decisión: Antes de dar un descuento, calcula el margen que queda: un descuento de 10 % puede consumir la cuarta parte de la utilidad bruta.

### Misión 7. Kardex y conteo físico

Módulo: Inventario · 150 XP · Concepto: Kardex valorizado a costo promedio
Requisitos: Primer día en la empresa

El kardex registra cada entrada, salida y ajuste con su costo. Cuando el conteo físico no coincide con el sistema se hace un ajuste: un faltante se lleva al gasto y un sobrante a recuperaciones. Haz un ajuste, revisa el kardex y verifica el valor contable del inventario.

1. Acción: Registra un ajuste de inventario por conteo físico
2. Acción: Abre el kardex de un producto
3. Pregunta: ¿Cuál es el saldo de la cuenta 1435 Mercancías en la contabilidad?
   Pista para el estudiante: Contabilidad → Balance de prueba, cuenta 1435.
   Respuesta: Saldo débito de la cuenta 1435 en el balance de prueba: valor del inventario a costo promedio en el momento de responder. Tolerancia de 0,1 %.

Regla de decisión: Concilia el inventario físico con el sistema con frecuencia: cada faltante es un gasto y una venta que ya no podrás hacer.

### Misión 8. Punto de reorden

Módulo: Inventario · 150 XP · Concepto: Punto de reorden = demanda diaria × tiempo de entrega + stock de seguridad
Requisitos: Kardex y conteo físico

El punto de reorden indica cuándo pedir. Se calcula multiplicando la demanda diaria por el tiempo de entrega del proveedor y sumando un stock de seguridad. Configura el punto de reorden y la cantidad a reponer en tres productos, y resuelve el cálculo de verificación.

1. Acción: Configura punto de reorden y cantidad de reposición en 3 productos
2. Pregunta: Un producto vende 4 unidades al día, el proveedor tarda 3 días y quieres 6 unidades de stock de seguridad. ¿Cuál es el punto de reorden?
   Pista para el estudiante: Demanda diaria × días de entrega + stock de seguridad.
   Respuesta: 4 unidades × 3 días + 6 de seguridad = 18 unidades. Se exige el valor exacto.

Regla de decisión: Pide a tiempo: punto de reorden = demanda diaria × días de entrega + stock de seguridad.

### Misión 9. Registra un proveedor

Módulo: Compras · 80 XP · Concepto: Maestro de proveedores
Requisitos: Primer día en la empresa

Un proveedor bien registrado tiene NIT, tiempo de entrega y plazo de pago. El ERP usa el tiempo de entrega para calcular cuándo llega la mercancía y el plazo para programar el pago. Registra un proveedor nuevo.

1. Acción: Registra un proveedor con NIT, tiempo de entrega y plazo de pago

Regla de decisión: Elige proveedores por costo, tiempo de entrega y plazo de pago, no solo por precio.

### Misión 10. Ciclo completo de compra

Módulo: Compras · 200 XP · Concepto: De la orden al pago (procure to pay)
Requisitos: Primer día en la empresa

El ciclo de compra tiene cuatro pasos: crear la orden, aprobarla, recibir la mercancía cuando llega y pagar al proveedor. La recepción actualiza el costo promedio y crea la cuenta por pagar con el IVA descontable. Cierra días hasta que llegue la mercancía.

1. Acción: Crea una orden de compra
2. Acción: Aprueba la orden
3. Acción: Recibe la mercancía cuando llegue
4. Acción: Paga al proveedor
5. Pregunta: ¿Cuál es el saldo actual de la cuenta 2205 Proveedores?
   Pista para el estudiante: Contabilidad → Balance de prueba, cuenta 2205. Si pagaste todo, es 0.
   Respuesta: Saldo crédito de la cuenta 2205: compras recibidas y aún no pagadas, con IVA. Si el estudiante pagó todas las órdenes, es 0. Tolerancia de 0,1 %.

Regla de decisión: Paga a los proveedores dentro del plazo pactado, pero no antes de cobrar tu cartera: así cuidas la caja sin dañar la relación.

### Misión 11. Publica tu catálogo

Módulo: Comercio electrónico · 100 XP · Concepto: Catálogo digital y precio mínimo de venta
Requisitos: Primer día en la empresa

La tienda virtual vende los productos publicados en el catálogo. Antes de publicar verifica que el precio cubra el costo, la comisión de la pasarela y el margen. Publica al menos cuatro productos con un precio de al menos 1,3 veces su costo.

1. Acción: Publica al menos 4 productos en la tienda
2. Acción: Todos los productos publicados tienen precio ≥ 1,3 × costo

Regla de decisión: Publica solo productos con margen y stock: un producto agotado en la tienda genera reclamos, no ventas.

### Misión 12. Atiende los pedidos web

Módulo: Comercio electrónico · 150 XP · Concepto: Cumplimiento de pedidos en línea
Requisitos: Publica tu catálogo

Los pedidos de la tienda llegan confirmados y pagados por la pasarela. Tu trabajo es despacharlos y facturarlos rápido: un pedido que espera más de dos días genera reclamos. Despacha y factura cinco pedidos web.

1. Acción: Factura 5 pedidos web

Regla de decisión: En el comercio electrónico la velocidad es parte del producto: despacha y factura el mismo día.

### Misión 13. Campaña rentable

Módulo: Comercio electrónico · 250 XP · Concepto: ROAS y ROAS de equilibrio
Requisitos: Publica tu catálogo

La pauta digital trae tráfico a la tienda. Una campaña es rentable cuando cada peso invertido trae suficientes ventas para cubrir el costo de la mercancía. Crea una campaña, mantenla cinco días y busca un ROAS de 2 o más. Recuerda facturar los pedidos web: el ROAS se mide sobre ventas facturadas.

1. Acción: Crea una campaña en Meta Ads o TikTok Ads
2. Acción: Mantén una campaña activa durante 5 días
3. Acción: Logra un ROAS de 2 o más en una campaña
4. Pregunta: Si el margen de contribución es 40 %, ¿cuál es el ROAS de equilibrio?
   Pista para el estudiante: ROAS de equilibrio = 1 ÷ margen de contribución.
   Respuesta: 1 ÷ 0,40 = 2,5. Se aceptan valores entre 2,45 y 2,55.

Regla de decisión: Mantén una campaña solo si su ROAS supera el de equilibrio (1 ÷ margen de contribución); si no, ajusta o pausa.

### Misión 14. Partida doble

Módulo: Contabilidad · 150 XP · Concepto: Libro diario y balance de prueba
Requisitos: Ciclo completo de venta

Cada operación del ERP genera un asiento contable donde los débitos son iguales a los créditos. Abre el balance de prueba para verificarlo, registra un asiento manual cuadrado, por ejemplo el pago de un servicio, y consulta el saldo de bancos.

1. Acción: Abre el balance de prueba
2. Acción: Registra un asiento manual cuadrado
3. Pregunta: ¿Cuál es el saldo de la cuenta 1110 Bancos en este momento?
   Pista para el estudiante: Balance de prueba, cuenta 1110.
   Respuesta: Saldo de la cuenta 1110 Bancos en el balance de prueba en el momento de responder. Tolerancia de 0,1 %.

Regla de decisión: Todo hecho económico tiene dos caras: si los débitos no igualan a los créditos, hay un error que corregir antes de decidir.

### Misión 15. Cartera al día

Módulo: Contabilidad · 150 XP · Concepto: Gestión de cuentas por cobrar
Requisitos: Ciclo completo de venta

Vender a crédito exige cobrar. La cartera vencida inmoviliza la caja de la empresa. La empresa heredó facturas a crédito que vencen en los primeros días. Cuando una factura vence, envía recordatorios al cliente y logra su pago. Un recordatorio oportuno aumenta la probabilidad de que el cliente pague.

1. Acción: Envía 2 recordatorios de cobro
2. Acción: Logra el pago de una factura vencida: regístralo cuando el cliente pague o espera su pago después del recordatorio

Regla de decisión: La cartera vencida es caja que no tienes: haz seguimiento desde el primer día de vencimiento.

### Misión 16. Tu primer flujo automático

Módulo: Automatización · 200 XP · Concepto: Automatización de procesos repetitivos
Requisitos: Ciclo completo de venta

Despachar y facturar pedidos web uno por uno consume tiempo. Las reglas de automatización ejecutan esas tareas al cierre de cada día. Activa el despacho automático y la facturación de pedidos web, y comprueba en el registro que las reglas hicieron al menos cinco acciones.

1. Acción: Activa la regla de despacho automático
2. Acción: Activa la facturación de pedidos web
3. Acción: Las reglas ejecutan al menos 5 acciones

Regla de decisión: Automatiza las tareas repetitivas y de bajo riesgo; reserva tu tiempo para las decisiones que requieren criterio.

### Misión 17. Reabastecimiento inteligente

Módulo: Automatización · 200 XP · Concepto: Integración inventario–compras
Requisitos: Punto de reorden, Tu primer flujo automático

La regla de reabastecimiento revisa cada noche el inventario disponible. Cuando un producto cae por debajo de su punto de reorden, crea la orden de compra al proveedor y la aprueba si no supera el monto que definas. Configura el monto, activa la regla y deja que genere una orden.

1. Acción: Configura el monto de aprobación y activa la regla de reabastecimiento
2. Acción: La regla genera al menos una orden de compra

Regla de decisión: Automatiza el abastecimiento con límites: aprueba solo hasta un monto y revisa las órdenes grandes.

### Misión 18. Cierre del primer mes

Módulo: Contabilidad · 300 XP · Concepto: Estado de resultados
Requisitos: Ciclo completo de venta

Cada 30 días la empresa paga nómina, arriendo y servicios. El estado de resultados muestra si las ventas cubrieron el costo de la mercancía y esos gastos. Opera 30 días, termina un mes con utilidad operacional y responde cuál es la utilidad acumulada.

1. Acción: Completa 30 días de operación
2. Acción: Termina un mes con utilidad operacional positiva
3. Pregunta: ¿Cuál es la utilidad operacional acumulada en el estado de resultados?
   Pista para el estudiante: Contabilidad → Estados financieros.
   Respuesta: Utilidad operacional acumulada desde la apertura: ingresos − costo de ventas − gastos operacionales. Se lee en Estados financieros. Tolerancia de 0,1 %.

Regla de decisión: Lee el estado de resultados cada mes: si los gastos fijos superan la utilidad bruta, debes vender más, subir el margen o reducir gastos.

### Misión 19. Racha operativa

Módulo: Inicio · 200 XP · Concepto: Disciplina operativa y nivel de servicio
Requisitos: Servicio al cliente, Ciclo completo de venta

Una operación sana no deja pedidos sin inventario ni casos de servicio atrasados. Logra cinco días seguidos sin quiebres de inventario y sin casos abiertos por más de dos días. Consejo: antes de confirmar una cotización revisa el aviso de inventario y compra primero lo que falta; define puntos de reorden para los productos de la tienda y resuelve los casos cada día.

1. Acción: Logra una racha de 5 días sin quiebres ni casos atrasados

Regla de decisión: La disciplina diaria (despachar, resolver y reponer a tiempo) sostiene la satisfacción del cliente.

### Misión 20. Reto gerencial

Módulo: Simulador gerencial · 300 XP · Concepto: Decisiones estratégicas integradas
Requisitos: Primer día en la empresa

El simulador gerencial resume la empresa en decisiones mensuales de precio, compras, servicio, pauta, automatización y crédito. Completa una partida y obtén una nota de 3,5 o más.

1. Acción: Completa el simulador gerencial con nota de 3,5 o más

Regla de decisión: Las decisiones de un área afectan a todas: precio, inventario, servicio, pauta y caja se deciden juntos.

## 4. Indicadores para decidir

| Indicador | Meta | Qué significa | Qué hacer |
|---|---|---|---|
| Despachos a tiempo (7 días) | Meta: 90 % o más | Porcentaje de pedidos despachados máximo un día después de confirmados. Mide el nivel de servicio que percibe el cliente. | Despacha los pedidos confirmados cada día, compra lo que falta y considera el despacho automático. |
| Pedidos atrasados | Meta: 0 | Pedidos confirmados que llevan dos días o más sin despacharse. Cada uno puede convertirse en un reclamo. | Mantén la disciplina de despacho diario. |
| Cartera vencida | Meta: menos de 10 % de la cartera | Facturas a crédito que ya pasaron su fecha de pago (0 % de la cartera). Es dinero vendido que todavía no entra a bancos. | Haz seguimiento a las facturas antes de que venzan. |
| Margen bruto del mes | Meta: 35 % o más | Lo que queda de cada peso vendido después del costo de la mercancía. Con él se pagan nómina, arriendo, pauta y servicios. | Controla los descuentos, revisa precios frente al costo promedio y negocia mejores costos con los proveedores. |
| Cobertura de caja | Meta: 2 meses de gastos fijos o más | Cuántos meses de gastos fijos ($ 5.000.000 al mes) puede pagar la empresa con el saldo en bancos ($ 40.000.000). | Puedes invertir en inventario o pauta, sin comprometer la liquidez. |
| ROAS de la pauta activa | Equilibrio: 2,61 | Pesos vendidos por cada peso de pauta en la campaña con peor resultado (con al menos 3 días). Por debajo del equilibrio, la pauta pierde dinero. | Factura los pedidos web para medir bien, ajusta el presupuesto o pausa la campaña que no supere el equilibrio. |
| Abastecimiento | Meta: 0 productos con faltante | Productos con pedidos sin inventario o bajo su punto de reorden. 6 productos aún no tienen punto de reorden definido. | Crea órdenes de compra por lo que falta y define el punto de reorden con la demanda diaria y el tiempo de entrega. |
| Casos con más de 2 días | Meta: 0 | Solicitudes y reclamos de clientes sin resolver por dos días o más. Afectan la reputación y la recompra. | Resuelve primero los casos de prioridad alta y registra la solución dada al cliente. |

## 5. Empresas

### Americana Tech S.A.S. · Comercio de accesorios tecnológicos

Tienda en línea colombiana que vende audífonos inalámbricos a todo el país. Puede comprar a un mayorista local o importar desde Asia con tiempo de tránsito de un mes.

Reto: Decidir entre proveedor local o importación según la TRM, sostener el inventario para Black Friday y diciembre, y medir si la pauta digital es rentable.

Temporadas:
- enero: Enero es un mes de baja demanda y de ajuste del salario mínimo.
- mayo: Mayo trae el Día de la Madre: la demanda sube.
- noviembre: Noviembre es temporada de Black Friday y Cyber Lunes.
- diciembre: Diciembre es el pico del año por primas y regalos de Navidad.

| SKU | Producto | Costo | Precio | Margen | Stock inicial | Proveedor |
|---|---|---|---|---|---|---|
| AUD-001 | Audífonos inalámbricos Pro | $ 52.000 | $ 89.000 | 42 % | 60 und | Mayorista Tecnológico Nacional S.A.S. |
| AUD-002 | Audífonos deportivos | $ 38.000 | $ 65.000 | 42 % | 45 und | Mayorista Tecnológico Nacional S.A.S. |
| PAR-001 | Parlante bluetooth portátil | $ 70.000 | $ 119.000 | 41 % | 25 und | Importadora Pacífico Digital S.A.S. |
| CAR-030 | Cargador rápido 30 W | $ 18.000 | $ 35.000 | 49 % | 80 und | Accesorios Móviles de Colombia S.A.S. |
| CAB-USC | Cable USB-C de 2 m | $ 6.000 | $ 15.000 | 60 % | 120 und | Accesorios Móviles de Colombia S.A.S. |
| REL-100 | Reloj inteligente | $ 120.000 | $ 199.000 | 40 % | 12 und | Importadora Pacífico Digital S.A.S. |

| Proveedor | Ciudad | Entrega | Plazo de pago |
|---|---|---|---|
| Mayorista Tecnológico Nacional S.A.S. | Bogotá D.C. | 2 días | 30 días |
| Importadora Pacífico Digital S.A.S. | Cartagena | 6 días | 45 días |
| Accesorios Móviles de Colombia S.A.S. | Medellín | 3 días | 30 días |

### Americana Moda S.A.S. · Confección y venta de ropa

Marca colombiana de ropa que vende a todo el país por su tienda virtual. Confecciona con talleres nacionales; importar prendas paga aranceles textiles altos.

Reto: Aprovechar la temporada de ferias y carnavales, el Día de la Madre y diciembre sin quedarse con inventario que pasa de moda, y fidelizar clientes con buen servicio.

Temporadas:
- febrero: Febrero reúne ferias y carnavales en varias regiones del país: la demanda de ropa se dispara.
- mayo: Mayo trae el Día de la Madre.
- junio: Junio combina prima de mitad de año y Día del Padre.
- diciembre: Diciembre es el pico del año por primas y Navidad.

| SKU | Producto | Costo | Precio | Margen | Stock inicial | Proveedor |
|---|---|---|---|---|---|---|
| CAM-BLA | Camisa de lino blanca | $ 66.000 | $ 120.000 | 45 % | 40 und | Confecciones Hilo Fino S.A.S. |
| CAM-AZU | Camisa de lino azul | $ 58.000 | $ 105.000 | 45 % | 35 und | Confecciones Hilo Fino S.A.S. |
| VES-ALG | Vestido casual de algodón | $ 72.000 | $ 139.000 | 48 % | 28 und | Textiles Integrales de Colombia S.A.S. |
| PAN-LIN | Pantalón de lino | $ 60.000 | $ 115.000 | 48 % | 30 und | Textiles Integrales de Colombia S.A.S. |
| SOM-VUE | Sombrero vueltiao 19 vueltas | $ 85.000 | $ 160.000 | 47 % | 15 und | Artesanías del Sinú S.A.S. |
| BOL-TEJ | Bolso tejido artesanal | $ 95.000 | $ 180.000 | 47 % | 12 und | Artesanías del Sinú S.A.S. |

| Proveedor | Ciudad | Entrega | Plazo de pago |
|---|---|---|---|
| Confecciones Hilo Fino S.A.S. | Medellín | 4 días | 30 días |
| Textiles Integrales de Colombia S.A.S. | Bogotá D.C. | 5 días | 30 días |
| Artesanías del Sinú S.A.S. | Montería | 8 días | 15 días |

### Americana Café S.A.S. · Alimentos y bebidas

Tostadora colombiana de café especial que vende a todo el país por suscripción y tienda en línea. El producto es perecedero y los clientes recompran cada mes si el servicio es bueno.

Reto: Construir una base de clientes recurrentes, controlar el costo del envío y evitar que el café se envejezca en bodega.

Temporadas:
- mayo: Mayo trae el Día de la Madre: los regalos aumentan.
- diciembre: Diciembre es el pico del año por regalos empresariales y familiares.

| SKU | Producto | Costo | Precio | Margen | Stock inicial | Proveedor |
|---|---|---|---|---|---|---|
| CAF-500 | Café especial tostado 500 g | $ 20.000 | $ 38.000 | 47 % | 150 bolsa | Trilladora Cordillera Central S.A.S. |
| CAF-250 | Café especial tostado 250 g | $ 11.000 | $ 21.000 | 48 % | 140 bolsa | Trilladora Cordillera Central S.A.S. |
| CAF-DES | Café descafeinado 500 g | $ 23.000 | $ 42.000 | 45 % | 40 bolsa | Trilladora Cordillera Central S.A.S. |
| KIT-REG | Kit de regalo con taza | $ 45.000 | $ 89.000 | 49 % | 25 kit | Empaques y Regalos Express S.A.S. |
| PRE-FRA | Prensa francesa 350 ml | $ 40.000 | $ 75.000 | 47 % | 20 und | Menaje Barista S.A.S. |
| FIL-100 | Filtros de papel x 100 | $ 5.000 | $ 12.000 | 58 % | 90 paquete | Menaje Barista S.A.S. |

| Proveedor | Ciudad | Entrega | Plazo de pago |
|---|---|---|---|
| Trilladora Cordillera Central S.A.S. | Manizales | 3 días | 30 días |
| Empaques y Regalos Express S.A.S. | Bogotá D.C. | 4 días | 30 días |
| Menaje Barista S.A.S. | Medellín | 5 días | 45 días |

### Clientes iniciales (iguales en las tres empresas)

| Cliente | Ciudad | Segmento | Cupo | Plazo |
|---|---|---|---|---|
| Distribuidora Red Nacional S.A.S. | Bogotá D.C. | Mayorista | $ 15.000.000 | 30 días |
| Hotel Plaza Central S.A.S. | Medellín | Corporativo | $ 10.000.000 | 30 días |
| Comercializadora Punto Alto S.A.S. | Cali | Mayorista | $ 12.000.000 | 45 días |
| Clínica Vida Integral S.A.S. | Bucaramanga | Corporativo | $ 8.000.000 | 30 días |
| María Fernanda Rojas | Pereira | Minorista | Contado | Contado |
| Carlos Andrés Mejía | Barranquilla | Minorista | Contado | Contado |

La empresa abre con dos facturas a crédito emitidas antes de la apertura (cartera heredada) para practicar el cobro en la misión 15.

### Gastos fijos mensuales

| Cuenta | Concepto | Valor |
|---|---|---|
| 5105 | Nómina del equipo comercial y de servicio | $ 3.200.000 |
| 5120 | Arriendo de bodega y oficina | $ 1.200.000 |
| 5135 | Servicios públicos, internet y plataforma de la tienda | $ 600.000 |

## 6. Reglas de automatización

| Regla | Cuando | Entonces |
|---|---|---|
| Reabastecimiento automático | al cerrar el día, el disponible de un producto es menor o igual a su punto de reorden y no tiene una orden abierta | crea una orden de compra al proveedor principal por la cantidad de reposición y la aprueba si no supera el monto definido |
| Despacho automático de pedidos con stock | al cerrar el día hay pedidos confirmados con inventario suficiente | despacha el pedido: descarga el kardex y registra el costo de ventas |
| Facturación electrónica de pedidos web | un pedido de la tienda virtual quedó despachado | emite la factura electrónica y registra el recaudo de la pasarela de pagos |
| Recordatorio de cobro por WhatsApp | una factura a crédito lleva vencida los días indicados | envía un recordatorio de cobro por WhatsApp (máximo 3 por factura) |
| Escalamiento de casos sin respuesta | un caso de servicio lleva abierto los días indicados | sube su prioridad a alta y avisa al equipo |
| Correo de confirmación de pedido | se confirma un pedido de un cliente con correo registrado | envía el correo de confirmación con el detalle del pedido |
| Pausa de campañas con ROAS bajo | una campaña activa cumple los días mínimos y su ROAS es menor al mínimo | pausa la campaña para no seguir invirtiendo sin retorno |

## 7. Simulador gerencial

La misión 20 exige completar una partida con nota de 3,5 o más. La nota es el promedio mensual del cuadro de mando (finanzas 40, clientes 30, procesos 30) llevado a escala de 0 a 5.

| Nota desde | Resultado |
|---|---|
| 4,5 | Desempeño excelente |
| 4,0 | Desempeño sobresaliente |
| 3,0 | Desempeño aprobatorio |
| 0,0 | Desempeño por mejorar |

### Niveles de dificultad

| Nivel | Descripción | Probabilidad de evento por mes |
|---|---|---|
| Básico | Mercado estable, pocos eventos, más capital y cupo de crédito amplio. Ideal para la primera sesión. | 25 % |
| Intermedio | Demanda con variación moderada y eventos frecuentes. Exige planear compras y caja. | 45 % |
| Avanzado | Mercado volátil, eventos casi cada mes, menos capital y crédito restringido. | 60 % |

### Áreas de decisión

- ERP · Inventario y compras: Precio de venta, compras al proveedor local o importación, y control de inventario.
- CRM · Clientes y servicio: Asesores de servicio, programa de fidelización y satisfacción del cliente.
- E-commerce · Tienda y pauta digital: Inversión en Meta Ads y TikTok Ads, envío gratis y mejoras de la tienda virtual.
- Automatización de procesos: Reabastecimiento automático, recuperación de carritos, chatbot y facturación electrónica integrada.
- Finanzas · Caja y crédito: Préstamos, abonos a deuda y control de liquidez.

### Eventos del mercado

- El dólar sube 10 % (no aplica en Americana Café S.A.S.): La TRM sube 10 % este mes por la volatilidad internacional. Toda importación que pagues este mes costará 10 % más en pesos. Lección: El riesgo cambiario afecta el costo de las importaciones. Compara el costo nacionalizado (precio en USD × TRM × (1 + arancel) + flete) contra el proveedor local antes de comprar.
- Retraso en puerto (no aplica en Americana Café S.A.S.): Una congestión en los puertos del país retrasa un mes la mercancía importada que debía llegar este mes. Lección: El tiempo de entrega (lead time) es incierto. El stock de seguridad protege el nivel de servicio cuando el proveedor falla.
- El competidor lanza una promoción: Tu principal competidor baja su precio 12 % durante este mes. Los clientes compararán tu precio con esa nueva referencia. Lección: Con demanda elástica, la diferencia de precio frente a la competencia reduce la conversión. Igualar el precio no siempre conviene: calcula si el volumen extra compensa el margen perdido.
- Un video de un cliente se vuelve viral: Una reseña positiva de tu producto en redes sociales se hace viral. El tráfico orgánico de este mes subirá cerca de 40 %. Lección: El tráfico extra solo se convierte en ventas si hay inventario y capacidad de atención. Prepara la operación antes de que llegue la demanda.
- Sube el costo por clic: Más anunciantes compiten en la subasta de Meta y TikTok. El costo por clic sube 30 % este mes. Lección: Cuando el CPC sube, el ROAS cae con el mismo presupuesto. Compara el ROAS esperado con el ROAS de equilibrio (1 ÷ margen de contribución) antes de mantener la pauta.
- Falla en la pasarela de pagos: La pasarela de pagos presenta caídas intermitentes. La conversión de la tienda bajará 20 % y algunos clientes se quejarán. Lección: La continuidad del servicio digital es un riesgo operativo. Los clientes que abandonan el pago se pueden recuperar con mensajes automáticos de carrito abandonado.
- Reclamo público en redes: Un cliente publica una queja por demora en la respuesta. Si este mes tu capacidad de servicio no alcanza, la satisfacción caerá más. Lección: En el CRM, el tiempo de respuesta afecta la reputación. Dimensiona la capacidad de servicio con base en los pedidos esperados, no en los del mes pasado.
- Pedido de un cliente corporativo: Una empresa de la ciudad quiere comprar 140 unidades este mes con 20 % de descuento sobre tu precio de venta y pago contra entrega. Decide si aceptas. Si aceptas y no tienes inventario suficiente, incumples y pierdes reputación. Lección: Un pedido grande con descuento conviene si el precio con descuento supera el costo unitario y tienes inventario y caja para atenderlo sin desatender a tus clientes habituales.
- Jornada de día sin IVA: El Gobierno anuncia una jornada de día sin IVA este mes. Los compradores estarán más activos: la conversión subirá cerca de 30 %. Lección: Los picos de demanda por eventos externos se planean con anticipación: inventario, capacidad de atención y presupuesto de pauta deben crecer juntos.

### Preguntas de conceptos con respuesta

1. Una tienda vendió 600 unidades en octubre (índice estacional 1,0). El índice de noviembre es 1,35. Tiene 200 unidades en bodega y quiere un stock de seguridad de 20 %. ¿Cuántas unidades debe comprar al proveedor local para noviembre?
   a) 600
   b) 772  ← correcta
   c) 810
   d) 972
   Explicación: Pronóstico = 600 ÷ 1,0 × 1,35 = 810. Inventario objetivo = 810 × 1,2 = 972. Compra = 972 − 200 = 772.

2. Un producto tiene un margen de contribución de 40 %. La campaña en Meta Ads obtuvo un ROAS de 2,1. ¿Qué conclusión es correcta en el corto plazo?
   a) La campaña es rentable porque vende más de lo que cuesta.
   b) La campaña pierde dinero porque el ROAS de equilibrio es 2,5.  ← correcta
   c) La campaña está en equilibrio porque el ROAS supera 2.
   d) No se puede concluir nada sin conocer el CPC.
   Explicación: ROAS de equilibrio = 1 ÷ 0,40 = 2,5. Con ROAS de 2,1 cada peso en pauta deja 2,1 × 0,40 = 0,84 pesos de contribución: se pierden 16 centavos por peso, salvo que la recompra futura (LTV) compense.

3. Un artículo cuesta USD 9 en origen. La TRM es 4.000 y el arancel más la logística suman 25 %. El flete fijo del embarque es $1.800.000. El proveedor local vende a $52.000. ¿Desde qué cantidad aproximada conviene importar?
   a) Desde 100 unidades
   b) Desde 300 unidades  ← correcta
   c) Desde 1.000 unidades
   d) Nunca conviene
   Explicación: Costo unitario importado = 9 × 4.000 × 1,25 = $45.000. Ahorro por unidad = $7.000. El flete fijo se cubre con 1.800.000 ÷ 7.000 ≈ 257 unidades. Desde unas 300 unidades la importación es más barata, si la empresa puede esperar un mes.

4. Se esperan 900 pedidos en diciembre. Cada asesor atiende 220 pedidos al mes y el chatbot suma 250 pedidos de capacidad. ¿Cuántos asesores se necesitan si se activa el chatbot?
   a) 2
   b) 3  ← correcta
   c) 4
   d) 5
   Explicación: Pedidos a cubrir con asesores = 900 − 250 = 650. Asesores = 650 ÷ 220 = 2,95, es decir, 3 asesores.

5. Una empresa registra utilidad neta positiva por tres meses seguidos, pero su caja baja cada mes hasta usar sobregiro. ¿Cuál es la causa más probable?
   a) Los impuestos se calculan sobre las ventas y no sobre la utilidad.
   b) Está comprando más inventario del que vende y la caja queda inmovilizada en bodega.  ← correcta
   c) El costo de ventas se paga dos veces.
   d) La pauta digital no se registra en el estado de resultados.
   Explicación: Las compras salen de la caja cuando se pagan, pero solo pasan al estado de resultados cuando se venden. Comprar en exceso aumenta el inventario (activo) y consume caja sin afectar la utilidad del mes.

6. La empresa factura $80.000.000 al mes. Los procesos manuales de facturación cuestan 1,5 % de las ventas. Integrar la facturación al ERP cuesta 0,4 % de las ventas más $300.000 mensuales y $1.200.000 de implementación. ¿En cuánto tiempo se recupera la implementación?
   a) Menos de un mes
   b) Unos dos meses  ← correcta
   c) Unos seis meses
   d) No se recupera
   Explicación: Costo manual = $1.200.000. Costo automatizado = $320.000 + $300.000 = $620.000. Ahorro mensual = $580.000. Recuperación = 1.200.000 ÷ 580.000 ≈ 2,1 meses.

7. La demanda de un producto tiene elasticidad precio de 2,4. La gerencia sube el precio 10 %. ¿Qué ocurre con la cantidad demandada, aproximadamente?
   a) Baja 2,4 %
   b) Baja 10 %
   c) Baja cerca de 20 %  ← correcta
   d) Sube 24 %
   Explicación: Con elasticidad constante, la cantidad cambia en (1 ÷ 1,10)^2,4 ≈ 0,80: cae cerca de 20 %. Una aproximación lineal da 2,4 × 10 % = 24 %. En ambos casos la caída supera el aumento del precio.

8. Un cliente compra en promedio una vez cada cinco meses, deja $25.000 de contribución por compra y permanece dos años con la marca. ¿Cuál es el CAC máximo que la empresa podría pagar sin perder dinero?
   a) $25.000
   b) $50.000
   c) $120.000  ← correcta
   d) $600.000
   Explicación: En 24 meses el cliente compra 24 ÷ 5 ≈ 4,8 veces. LTV = 4,8 × 25.000 = $120.000. Pagar un CAC menor que el LTV permite recuperar la inversión.

9. Un ERP muestra 2.400 unidades en bodega y una venta de 800 unidades en el último mes. ¿Cuántos días de inventario tiene la empresa?
   a) 30 días
   b) 60 días
   c) 90 días  ← correcta
   d) 120 días
   Explicación: Días de inventario = 2.400 ÷ 800 × 30 = 90 días. Es una cobertura alta para productos de moda o perecederos.

10. Al duplicar el presupuesto de TikTok Ads de $2.000.000 a $4.000.000, los clics pasaron de 4.700 a 8.400. ¿Qué explica este resultado?
   a) Un error en la plataforma de pauta.
   b) Rendimientos decrecientes: la audiencia más interesada ya fue alcanzada.  ← correcta
   c) El precio del producto subió.
   d) La tasa de conversión de la tienda bajó.
   Explicación: Los clics crecieron 79 %, no 100 %. El costo por clic marginal sube a medida que la plataforma busca personas menos interesadas: son rendimientos decrecientes.

### Reflexión del informe final del simulador

1. ¿Qué decisión tuvo el mayor impacto positivo en tus resultados y qué indicador lo demuestra?
2. ¿Qué decisión cambiarías si repitieras la simulación? Explica qué dato del tablero te habría alertado antes.
3. ¿Cómo se conectan el inventario (ERP), la satisfacción del cliente (CRM) y la pauta digital (e-commerce) en tu empresa simulada?
4. ¿Qué automatización recomendarías a una pyme real de tu región y con qué cálculo la justificarías?

### Glosario

- ERP: Sistema de planificación de recursos empresariales. Integra en una sola base de datos compras, inventario, ventas, contabilidad y talento humano, para que cada área decida con la misma información.
- CRM: Sistema de gestión de la relación con el cliente. Registra clientes, pedidos, solicitudes de servicio y campañas para aumentar la retención y la recompra.
- E-commerce: Canal de venta en línea. Su desempeño depende del tráfico, la tasa de conversión, el ticket promedio y la experiencia de compra.
- Automatización de procesos: Uso de reglas y software para ejecutar tareas repetitivas sin intervención manual (reposición, facturación, mensajes a clientes). Se justifica cuando el ahorro mensual supera la mensualidad y recupera la implementación en un plazo razonable.
- Pronóstico estacional: Estimación de la demanda futura que ajusta la demanda base por un índice del mes (temporadas como ferias y carnavales, Día de la Madre, Black Friday o diciembre). Fórmula: Pronóstico = demanda del último mes ÷ índice de ese mes × índice del mes siguiente
- Stock de seguridad: Inventario adicional que protege contra la variación de la demanda y los retrasos del proveedor. Fórmula: Stock de seguridad ≈ 15 % a 25 % de la demanda pronosticada (método simplificado)
- Punto de reorden: Nivel de inventario en el que se debe emitir una nueva orden de compra. Fórmula: Punto de reorden = demanda diaria × tiempo de entrega + stock de seguridad
- Nivel de servicio: Porcentaje de la demanda que se atiende con el inventario disponible (fill rate). Por debajo de 95 % la empresa pierde ventas y reputación. Fórmula: Nivel de servicio = unidades vendidas ÷ unidades demandadas
- Días de inventario: Número de días de venta que cubre el inventario actual. Muchos días significan caja inmovilizada y riesgo de obsolescencia. Fórmula: Días de inventario = inventario final ÷ unidades vendidas en el mes × 30
- Tiempo de entrega (lead time): Tiempo entre la orden de compra y la llegada de la mercancía. En el simulador, el proveedor local entrega de inmediato y la importación tarda un mes.
- TRM: Tasa Representativa del Mercado: precio oficial del dólar en pesos colombianos que certifica la Superintendencia Financiera. Cambia todos los días.
- Costo nacionalizado: Costo total de un producto importado puesto en bodega: precio en dólares convertido a pesos, más aranceles, fletes, seguros y agenciamiento aduanero. Fórmula: Costo nacionalizado = USD × TRM × (1 + arancel y logística) + flete fijo ÷ unidades
- Elasticidad precio de la demanda: Sensibilidad de la cantidad demandada ante un cambio de precio. Con elasticidad mayor que 1, subir el precio reduce las ventas en una proporción mayor. Fórmula: Elasticidad = variación % de la cantidad ÷ variación % del precio
- Margen bruto: Proporción de las ventas que queda después del costo de la mercancía vendida. Fórmula: Margen bruto = (ventas − costo de ventas) ÷ ventas
- Margen de contribución: Lo que queda de cada venta después de todos los costos variables (mercancía, comisión de pasarela, envíos y procesos). Cubre los gastos fijos y genera la utilidad. Fórmula: Margen de contribución = (ventas − costos variables) ÷ ventas
- Utilidad neta: Resultado final del mes después de costos, gastos, intereses e impuesto de renta (35 % en el simulador).
- Flujo de caja: Movimiento real de dinero. Las compras de inventario salen de la caja cuando se pagan, aunque el costo de ventas se registre cuando se vende. Por eso una empresa con utilidad puede quedarse sin caja.
- Sobregiro: Crédito automático del banco cuando la cuenta queda en negativo. Cobra la tasa más alta y tiene un cupo limitado.
- Patrimonio: Valor que pertenece a los dueños. Si es negativo, la empresa está en causal de disolución y el simulador la liquida. Fórmula: Patrimonio = activos (caja + inventario + mercancía en tránsito) − pasivos (préstamos + sobregiro)
- CPC: Costo por clic: lo que se paga a la plataforma de pauta por cada visita que llega a la tienda.
- Tasa de conversión: Porcentaje de visitas que terminan en compra. Depende del precio, la confianza en la marca, la experiencia de la tienda y los costos de envío. Fórmula: Conversión = pedidos ÷ visitas
- ROAS: Retorno de la inversión publicitaria: pesos vendidos por cada peso invertido en pauta. Fórmula: ROAS = ventas atribuidas a la pauta ÷ inversión en pauta
- ROAS de equilibrio: ROAS mínimo para que la pauta no genere pérdida en el corto plazo. Fórmula: ROAS de equilibrio = 1 ÷ margen de contribución
- CAC: Costo de adquisición de clientes: inversión en pauta dividida por los clientes nuevos que llegaron por la pauta. Fórmula: CAC = inversión en pauta ÷ clientes nuevos por pauta
- Rendimientos decrecientes: Cada peso adicional en pauta trae menos clics que el anterior porque la audiencia interesada se agota.
- Carrito abandonado: Compra iniciada que no se paga. Un flujo automático de correo o WhatsApp recuerda al cliente y recupera parte de esas ventas.
- Fuga de clientes (churn): Porcentaje de clientes activos que dejan de comprar en el mes. Baja cuando la satisfacción sube. Fórmula: Fuga = clientes perdidos ÷ clientes al inicio del mes
- Valor del cliente en el tiempo (LTV): Utilidad que deja un cliente durante toda su relación con la empresa. Justifica invertir en adquisición y fidelización por encima del margen de la primera compra.
- Capacidad de servicio: Pedidos y solicitudes que el equipo puede atender en el mes con calidad. Si la demanda la supera, se acumulan demoras y quejas. Fórmula: Capacidad = asesores × pedidos por asesor + capacidad del chatbot
- Facturación electrónica: Obligación tributaria ante la DIAN. Integrarla al ERP elimina digitación, reprocesos y errores de conciliación.
- Cuadro de mando integral: Modelo de evaluación que equilibra perspectivas financieras, de clientes y de procesos internos. El puntaje del simulador usa este enfoque: finanzas 40, clientes 30 y procesos 30.
