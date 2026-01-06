import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard';
import Grants from './pages/Grants';
import Disbursements from './pages/Disbursements';
import GrantSources from './pages/GrantSources';
import GrantYears from './pages/GrantYears';
import Team from './pages/Team';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grants"
            element={
              <ProtectedRoute>
                <Layout>
                  <Grants />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/disbursements"
            element={
              <ProtectedRoute>
                <Layout>
                  <Disbursements />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grant-sources"
            element={
              <ProtectedRoute>
                <Layout>
                  <GrantSources />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/grant-years"
            element={
              <ProtectedRoute>
                <Layout>
                  <SuperAdminGuard>
                    <GrantYears />
                  </SuperAdminGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <Layout>
                  <SuperAdminGuard>
                    <Team />
                  </SuperAdminGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}


function SuperAdminGuard({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) return null;

  if (profile?.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default App;
