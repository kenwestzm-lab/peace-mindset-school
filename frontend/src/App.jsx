import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { initPushNotifications, subscribeToPush } from './utils/push';
import './styles/globals.css';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AppLayout from './components/layout/AppLayout';
import ParentDashboard from './pages/parent/Dashboard';
import ParentChildren from './pages/parent/Children';
import ParentPayments from './pages/parent/Payments';
import ParentResults from './pages/parent/Results';
import ParentAnnouncements from './pages/parent/Announcements';
import ParentEvents from './pages/parent/Events';
import ParentChat from './pages/parent/Chat';
import ParentStories from './pages/parent/Stories';
import ParentProfile from './pages/parent/Profile';
import AdminSlideshow from './pages/admin/Slideshow';
import AdminDashboard from './pages/admin/Dashboard';
import AdminChildren from './pages/admin/Children';
import AdminPayments from './pages/admin/Payments';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminEvents from './pages/admin/Events';
import AdminStoriesPage from './pages/admin/Stories';
import AdminChat from './pages/admin/Chat';
import AdminParents from './pages/admin/Parents';
import ProfileSettings from './pages/ProfileSettings';
import AdminResults from './pages/admin/Results';
import AdminSettings from './pages/admin/Settings';
import AdminCalendar from './pages/admin/Calendar';
import DeveloperDashboard from './pages/developer/Dashboard';
import DeveloperEarnings from './pages/developer/Earnings';
import DeveloperWithdrawals from './pages/developer/Withdrawals';

// Request notification permission on app start
if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useStore();

  // Network status monitor
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  // PWA update notification
  useEffect(() => {
    window.__showUpdateToast = () => {
      if (window.__updateToastShown) return;
      window.__updateToastShown = true;
      const div = document.createElement('div');
      const inner = document.createElement('div');
      inner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1F2C34;border:1px solid #D4AF37;border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:12px;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.4);min-width:280px';
      inner.innerHTML = '<span style="font-size:20px">🔄</span><div style="flex:1;color:#E9EDEF;font-size:14px;font-weight:500">New update available!</div>';
      const btn = document.createElement('button');
      btn.textContent = 'Update';
      btn.style.cssText = 'padding:8px 14px;background:#9B1826;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:600;cursor:pointer';
      btn.onclick = () => navigator.serviceWorker.getRegistration().then(r => r && r.waiting && r.waiting.postMessage('SKIP_WAITING'));
      inner.appendChild(btn);
      div.appendChild(inner);
      document.body.appendChild(div);
      setTimeout(() => div.remove(), 30000);
    };
  }, []);



  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

const RoleRedirect = () => {
  const { user } = useStore();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'developer') return <Navigate to="/developer" replace />;
  return <Navigate to="/parent" replace />;
};

export default function App() {
  const { user, setUser, fetchMe, isAuthenticated } = useStore();

  useEffect(() => {
    if (user) {
      import('./utils/api').then(({ default: api }) => {
        api.get('/profile/me').then(r => {
          if (r.data.user && r.data.user.profilePic) {
            setUser({ ...user, ...r.data.user });
          }
        }).catch(() => {});
      });
    }
  }, [user?._id]);

  useEffect(() => { fetchMe(); initPushNotifications(); }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      const t = setTimeout(() => subscribeToPush().catch(() => {}), 3000);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, user]);

  return (
    <BrowserRouter>

      {/* Offline banner */}
      {showOfflineBanner && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, zIndex:99998,
          background:'#E53935', color:'#fff',
          padding:'8px 16px', textAlign:'center',
          fontSize:13, fontWeight:600,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8
        }}>
          <span>📵</span>
          <span>You're offline — messages will send when connected</span>
        </div>
      )}
      {isOnline && !showOfflineBanner && navigator.onLine === true && (
        <div id="back-online" style={{
          position:'fixed', top:0, left:0, right:0, zIndex:99998,
          background:'#25D366', color:'#fff',
          padding:'8px 16px', textAlign:'center',
          fontSize:13, fontWeight:600,
          animation:'slideDown 0.3s ease',
          display:'none'
        }}>
          <span>✅ Back online!</span>
        </div>
      )}
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1C1C1C', color: '#fff', borderRadius: '10px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }, success: { iconTheme: { primary: '#1A7A4A', secondary: '#fff' } }, error: { iconTheme: { primary: '#C0392B', secondary: '#fff' } } }} />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <RoleRedirect /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <RoleRedirect /> : <RegisterPage />} />
        <Route path="/" element={isAuthenticated ? <RoleRedirect /> : <Navigate to="/login" />} />

        <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><AppLayout /></ProtectedRoute>}>
          <Route index element={<ParentDashboard />} />
          <Route path="children" element={<ParentChildren />} />
          <Route path="payments" element={<ParentPayments />} />
          <Route path="results" element={<ParentResults />} />
          <Route path="announcements" element={<ParentAnnouncements />} />
          <Route path="events" element={<ParentEvents />} />
          <Route path="chat" element={<ParentChat />} />
          <Route path="stories" element={<ParentStories />} />
          <Route path="profile" element={<ProfileSettings />} />
        </Route>

        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="children" element={<AdminChildren />} />
          <Route path="results" element={<AdminResults />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="chat" element={<AdminChat />} />
          <Route path="parents" element={<AdminParents />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="stories" element={<AdminStoriesPage />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="slideshow" element={<AdminSlideshow />} />
        </Route>

        <Route path="/developer" element={<ProtectedRoute allowedRoles={['developer']}><AppLayout /></ProtectedRoute>}>
          <Route index element={<DeveloperDashboard />} />
          <Route path="earnings" element={<DeveloperEarnings />} />
          <Route path="withdrawals" element={<DeveloperWithdrawals />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
