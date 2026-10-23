import type { ModuleId } from '../engine/types';

export const LEARNING_OUTCOMES = [
  'Interpretar los indicadores de un ERP integrado (inventario, ventas, clientes y caja) para tomar decisiones gerenciales mensuales.',
  'Planear compras e inventario con pronósticos estacionales, stock de seguridad y punto de reorden.',
  'Evaluar la rentabilidad de la pauta digital comparando el ROAS obtenido con el ROAS de equilibrio.',
  'Gestionar la relación con el cliente (CRM) dimensionando la capacidad de servicio y la fidelización.',
  'Justificar inversiones en automatización de procesos con un análisis costo-beneficio.',
  'Proteger la liquidez de la empresa con un flujo de caja proyectado y el uso responsable del crédito.',
];

export interface GlossaryTerm {
  term: string;
  module: ModuleId;
  definition: string;
  formula?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'ERP', module: 'erp', definition: 'Sistema de planificación de recursos empresariales. Integra en una sola base de datos compras, inventario, ventas, contabilidad y talento humano, para que cada área decida con la misma información.' },
  { term: 'CRM', module: 'crm', definition: 'Sistema de gestión de la relación con el cliente. Registra clientes, pedidos, solicitudes de servicio y campañas para aumentar la retención y la recompra.' },
  { term: 'E-commerce', module: 'ecommerce', definition: 'Canal de venta en línea. Su desempeño depende del tráfico, la tasa de conversión, el ticket promedio y la experiencia de compra.' },
  { term: 'Automatización de procesos', module: 'automatizacion', definition: 'Uso de reglas y software para ejecutar tareas repetitivas sin intervención manual (reposición, facturación, mensajes a clientes). Se justifica cuando el ahorro mensual supera la mensualidad y recupera la implementación en un plazo razonable.' },
  { term: 'Pronóstico estacional', module: 'erp', definition: 'Estimación de la demanda futura que ajusta la demanda base por un índice del mes (temporadas como Carnaval, Día de la Madre, Black Friday o diciembre).', formula: 'Pronóstico = demanda del último mes ÷ índice de ese mes × índice del mes siguiente' },
  { term: 'Stock de seguridad', module: 'erp', definition: 'Inventario adicional que protege contra la variación de la demanda y los retrasos del proveedor.', formula: 'Stock de seguridad ≈ 15 % a 25 % de la demanda pronosticada (método simplificado)' },
  { term: 'Punto de reorden', module: 'erp', definition: 'Nivel de inventario en el que se debe emitir una nueva orden de compra.', formula: 'Punto de reorden = demanda diaria × tiempo de entrega + stock de seguridad' },
  { term: 'Nivel de servicio', module: 'erp', definition: 'Porcentaje de la demanda que se atiende con el inventario disponible (fill rate). Por debajo de 95 % la empresa pierde ventas y reputación.', formula: 'Nivel de servicio = unidades vendidas ÷ unidades demandadas' },
  { term: 'Días de inventario', module: 'erp', definition: 'Número de días de venta que cubre el inventario actual. Muchos días significan caja inmovilizada y riesgo de obsolescencia.', formula: 'Días de inventario = inventario final ÷ unidades vendidas en el mes × 30' },
  { term: 'Tiempo de entrega (lead time)', module: 'erp', definition: 'Tiempo entre la orden de compra y la llegada de la mercancía. En el simulador, el proveedor local entrega de inmediato y la importación tarda un mes.' },
  { term: 'TRM', module: 'erp', definition: 'Tasa Representativa del Mercado: precio oficial del dólar en pesos colombianos que certifica la Superintendencia Financiera. Cambia todos los días.' },
  { term: 'Costo nacionalizado', module: 'erp', definition: 'Costo total de un producto importado puesto en bodega: precio en dólares convertido a pesos, más aranceles, fletes, seguros y agenciamiento aduanero.', formula: 'Costo nacionalizado = USD × TRM × (1 + arancel y logística) + flete fijo ÷ unidades' },
  { term: 'Elasticidad precio de la demanda', module: 'erp', definition: 'Sensibilidad de la cantidad demandada ante un cambio de precio. Con elasticidad mayor que 1, subir el precio reduce las ventas en una proporción mayor.', formula: 'Elasticidad = variación % de la cantidad ÷ variación % del precio' },
  { term: 'Margen bruto', module: 'finanzas', definition: 'Proporción de las ventas que queda después del costo de la mercancía vendida.', formula: 'Margen bruto = (ventas − costo de ventas) ÷ ventas' },
  { term: 'Margen de contribución', module: 'finanzas', definition: 'Lo que queda de cada venta después de todos los costos variables (mercancía, comisión de pasarela, envíos y procesos). Cubre los gastos fijos y genera la utilidad.', formula: 'Margen de contribución = (ventas − costos variables) ÷ ventas' },
  { term: 'Utilidad neta', module: 'finanzas', definition: 'Resultado final del mes después de costos, gastos, intereses e impuesto de renta (35 % en el simulador).' },
  { term: 'Flujo de caja', module: 'finanzas', definition: 'Movimiento real de dinero. Las compras de inventario salen de la caja cuando se pagan, aunque el costo de ventas se registre cuando se vende. Por eso una empresa con utilidad puede quedarse sin caja.' },
  { term: 'Sobregiro', module: 'finanzas', definition: 'Crédito automático del banco cuando la cuenta queda en negativo. Cobra la tasa más alta y tiene un cupo limitado.' },
  { term: 'Patrimonio', module: 'finanzas', definition: 'Valor que pertenece a los dueños. Si es negativo, la empresa está en causal de disolución y el simulador la liquida.', formula: 'Patrimonio = activos (caja + inventario + mercancía en tránsito) − pasivos (préstamos + sobregiro)' },
  { term: 'CPC', module: 'ecommerce', definition: 'Costo por clic: lo que se paga a la plataforma de pauta por cada visita que llega a la tienda.' },
  { term: 'Tasa de conversión', module: 'ecommerce', definition: 'Porcentaje de visitas que terminan en compra. Depende del precio, la confianza en la marca, la experiencia de la tienda y los costos de envío.', formula: 'Conversión = pedidos ÷ visitas' },
  { term: 'ROAS', module: 'ecommerce', definition: 'Retorno de la inversión publicitaria: pesos vendidos por cada peso invertido en pauta.', formula: 'ROAS = ventas atribuidas a la pauta ÷ inversión en pauta' },
  { term: 'ROAS de equilibrio', module: 'ecommerce', definition: 'ROAS mínimo para que la pauta no genere pérdida en el corto plazo.', formula: 'ROAS de equilibrio = 1 ÷ margen de contribución' },
  { term: 'CAC', module: 'ecommerce', definition: 'Costo de adquisición de clientes: inversión en pauta dividida por los clientes nuevos que llegaron por la pauta.', formula: 'CAC = inversión en pauta ÷ clientes nuevos por pauta' },
  { term: 'Rendimientos decrecientes', module: 'ecommerce', definition: 'Cada peso adicional en pauta trae menos clics que el anterior porque la audiencia interesada se agota.' },
  { term: 'Carrito abandonado', module: 'automatizacion', definition: 'Compra iniciada que no se paga. Un flujo automático de correo o WhatsApp recuerda al cliente y recupera parte de esas ventas.' },
  { term: 'Fuga de clientes (churn)', module: 'crm', definition: 'Porcentaje de clientes activos que dejan de comprar en el mes. Baja cuando la satisfacción sube.', formula: 'Fuga = clientes perdidos ÷ clientes al inicio del mes' },
  { term: 'Valor del cliente en el tiempo (LTV)', module: 'crm', definition: 'Utilidad que deja un cliente durante toda su relación con la empresa. Justifica invertir en adquisición y fidelización por encima del margen de la primera compra.' },
  { term: 'Capacidad de servicio', module: 'crm', definition: 'Pedidos y solicitudes que el equipo puede atender en el mes con calidad. Si la demanda la supera, se acumulan demoras y quejas.', formula: 'Capacidad = asesores × pedidos por asesor + capacidad del chatbot' },
  { term: 'Facturación electrónica', module: 'automatizacion', definition: 'Obligación tributaria ante la DIAN. Integrarla al ERP elimina digitación, reprocesos y errores de conciliación.' },
  { term: 'Cuadro de mando integral', module: 'finanzas', definition: 'Modelo de evaluación que equilibra perspectivas financieras, de clientes y de procesos internos. El puntaje del simulador usa este enfoque: finanzas 40, clientes 30 y procesos 30.' },
];

export interface QuizQuestion {
  id: string;
  module: ModuleId;
  context: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    module: 'erp',
    context: 'Una tienda vendió 600 unidades en octubre (índice estacional 1,0). El índice de noviembre es 1,35. Tiene 200 unidades en bodega y quiere un stock de seguridad de 20 %.',
    question: '¿Cuántas unidades debe comprar al proveedor local para noviembre?',
    options: ['600', '772', '810', '972'],
    answer: 1,
    explanation: 'Pronóstico = 600 ÷ 1,0 × 1,35 = 810. Inventario objetivo = 810 × 1,2 = 972. Compra = 972 − 200 = 772.',
  },
  {
    id: 'q2',
    module: 'ecommerce',
    context: 'Un producto tiene un margen de contribución de 40 %. La campaña en Meta Ads obtuvo un ROAS de 2,1.',
    question: '¿Qué conclusión es correcta en el corto plazo?',
    options: [
      'La campaña es rentable porque vende más de lo que cuesta.',
      'La campaña pierde dinero porque el ROAS de equilibrio es 2,5.',
      'La campaña está en equilibrio porque el ROAS supera 2.',
      'No se puede concluir nada sin conocer el CPC.',
    ],
    answer: 1,
    explanation: 'ROAS de equilibrio = 1 ÷ 0,40 = 2,5. Con ROAS de 2,1 cada peso en pauta deja 2,1 × 0,40 = 0,84 pesos de contribución: se pierden 16 centavos por peso, salvo que la recompra futura (LTV) compense.',
  },
  {
    id: 'q3',
    module: 'erp',
    context: 'Un artículo cuesta USD 9 en origen. La TRM es 4.000 y el arancel más la logística suman 25 %. El flete fijo del embarque es $1.800.000. El proveedor local vende a $52.000.',
    question: '¿Desde qué cantidad aproximada conviene importar?',
    options: ['Desde 100 unidades', 'Desde 300 unidades', 'Desde 1.000 unidades', 'Nunca conviene'],
    answer: 1,
    explanation: 'Costo unitario importado = 9 × 4.000 × 1,25 = $45.000. Ahorro por unidad = $7.000. El flete fijo se cubre con 1.800.000 ÷ 7.000 ≈ 257 unidades. Desde unas 300 unidades la importación es más barata, si la empresa puede esperar un mes.',
  },
  {
    id: 'q4',
    module: 'crm',
    context: 'Se esperan 900 pedidos en diciembre. Cada asesor atiende 220 pedidos al mes y el chatbot suma 250 pedidos de capacidad.',
    question: '¿Cuántos asesores se necesitan si se activa el chatbot?',
    options: ['2', '3', '4', '5'],
    answer: 1,
    explanation: 'Pedidos a cubrir con asesores = 900 − 250 = 650. Asesores = 650 ÷ 220 = 2,95, es decir, 3 asesores.',
  },
  {
    id: 'q5',
    module: 'finanzas',
    context: 'Una empresa registra utilidad neta positiva por tres meses seguidos, pero su caja baja cada mes hasta usar sobregiro.',
    question: '¿Cuál es la causa más probable?',
    options: [
      'Los impuestos se calculan sobre las ventas y no sobre la utilidad.',
      'Está comprando más inventario del que vende y la caja queda inmovilizada en bodega.',
      'El costo de ventas se paga dos veces.',
      'La pauta digital no se registra en el estado de resultados.',
    ],
    answer: 1,
    explanation: 'Las compras salen de la caja cuando se pagan, pero solo pasan al estado de resultados cuando se venden. Comprar en exceso aumenta el inventario (activo) y consume caja sin afectar la utilidad del mes.',
  },
  {
    id: 'q6',
    module: 'automatizacion',
    context: 'La empresa factura $80.000.000 al mes. Los procesos manuales de facturación cuestan 1,5 % de las ventas. Integrar la facturación al ERP cuesta 0,4 % de las ventas más $300.000 mensuales y $1.200.000 de implementación.',
    question: '¿En cuánto tiempo se recupera la implementación?',
    options: ['Menos de un mes', 'Unos dos meses', 'Unos seis meses', 'No se recupera'],
    answer: 1,
    explanation: 'Costo manual = $1.200.000. Costo automatizado = $320.000 + $300.000 = $620.000. Ahorro mensual = $580.000. Recuperación = 1.200.000 ÷ 580.000 ≈ 2,1 meses.',
  },
  {
    id: 'q7',
    module: 'erp',
    context: 'La demanda de un producto tiene elasticidad precio de 2,4. La gerencia sube el precio 10 %.',
    question: '¿Qué ocurre con la cantidad demandada, aproximadamente?',
    options: ['Baja 2,4 %', 'Baja 10 %', 'Baja cerca de 20 %', 'Sube 24 %'],
    answer: 2,
    explanation: 'Con elasticidad constante, la cantidad cambia en (1 ÷ 1,10)^2,4 ≈ 0,80: cae cerca de 20 %. Una aproximación lineal da 2,4 × 10 % = 24 %. En ambos casos la caída supera el aumento del precio.',
  },
  {
    id: 'q8',
    module: 'crm',
    context: 'Un cliente compra en promedio una vez cada cinco meses, deja $25.000 de contribución por compra y permanece dos años con la marca.',
    question: '¿Cuál es el CAC máximo que la empresa podría pagar sin perder dinero?',
    options: ['$25.000', '$50.000', '$120.000', '$600.000'],
    answer: 2,
    explanation: 'En 24 meses el cliente compra 24 ÷ 5 ≈ 4,8 veces. LTV = 4,8 × 25.000 = $120.000. Pagar un CAC menor que el LTV permite recuperar la inversión.',
  },
  {
    id: 'q9',
    module: 'erp',
    context: 'Un ERP muestra 2.400 unidades en bodega y una venta de 800 unidades en el último mes.',
    question: '¿Cuántos días de inventario tiene la empresa?',
    options: ['30 días', '60 días', '90 días', '120 días'],
    answer: 2,
    explanation: 'Días de inventario = 2.400 ÷ 800 × 30 = 90 días. Es una cobertura alta para productos de moda o perecederos.',
  },
  {
    id: 'q10',
    module: 'ecommerce',
    context: 'Al duplicar el presupuesto de TikTok Ads de $2.000.000 a $4.000.000, los clics pasaron de 4.700 a 8.400.',
    question: '¿Qué explica este resultado?',
    options: [
      'Un error en la plataforma de pauta.',
      'Rendimientos decrecientes: la audiencia más interesada ya fue alcanzada.',
      'El precio del producto subió.',
      'La tasa de conversión de la tienda bajó.',
    ],
    answer: 1,
    explanation: 'Los clics crecieron 79 %, no 100 %. El costo por clic marginal sube a medida que la plataforma busca personas menos interesadas: son rendimientos decrecientes.',
  },
];

export const REFLECTION_PROMPTS = [
  '¿Qué decisión tuvo el mayor impacto positivo en tus resultados y qué indicador lo demuestra?',
  '¿Qué decisión cambiarías si repitieras la simulación? Explica qué dato del tablero te habría alertado antes.',
  '¿Cómo se conectan el inventario (ERP), la satisfacción del cliente (CRM) y la pauta digital (e-commerce) en tu empresa simulada?',
  '¿Qué automatización recomendarías a una pyme real de tu región y con qué cálculo la justificarías?',
];
