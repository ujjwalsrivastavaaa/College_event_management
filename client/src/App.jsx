import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ClubHeadDashboard from './pages/ClubHeadDashboard';
import StudentDashboard from './pages/StudentDashboard';
import JoinClubs from './pages/JoinClubs';
import BrowseEvents from './pages/BrowseEvents';
import QRScannerPage from './pages/QRScannerPage';
import CertificatesPage from './pages/CertificatesPage';
import EventAttendancePage from './pages/EventAttendancePage';

// Authenticated layout wrapper
const AppLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <Sidebar />
      {/* Top margin on mobile to account for mobile top-header height */}
      <div className="flex-1 pt-16 lg:pt-0">
        <Outlet />
      </div>
    </div>
  );
};

// Root "/" landing redirect component
const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  } else if (user.role === 'clubHead') {
    return <Navigate to="/clubhead" replace />;
  } else {
    return <Navigate to="/student" replace />;
  }
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes Layout */}
          <Route element={<AppLayout />}>
            {/* Root handler */}
            <Route path="/" element={<HomeRedirect />} />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clubs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/attendance/:eventId"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <EventAttendancePage />
                </ProtectedRoute>
              }
            />

            {/* Club Head Routes */}
            <Route
              path="/clubhead"
              element={
                <ProtectedRoute allowedRoles={['clubHead']}>
                  <ClubHeadDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clubhead/events"
              element={
                <ProtectedRoute allowedRoles={['clubHead']}>
                  <ClubHeadDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clubhead/members"
              element={
                <ProtectedRoute allowedRoles={['clubHead']}>
                  <ClubHeadDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clubhead/attendance/:eventId"
              element={
                <ProtectedRoute allowedRoles={['clubHead']}>
                  <EventAttendancePage />
                </ProtectedRoute>
              }
            />

            {/* Student Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/clubs"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <JoinClubs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/events"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <BrowseEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/scan"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <QRScannerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/certificates"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <CertificatesPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
