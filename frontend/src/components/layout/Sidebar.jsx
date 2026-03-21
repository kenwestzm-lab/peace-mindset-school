import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import toast from 'react-hot-toast';

const icons = {
  dashboard: '⊞', children: '👦', payments: '💳', results: '📋',
  announcements: '📢', events: '🗓️', chat: '💬', profile: '👤',
  settings: '⚙️', parents: '👪', earnings: '💰', withdrawals: '💸',
  logout: '⏏',
};

const parentNav = [
  { key: 'dashboard', path: '/parent', label: 'dashboard', exact: true },
  { key: 'children', path: '/parent/children', label: 'children' },
  { key: 'payments', path: '/parent/payments', label: 'payments' },
  { key: 'results', path: '/parent/results', label: 'results' },
  { key: 'announcements', path: '/parent/announcements', label: 'announcements' },
  { key: 'events', path: '/parent/events', label: 'events' },
  { key: 'chat', path: '/parent/chat', label: 'chat' },
  { key: 'profile', path: '/parent/profile', label: 'profile' },
];

const adminNav = [
  { key: 'dashboard', path: '/admin', label: 'adminDashboard', exact: true },
  { key: 'children', path: '/admin/children', label: 'manageChildren' },
  { key: 'payments', path: '/admin/payments', label: 'managePayments' },
  { key: 'announcements', path: '/admin/announcements', label: 'announcements' },
  { key: 'events', path: '/admin/events', label: 'events' },
  { key: 'chat', path: '/admin/chat', label: 'chat' },
  { key: 'parents', path: '/admin/parents', label: 'manageParents' },
  { key: 'settings', path: '/admin/settings', label: 'systemSettings' },
];

const devNav = [
  { key: 'dashboard', path: '/developer', label: 'developerDashboard', exact: true },
  { key: 'earnings', path: '/developer/earnings', label: 'earningsLedger' },
  { key: 'withdrawals', path: '/developer/withdrawals', label: 'withdrawalHistory' },
];

const roleConfig = {
  admin: { label: 'Administrator', color: '#D4A843', bg: 'rgba(212,168,67,0.15)' },
  developer: { label: 'Developer', color: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },
  parent: { label: 'Parent', color: '#86EFAC', bg: 'rgba(134,239,172,0.15)' },
};

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout, unreadMessages } = useStore();
  const { t } = useT();
  const navigate = useNavigate();

  const navItems = user?.role === 'admin' ? adminNav : user?.role === 'developer' ? devNav : parentNav;
  const role = roleConfig[user?.role] || roleConfig.parent;

  const handleLogout = () => {
    logout();
    toast.success(t('logoutSuccess'));
    navigate('/login');
  };

  return (
    <>
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(2px)',
            zIndex: 199, display: 'none',
          }}
          className="mobile-overlay"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar${mobileOpen ? ' open' : ''}`}
        style={{
          width: 'var(--sidebar-width)',
          position: 'fixed', top: 0, left: 0,
          height: '100vh',
          background: 'var(--maroon-dark)',
          display: 'flex', flexDirection: 'column',
          zIndex: 200,
          boxShadow: '4px 0 30px rgba(0,0,0,0.25)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Brand header */}
        <div style={{
          padding: '22px 20px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              overflow: 'hidden',
              border: '1.5px solid rgba(255,255,255,0.2)',
              flexShrink: 0,
              background: 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img
                src="/logo.webp"
                alt="Logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '🕊️'; e.target.parentNode.style.fontSize = '22px'; }}
              />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14, fontWeight: 700,
                color: '#FFFFFF', lineHeight: 1.2,
              }}>
                Peace Mindset
              </div>
              <div style={{
                fontFamily: 'var(--font-title)',
                fontSize: 9, letterSpacing: '0.15em',
                color: 'var(--gold-light)', marginTop: 3,
                textTransform: 'uppercase', opacity: 0.85,
              }}>
                Private School
              </div>
            </div>
          </div>
        </div>

        {/* User card */}
        <div style={{ padding: '14px 14px 10px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 11,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-bright) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, color: 'var(--maroon-dark)',
              flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: '#FFFFFF',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.name}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                marginTop: 3, padding: '2px 8px',
                background: role.bg, borderRadius: 999,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: role.color,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                  {role.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav label */}
        <div style={{ padding: '8px 20px 4px' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            Navigation
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.exact}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '9px 13px', borderRadius: 10,
                marginBottom: 2,
                background: isActive
                  ? 'linear-gradient(135deg, rgba(201,168,76,0.22), rgba(201,168,76,0.12))'
                  : 'transparent',
                border: isActive ? '1px solid rgba(212,168,67,0.25)' : '1px solid transparent',
                color: isActive ? 'var(--gold-light)' : 'rgba(255,255,255,0.65)',
                fontSize: 13.5, fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s ease',
                textDecoration: 'none',
                position: 'relative',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.style.background.includes('gradient(')) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.style.background.includes('gradient(')) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.65)';
                }
              }}
            >
              <span style={{ fontSize: 16, opacity: 0.9 }}>{icons[item.key]}</span>
              <span style={{ flex: 1 }}>{t(item.label)}</span>
              {item.key === 'chat' && unreadMessages > 0 && (
                <span style={{
                  background: '#E53E3E', color: 'white',
                  borderRadius: '999px', fontSize: 10.5, fontWeight: 700,
                  padding: '2px 7px', minWidth: 20, textAlign: 'center',
                }}>
                  {unreadMessages}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '10px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 11,
              padding: '9px 14px', borderRadius: 10,
              background: 'rgba(176,48,32,0.15)',
              border: '1px solid rgba(176,48,32,0.25)',
              color: '#FC8181', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(176,48,32,0.28)';
              e.currentTarget.style.color = '#FEB2B2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(176,48,32,0.15)';
              e.currentTarget.style.color = '#FC8181';
            }}
          >
            <span>⏏️</span>
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .mobile-overlay { display: block !important; }
        }
      `}</style>
    </>
  );
}
