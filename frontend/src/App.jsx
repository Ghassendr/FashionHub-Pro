import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './shared/components/Layout/Layout';
import Home from './shared/pages/Home';
import Onboarding from './actors/client/pages/Onboarding';
import Dashboard from './actors/client/pages/Dashboard';
import BodyMeasurements from './actors/client/pages/BodyMeasurements';
import Delivery from './actors/delivery/pages/DeliveryDashboard';
import CoutureHouse from './actors/delivery/pages/CoutureHouse';
import FournisseurDashboard from './actors/Fournisseur/Dashboard';
import FournisseurSettings from './actors/Fournisseur/Settings';

function App() {
  return (
    <Routes>
      {/* Delivery Dashboard (Standalone Fullscreen) */}
      <Route path="/delivery" element={<Delivery />} />

      <Route path="/" element={<Layout />}>
        {/* Main Portal */}
        <Route index element={<Home />} />

        {/* Client Domain */}
        <Route path="client">
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="3d-measurements" element={<BodyMeasurements />} />
        </Route>

        {/* Couture House Domain */}
        <Route path="couturehouse" element={<CoutureHouse />} />

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
