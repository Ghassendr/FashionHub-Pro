<<<<<<< HEAD
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './shared/components/Layout/Layout';
import Home from './shared/pages/Home';
import Onboarding from './actors/client/pages/Onboarding';
import Dashboard from './actors/client/pages/Dashboard';
import BodyMeasurements from './actors/client/pages/BodyMeasurements';
import Delivery from './actors/delivery/pages/Delivery';
import CoutureHouse from './actors/delivery/pages/CoutureHouse';

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
=======
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./App.css";

// Pages
import Homepage from "./Pages/Homepage";
import Login from "./Pages/Login";
import CreateAccount from "./Pages/CreateAccount";
import Dashboard from "./Pages/Dashboard";
import Settings from "./Pages/Settings";

// Components
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create-account" element={<CreateAccount />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
>>>>>>> 79d324d3f41813facfd92db59e17056b73c678e1
  );
}

export default App;
