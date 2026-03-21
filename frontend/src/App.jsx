import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import './styles/globals.css';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Layouts
import AppLayout from './components/layout/AppLayout';

// Parent pages
import ParentDashboard from './pages/parent/Dashboard';
import ParentChildren from './pages/parent/Children';
import ParentPayments from './pages/parent/Payments';
import ParentResults from './pages/parent/Results';
import ParentAnnouncements from './pages/parent/Announcements';
import ParentEvents from './pages/parent/Events';
import ParentChat from './pages/parent/Chat';
import ParentProfile from './pages/parent/Profile';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminChildren from './pages/admin/Children';
import AdminPayments from './pages/admin/Payments';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminEvents from './pages/admin/Events';
import AdminChat from './pages/admin/Chat';
import AdminParents from './pages/admin/Parents';
import AdminSettings from './pages/admin/Settings';
import AdminCalendar from './pages/admin/Calendar';

// Developer pages
import DeveloperDashboard from './pages/developer/Dashboard';
import DeveloperEarnings from './pages/developer/Earnings';
import DeveloperWithdrawals from './pages/developer/Withdrawals';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const RoleRedirect = () => {
  const { user } = useStore();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'developer') return <Navigate to="/developer" replace />;
  return <Navigate to="/parent" replace />;
};

export default function App() {
  const { fetchMe, isAuthenticated } = useStore();

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1C1C1C',
            color: '#fff',
            borderRadius: '10px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#1A7A4A', secondary: '#fff' } },
          error: { iconTheme: { primary: '#C0392B', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={isAuthenticated ? <RoleRedirect /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <RoleRedirect /> : <RegisterPage />} />

        {/* Root redirect */}
        <Route path="/" element={isAuthenticated ? <RoleRedirect /> : <Navigate to="/login" />} />

        {/* Parent routes */}
        <Route path="/parent" element={
          <ProtectedRoute allowedRoles={['parent']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<ParentDashboard />} />
          <Route path="children" element={<ParentChildren />} />
          <Route path="payments" element={<ParentPayments />} />
          <Route path="results" element={<ParentResults />} />
          <Route path="announcements" element={<ParentAnnouncements />} />
          <Route path="events" element={<ParentEvents />} />
          <Route path="chat" element={<ParentChat />} />
          <Route path="profile" element={<ParentProfile />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="children" element={<AdminChildren />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="chat" element={<AdminChat />} />
          <Route path="parents" element={<AdminParents />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="calendar" element={<AdminCalendar />} />
        </Route>

        {/* Developer routes */}
        <Route path="/developer" element={
          <ProtectedRoute allowedRoles={['developer']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index element={<DeveloperDashboard />} />
          <Route path="earnings" element={<DeveloperEarnings />} />
          <Route path="withdrawals" element={<DeveloperWithdrawals />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
