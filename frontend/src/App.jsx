import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './shared/components/Layout/Layout';
import Home from './shared/pages/Home';
import ProtectedRoute from './shared/components/Auth/ProtectedRoute'; // Added
import Onboarding from './actors/client/pages/Onboarding';
import BodyMeasurements from './actors/client/pages/BodyMeasurements';
import CreateDesignWizard from './actors/client/pages/CreateDesignWizard';
import DeliveryDashboard from './actors/delivery/pages/DeliveryDashboard';
import CoutureHouse from './actors/delivery/pages/CoutureHouse';
import CoutureHouseDashboard from './actors/couturehouse/pages/Dashboard';
import CreateDesign from './actors/couturehouse/pages/CreateDesign';
import Inquiries from './actors/couturehouse/pages/Inquiries';
import CoutureHouseFabricsInventory from './actors/couturehouse/pages/FabricsInventory';
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

      {/* Client Design Wizard - Standalone (no Layout wrapper) */}
      <Route
        path="/client/create-design"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <CreateDesignWizard />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Layout />}>
        {/* Main Portal - Public */}
        <Route index element={<Home />} />
        <Route path="profile/:userId?" element={<ProtectedRoute allowedRoles={['client']}><Profile /></ProtectedRoute>} />

        {/* Client Domain - Restricted to Clients */}
        <Route path="client" element={<ProtectedRoute allowedRoles={['client']} />}>
          <Route index element={<Navigate to="3d-measurements" replace />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="3d-measurements" element={<BodyMeasurements />} />
        </Route>

        {/* Couture House Domain - Restricted to Couture Houses */}
        <Route path="couturehouse" element={<ProtectedRoute allowedRoles={['couture_house']} />}>
          <Route index element={<Navigate to="designs" replace />} />
          <Route path="fabrics" element={<CoutureHouseFabricsInventory />} />
          <Route path="designs" element={<CoutureHouseDashboard />} />
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="create" element={<CreateDesign />} />
        </Route>

        {/* Fournisseur Domain - Restricted to Suppliers */}
        <Route path="fournisseur" element={<ProtectedRoute allowedRoles={['fournisseur']} />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<FournisseurDashboard />} />
          <Route path="settings" element={<FournisseurSettings />} />
        </Route>

        {/* Admin Domain */}
        <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route index element={<ReviewDashboard />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
