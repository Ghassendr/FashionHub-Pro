import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './shared/components/Layout/Layout';
import Home from './shared/pages/Home';
import Onboarding from './actors/client/pages/Onboarding';
import BodyMeasurements from './actors/client/pages/BodyMeasurements';
import DeliveryDashboard from './actors/delivery/pages/DeliveryDashboard';
import ActivityDashboard from './Pages/Dashboard';
import CoutureHouseDashboard from './actors/couturehouse/pages/Dashboard';
import CreateDesign from './actors/couturehouse/pages/CreateDesign';
import FournisseurDashboard from './actors/Fournisseur/Dashboard';
import FournisseurSettings from './actors/Fournisseur/Settings';

function App() {
  return (
    <Routes>
      {/* Delivery Dashboard (Standalone Fullscreen) */}
      <Route path="/delivery" element={<DeliveryDashboard />} />

      <Route path="/" element={<Layout />}>
        {/* Main Portal */}
        <Route index element={<Home />} />

        {/* Client Domain */}
        <Route path="client">
          <Route index element={<Navigate to="3d-measurements" replace />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="3d-measurements" element={<BodyMeasurements />} />
        </Route>

        {/* Couture House Domain */}
        <Route path="couturehouse">
          <Route index element={<ActivityDashboard />} />
          <Route path="designs" element={<CoutureHouseDashboard />} />
          <Route path="create" element={<CreateDesign />} />
        </Route>

        {/* Fournisseur Domain */}
        <Route path="fournisseur">
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<FournisseurDashboard />} />
          <Route path="settings" element={<FournisseurSettings />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
