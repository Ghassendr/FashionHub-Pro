import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import BodyMeasurements from './pages/BodyMeasurements';
import Delivery from './pages/Delivery';
import CoutureHouse from './pages/CoutureHouse';

function App() {
  return (
    <Routes>
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

        {/* Delivery Domain */}
        <Route path="delivery" element={<Delivery />} />

        {/* Couture House Domain */}
        <Route path="couturehouse" element={<CoutureHouse />} />
      </Route>
    </Routes>
  );
}

export default App;
