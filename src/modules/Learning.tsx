import { Glossary } from '../components/Glossary';
import { SpeakButton } from '../components/ui';
import { LEARNING_OUTCOMES } from '../content/pedagogy';
import { PageHeader, Section } from '../ui/kit';

const FLOWS = [
  {
    title: 'Ciclo de venta (order to cash)',
    steps: ['Oportunidad en el CRM', 'Cotización', 'Pedido confirmado: reserva inventario', 'Despacho: salida del kardex y costo de ventas', 'Factura electrónica: cuenta por cobrar e IVA', 'Pago: ingreso a bancos'],
  },
  {
    title: 'Ciclo de compra (procure to pay)',
    steps: ['Punto de reorden alcanzado', 'Orden de compra en borrador', 'Aprobación', 'Recepción: entrada al kardex y cuenta por pagar', 'Pago al proveedor'],
  },
  {
    title: 'Ciclo del comercio electrónico',
    steps: ['Publicación en el catálogo', 'Campaña de pauta', 'Pedido web pagado por pasarela', 'Despacho y factura', 'Medición del ROAS'],
  },
];

export function LearningModule() {
  return (
    <div className="page">
      <PageHeader title="Aprendizaje" crumbs={['Formación', 'Aprendizaje']} subtitle="Resultados de aprendizaje, procesos integrados y glosario gerencial." />
      <div className="grid-2">
        <Section title="Resultados de aprendizaje">
          <ol className="outcomes">
            {LEARNING_OUTCOMES.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ol>
          <SpeakButton text={`Resultados de aprendizaje. ${LEARNING_OUTCOMES.join(' ')}`} id="resultados" />
        </Section>
        <Section title="Atajos del sistema">
          <ul className="plain">
            <li>
              <kbd>Ctrl</kbd> + <kbd>K</kbd>: buscar clientes, productos, pedidos, facturas o módulos.
            </li>
            <li>
              <strong>Cerrar día</strong>: avanza el calendario, llegan pedidos, pagos y mercancía, y se ejecutan las automatizaciones.
            </li>
            <li>
              <strong>Campana</strong>: avisos de la operación con enlace directo al registro.
            </li>
            <li>
              <strong>Misión activa</strong>: el panel inferior muestra el siguiente objetivo y te lleva al módulo.
            </li>
            <li>
              <strong>Audio</strong>: activa la narración y elige la voz; los botones Escuchar leen guías, misiones y resúmenes.
            </li>
          </ul>
        </Section>
      </div>
      <Section title="Procesos integrados">
        <div className="flows">
          {FLOWS.map((f) => (
            <div key={f.title} className="flow">
              <h3>{f.title}</h3>
              <ol>
                {f.steps.map((st) => (
                  <li key={st}>{st}</li>
                ))}
              </ol>
              <SpeakButton text={`${f.title}. ${f.steps.join('. ')}.`} id={`flujo-${f.title}`} />
            </div>
          ))}
        </div>
      </Section>
      <Glossary />
    </div>
  );
}
