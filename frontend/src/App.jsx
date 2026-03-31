import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './shared/components/Layout/Layout';
import Home from './shared/pages/Home';
import ProtectedRoute from './shared/components/Auth/ProtectedRoute'; // Added
import Onboarding from './actors/client/pages/Onboarding';
import BodyMeasurements from './actors/client/pages/BodyMeasurements';
import DeliveryDashboard from './actors/delivery/pages/DeliveryDashboard';
import CoutureHouse from './actors/delivery/pages/CoutureHouse';
import ActivityDashboard from './Pages/Dashboard';
import CoutureHouseDashboard from './actors/couturehouse/pages/Dashboard';
import CreateDesign from './actors/couturehouse/pages/CreateDesign';
import FournisseurDashboard from './actors/Fournisseur/Dashboard';
import FournisseurSettings from './actors/Fournisseur/Settings';
import ReviewDashboard from './actors/admin/pages/ReviewDashboard';
import Profile from './shared/pages/Profile';

function App() {
  return (
    <Routes>
      {/* Delivery Dashboard (Standalone Fullscreen) */}
      <Route
        path="/delivery"
        element={
          <ProtectedRoute allowedRoles={['delivery']}>
            <DeliveryDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Layout />}>
        {/* Main Portal - Public */}
        <Route index element={<Home />} />
        <Route path="profile/:userId?" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Client Domain - Restricted to Clients */}
        <Route path="client" element={<ProtectedRoute allowedRoles={['client']} />}>
          <Route index element={<Navigate to="3d-measurements" replace />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="3d-measurements" element={<BodyMeasurements />} />
        </Route>
      </Route>

      {/* Specialty Dashboards - No Public Navbar */}
      <Route path="couturehouse" element={<ProtectedRoute allowedRoles={['couture_house']} />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CoutureHouseDashboard />} />
        <Route path="create" element={<CreateDesign />} />
      </Route>

      <Route path="fournisseur" element={<ProtectedRoute allowedRoles={['fournisseur']} />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<FournisseurDashboard />} />
        <Route path="settings" element={<FournisseurSettings />} />
      </Route>

      <Route path="admin/review" element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route index element={<ReviewDashboard />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
