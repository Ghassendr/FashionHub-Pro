import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './shared/components/Layout/Layout';
import ProfileLayoutWrapper from './shared/components/Layout/ProfileLayoutWrapper';
import Home from './shared/pages/Home';
import ProtectedRoute from './shared/components/Auth/ProtectedRoute';
import Onboarding from './actors/client/pages/Onboarding';
import BodyMeasurements from './actors/client/pages/BodyMeasurements';
import MyCostumes from './actors/client/pages/MyCostumes';
import CostumeDetails from './actors/client/pages/CostumeDetails';
import PostureSpace from './actors/client/pages/PostureSpace';
import Profile from './actors/client/pages/Profile';
import CreateDesignWizard from './actors/client/pages/CreateDesignWizard';
import DeliveryDashboard from './actors/delivery/pages/DeliveryDashboard';
import CoutureHouse from './actors/delivery/pages/CoutureHouse';

// Couture House Pages
import CoutureAtelier from './actors/couturehouse/pages/Atelier';
import CoutureMyCreations from './actors/couturehouse/pages/MyCreations';
import CoutureFabrics from './actors/couturehouse/pages/FabricsInventory';
import CreateDesign from './actors/couturehouse/pages/CreateDesign';
import Inquiries from './actors/couturehouse/pages/Inquiries';

// Supplier Pages
import SupplierAtelier from './actors/Fournisseur/Atelier';
import SupplierMyCreations from './actors/Fournisseur/MyCreations';
import FournisseurSettings from './actors/Fournisseur/Settings';

// Admin Pages
import ReviewDashboard from './actors/admin/pages/ReviewDashboard';
import AdminLayout from './actors/admin/components/AdminLayout';
import AdminOverview from './actors/admin/pages/AdminOverview';
import PendingVerification from './shared/pages/PendingVerification';

// Bank Card Pages
import ClientBankCardPage from './actors/client/pages/BankCardPage';
import CouturehouseBankCard from './actors/couturehouse/pages/BankCardPage';
import FournisseurBankCard from './actors/Fournisseur/BankCardPage';
import DeliveryBankCard from './actors/delivery/pages/BankCardPage';

function App() {
  return (
    <Routes>
      {/* Client Design Wizard - Standalone (no Layout wrapper) */}
      <Route
        path="/client/create-design"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <CreateDesignWizard />
          </ProtectedRoute>
        }
      />

      {/* Main Generic Layout (No Sidebar, Topbar present) */}
      <Route path="/" element={<Layout />}>
        {/* Main Portal - Public */}
        <Route index element={<Home />} />
        <Route path="pending-verification" element={<PendingVerification />} />

        {/* Client Onboarding */}
        <Route path="client/onboarding" element={<ProtectedRoute allowedRoles={['client']}><Onboarding /></ProtectedRoute>} />
        <Route path="client/3d-measurements" element={<ProtectedRoute allowedRoles={['client']}><BodyMeasurements /></ProtectedRoute>} />
      </Route>

      {/* Profile Space Layout (Universal Context-Aware Sidebar) */}
      <Route element={<ProtectedRoute><ProfileLayoutWrapper /></ProtectedRoute>}>
        {/* Global Profile Page */}
        <Route path="/profile" element={<Profile />} />

        {/* Client Sidebar Routes */}
        <Route path="/client/posture" element={<ProtectedRoute allowedRoles={['client']}><PostureSpace /></ProtectedRoute>} />
        <Route path="/client/costumes" element={<ProtectedRoute allowedRoles={['client']}><MyCostumes /></ProtectedRoute>} />
        <Route path="/client/costumes/:id" element={<ProtectedRoute allowedRoles={['client']}><CostumeDetails /></ProtectedRoute>} />
        <Route path="/client/bank-card" element={<ProtectedRoute allowedRoles={['client']}><ClientBankCardPage /></ProtectedRoute>} />

        {/* Fournisseur Sidebar Routes */}
        <Route path="/fournisseur/dashboard" element={<ProtectedRoute allowedRoles={['fournisseur']}><SupplierAtelier /></ProtectedRoute>} />
        <Route path="/fournisseur/creations" element={<ProtectedRoute allowedRoles={['fournisseur']}><SupplierMyCreations /></ProtectedRoute>} />
        <Route path="/fournisseur/settings" element={<ProtectedRoute allowedRoles={['fournisseur']}><FournisseurSettings /></ProtectedRoute>} />
        <Route path="/fournisseur/bank-card" element={<ProtectedRoute allowedRoles={['fournisseur']}><FournisseurBankCard /></ProtectedRoute>} />

        {/* CoutureHouse Sidebar Routes */}
        <Route path="/couturehouse" element={<ProtectedRoute allowedRoles={['couture_house']}><CoutureAtelier /></ProtectedRoute>} />
        <Route path="/couturehouse/creations" element={<ProtectedRoute allowedRoles={['couture_house']}><CoutureMyCreations /></ProtectedRoute>} />
        <Route path="/couturehouse/fabrics" element={<ProtectedRoute allowedRoles={['couture_house']}><CoutureFabrics /></ProtectedRoute>} />
        <Route path="/couturehouse/create" element={<ProtectedRoute allowedRoles={['couture_house']}><CreateDesign /></ProtectedRoute>} />
        <Route path="/couturehouse/inquiries" element={<ProtectedRoute allowedRoles={['couture_house']}><Inquiries /></ProtectedRoute>} />
        <Route path="/couturehouse/bank-card" element={<ProtectedRoute allowedRoles={['couture_house']}><CouturehouseBankCard /></ProtectedRoute>} />

        {/* Delivery Sidebar Routes */}
        <Route path="/delivery" element={<ProtectedRoute allowedRoles={['delivery']}><DeliveryDashboard /></ProtectedRoute>} />
        <Route path="/delivery/bank-card" element={<ProtectedRoute allowedRoles={['delivery']}><DeliveryBankCard /></ProtectedRoute>} />
      </Route>

      {/* Admin Dashboard (Standalone Fullscreen with its own AdminLayout) */}
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
