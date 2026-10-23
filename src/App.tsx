import { CORE_MODULES } from './erp/meta';
import { useErp, useRoute } from './erp/store';
import type { ErpState, ModuleKey } from './erp/types';
import { AccountingModule } from './modules/Accounting';
import { AutomationModule } from './modules/Automation';
import { CrmModule } from './modules/Crm';
import { EcommerceModule } from './modules/Ecommerce';
import { Home } from './modules/Home';
import { InventoryModule } from './modules/Inventory';
import { LearningModule } from './modules/Learning';
import { MissionsModule } from './modules/Missions';
import { Onboarding } from './modules/Onboarding';
import { PurchasingModule } from './modules/Purchasing';
import { SalesModule } from './modules/Sales';
import { SettingsModule } from './modules/Settings';
import { SimulatorModule } from './modules/Simulator';
import { Shell } from './shell/Shell';

function ModuleView({ s, module }: { s: ErpState; module: ModuleKey }) {
  const enabled = CORE_MODULES.includes(module) || s.settings.enabledModules[module] !== false;
  if (!enabled) return <Home s={s} />;
  switch (module) {
    case 'misiones':
      return <MissionsModule s={s} />;
    case 'crm':
      return <CrmModule s={s} />;
    case 'ventas':
      return <SalesModule s={s} />;
    case 'ecommerce':
      return <EcommerceModule s={s} />;
    case 'inventario':
      return <InventoryModule s={s} />;
    case 'compras':
      return <PurchasingModule s={s} />;
    case 'contabilidad':
      return <AccountingModule s={s} />;
    case 'automatizacion':
      return <AutomationModule s={s} />;
    case 'simulador':
      return <SimulatorModule defaultProfile={s.profile} />;
    case 'aprendizaje':
      return <LearningModule />;
    case 'configuracion':
      return <SettingsModule s={s} />;
    default:
      return <Home s={s} />;
  }
}

export default function App() {
  const s = useErp();
  const route = useRoute();
  if (!s) return <Onboarding />;
  return (
    <Shell s={s}>
      <ModuleView key={route.module} s={s} module={route.module} />
    </Shell>
  );
}
