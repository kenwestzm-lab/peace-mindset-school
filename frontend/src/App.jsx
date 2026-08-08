import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { initPushNotifications, subscribeToPush } from './utils/push';
import './styles/globals.css';


// Auth pages - load immediately
const LoginPage    = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));

// Layout - load immediately
const AppLayout = lazy(() => import('./components/layout/AppLayout'));

// Parent pages - lazy loaded
const ParentDashboard     = lazy(() => import('./pages/parent/Dashboard'));
const ParentChildren      = lazy(() => import('./pages/parent/Children'));
const ParentPayments      = lazy(() => import('./pages/parent/Payments'));
const ParentResults       = lazy(() => import('./pages/parent/Results'));
const ParentAnnouncements = lazy(() => import('./pages/parent/Announcements'));
const ParentEvents        = lazy(() => import('./pages/parent/Events'));
const ParentChat          = lazy(() => import('./pages/parent/Chat'));
const ParentStories       = lazy(() => import('./pages/parent/Stories'));
const ParentProfile       = lazy(() => import('./pages/parent/Profile'));

// Admin pages - lazy loaded
const AdminSlideshow      = lazy(() => import('./pages/admin/Slideshow'));
const AdminDashboard      = lazy(() => import('./pages/admin/Dashboard'));
const AdminChildren       = lazy(() => import('./pages/admin/Children'));
const AdminPayments       = lazy(() => import('./pages/admin/Payments'));
const AdminAnnouncements  = lazy(() => import('./pages/admin/Announcements'));
const AdminEvents         = lazy(() => import('./pages/admin/Events'));
const AdminStoriesPage    = lazy(() => import('./pages/admin/Stories'));
const AdminChat           = lazy(() => import('./pages/admin/Chat'));
const AdminParents        = lazy(() => import('./pages/admin/Parents'));
const AdminResults        = lazy(() => import('./pages/admin/Results'));
const AdminSettings       = lazy(() => import('./pages/admin/Settings'));
const AdminCalendar       = lazy(() => import('./pages/admin/Calendar'));
const AdminDisbursements  = lazy(() => import('./pages/admin/Disbursements'));

// Developer pages - lazy loaded
const DeveloperDashboard   = lazy(() => import('./pages/developer/Dashboard'));
const DeveloperEarnings    = lazy(() => import('./pages/developer/Earnings'));
const DeveloperWithdrawals = lazy(() => import('./pages/developer/Withdrawals'));

// Shared pages
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));

// Loading spinner for Suspense fallback
const PageLoader = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
    <div style={{ textAlign:'center' }}>
      <div style={{ width:40, height:40, border:'3px solid var(--border)', borderTop:'3px solid var(--maroon)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
      <div style={{ fontSize:13, color:'var(--text-muted)' }}>Loading...</div>
    </div>
  </div>
);

// Request notification permission on app start
if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useStore();


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
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
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
      <Suspense fallback={<PageLoader />}>

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
      </Suspense>
    </BrowserRouter>
  );
}
