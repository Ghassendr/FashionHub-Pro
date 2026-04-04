import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './shared/components/Layout/Layout';
import Home from './shared/pages/Home';
import ProtectedRoute from './shared/components/Auth/ProtectedRoute'; // Added
import Onboarding from './actors/client/pages/Onboarding';
import BodyMeasurements from './actors/client/pages/BodyMeasurements';
import MyCostumes from './actors/client/pages/MyCostumes';
import PostureSpace from './actors/client/pages/PostureSpace';
import Profile from './actors/client/pages/Profile';
import CreateDesignWizard from './actors/client/pages/CreateDesignWizard';
import DeliveryDashboard from './actors/delivery/pages/DeliveryDashboard';
import CoutureHouseDashboard from './actors/couturehouse/pages/Dashboard';
import CreateDesign from './actors/couturehouse/pages/CreateDesign';
import Inquiries from './actors/couturehouse/pages/Inquiries';
import CommandesEnCours from './actors/couturehouse/pages/CommandesEnCours';
import OrderDetail from './actors/couturehouse/pages/OrderDetail';
import CoutureHouseFabricsInventory from './actors/couturehouse/pages/FabricsInventory';
import FournisseurDashboard from './actors/Fournisseur/Dashboard';
import FournisseurSettings from './actors/Fournisseur/Settings';
import SupplierFabricOrders from './actors/Fournisseur/SupplierFabricOrders';
import ReviewDashboard from './actors/admin/pages/ReviewDashboard';
import AdminLayout from './actors/admin/components/AdminLayout';
import AdminOverview from './actors/admin/pages/AdminOverview';
import PendingVerification from './shared/pages/PendingVerification';
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

      {/* Fournisseur Dashboards - Standalone Fullscreen */}
      <Route path="/fournisseur" element={<ProtectedRoute allowedRoles={['fournisseur']}><Outlet /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<FournisseurDashboard />} />
        <Route path="orders" element={<SupplierFabricOrders />} />
        <Route path="settings" element={<FournisseurSettings />} />
      </Route>

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

        {/* Client Domain - Restricted to Clients */}
        <Route path="client" element={<ProtectedRoute allowedRoles={['client']}><Outlet /></ProtectedRoute>}>
          <Route index element={<Navigate to="posture" replace />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="3d-measurements" element={<BodyMeasurements />} />
          <Route path="costumes" element={<MyCostumes />} />
          <Route path="posture" element={<PostureSpace />} />
        </Route>

        {/* Couture House Domain - Restricted to Couture Houses */}
        <Route path="couturehouse" element={<ProtectedRoute allowedRoles={['couture_house']}><Outlet /></ProtectedRoute>}>
          <Route index element={<CoutureHouseDashboard />} />
          <Route path="designs" element={<CoutureHouseDashboard />} />
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="orders" element={<CommandesEnCours />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="create" element={<CreateDesign />} />
          <Route path="fabrics" element={<CoutureHouseFabricsInventory />} />
        </Route>



        {/* User Profile */}
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Profile - Standard Protected Route */}
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Pending Verification Route */}
        <Route path="pending-verification" element={<PendingVerification />} />
      </Route>

      {/* Admin Dashboard (Standalone Fullscreen with AdminLayout) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<AdminOverview />} />
        <Route path="review" element={<ReviewDashboard />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
