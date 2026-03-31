import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './shared/components/Layout/Layout';
import Home from './shared/pages/Home';
import ProtectedRoute from './shared/components/Auth/ProtectedRoute'; // Added
import Onboarding from './actors/client/pages/Onboarding';
import BodyMeasurements from './actors/client/pages/BodyMeasurements';
import Delivery from './actors/delivery/pages/Delivery';
import CoutureHouse from './actors/delivery/pages/CoutureHouse';
import ActivityDashboard from './Pages/Dashboard';
import CoutureHouseDashboard from './actors/couturehouse/pages/Dashboard';
import CreateDesign from './actors/couturehouse/pages/CreateDesign';
import FournisseurDashboard from './actors/Fournisseur/Dashboard';
import FournisseurSettings from './actors/Fournisseur/Settings';
import ReviewDashboard from './actors/admin/pages/ReviewDashboard';

function App() {
  return (
    <Routes>
      {/* Delivery Dashboard (Standalone Fullscreen) */}
      <Route 
        path="/delivery" 
        element={
          <ProtectedRoute allowedRoles={['delivery']}>
            <Delivery />
          </ProtectedRoute>
        } 
      />

      <Route path="/" element={<Layout />}>
        {/* Main Portal - Public */}
        <Route index element={<Home />} />

        {/* Client Domain - Restricted to Clients */}
        <Route path="client" element={
          <ProtectedRoute allowedRoles={['client']}>
            <Layout /> {/* Nested Layout if needed, or just let children handle it */}
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="3d-measurements" replace />} />
          <Route path="onboarding" element={<Onboarding />} />
          <Route path="3d-measurements" element={<BodyMeasurements />} />
        </Route>

        {/* Couture House Domain - Restricted to Couture Houses */}
        <Route path="couturehouse" element={
          <ProtectedRoute allowedRoles={['couture_house']}>
             <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<ActivityDashboard />} />
          <Route path="designs" element={<CoutureHouseDashboard />} />
          <Route path="create" element={<CreateDesign />} />
        </Route>

        {/* Fournisseur Domain - Restricted to Suppliers */}
        <Route path="fournisseur" element={
          <ProtectedRoute allowedRoles={['fournisseur']}>
             <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<FournisseurDashboard />} />
          <Route path="settings" element={<FournisseurSettings />} />
        </Route>

        {/* Admin Review Dashboard - Restricted to Admins */}
        <Route 
          path="admin/review" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ReviewDashboard />
            </ProtectedRoute>
          } 
        />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
