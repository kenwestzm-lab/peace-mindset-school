import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import toast from 'react-hot-toast';

const parentNav = [
  { key:'dashboard', path:'/parent', icon:'⊞', label:'dashboard', exact:true },
  { key:'children', path:'/parent/children', icon:'🧒', label:'children' },
  { key:'payments', path:'/parent/payments', icon:'💳', label:'payments' },
  { key:'results', path:'/parent/results', icon:'📋', label:'results' },
  { key:'announcements', path:'/parent/announcements', icon:'📢', label:'announcements' },
  { key:'events', path:'/parent/events', icon:'🗓️', label:'events' },
  { key:'chat', path:'/parent/chat', icon:'💬', label:'chat' },
  { key:'profile', path:'/parent/profile', icon:'👤', label:'profile' },
];
const adminNav = [
  { key:'dashboard', path:'/admin', icon:'⊞', label:'adminDashboard', exact:true },
  { key:'children', path:'/admin/children', icon:'🧒', label:'manageChildren' },
  { key:'payments', path:'/admin/payments', icon:'💳', label:'managePayments' },
  { key:'calendar', path:'/admin/calendar', icon:'📅', label:'schoolCalendar' },
  { key:'announcements', path:'/admin/announcements', icon:'📢', label:'announcements' },
  { key:'events', path:'/admin/events', icon:'🗓️', label:'events' },
  { key:'chat', path:'/admin/chat', icon:'💬', label:'chat' },
  { key:'parents', path:'/admin/parents', icon:'👪', label:'manageParents' },
  { key:'settings', path:'/admin/settings', icon:'⚙️', label:'systemSettings' },
];
const devNav = [
  { key:'dashboard', path:'/developer', icon:'⊞', label:'developerDashboard', exact:true },
  { key:'earnings', path:'/developer/earnings', icon:'💰', label:'earningsLedger' },
  { key:'withdrawals', path:'/developer/withdrawals', icon:'💸', label:'withdrawalHistory' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout, unreadMessages } = useStore();
  const { t } = useT();
  const navigate = useNavigate();

  const navItems = user?.role==='admin' ? adminNav : user?.role==='developer' ? devNav : parentNav;

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const roleLabel = user?.role==='admin' ? 'Administrator' : user?.role==='developer' ? 'Developer' : 'Parent';
  const roleColor = user?.role==='admin' ? 'var(--gold)' : user?.role==='developer' ? 'var(--blue)' : 'var(--green)';

  return (
    <>
      {mobileOpen && (
        <div onClick={onClose} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
          backdropFilter:'blur(4px)', zIndex:199, display:'none',
        }} className="mobile-overlay" />
      )}

      <aside className={`sidebar${mobileOpen?' open':''}`} style={{
        width:'var(--sidebar-width)', position:'fixed', top:0, left:0,
        height:'100vh', background:'var(--bg-card)',
        borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column', zIndex:200,
        boxShadow:'4px 0 40px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:42, height:42, borderRadius:12, overflow:'hidden',
              border:'1.5px solid var(--border-bright)', flexShrink:0,
              background:'var(--bg-elevated)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <img src="/logo.webp" alt="Logo"
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                onError={e=>{ e.target.style.display='none'; e.target.parentNode.innerHTML='🕊️'; e.target.parentNode.style.fontSize='20px'; }}
              />
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:13.5, fontWeight:700, color:'var(--text)', lineHeight:1.2 }}>
                Peace Mindset
              </div>
              <div style={{ fontFamily:'var(--font-title)', fontSize:8.5, letterSpacing:'0.15em', color:'var(--gold)', opacity:0.8, marginTop:2, textTransform:'uppercase' }}>
                Private School
              </div>
            </div>
          </div>
        </div>

        {/* User */}
        <div style={{ padding:'12px 14px 10px' }}>
          <div style={{
            background:'var(--bg-elevated)', border:'1px solid var(--border)',
            borderRadius:12, padding:'11px 13px',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <div style={{
              width:36, height:36, borderRadius:'50%',
              background:`linear-gradient(135deg, var(--maroon), var(--maroon-light))`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:14, fontWeight:700, color:'#fff', flexShrink:0,
              boxShadow:'0 0 12px var(--maroon-glow)',
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize:10, fontWeight:700, color:roleColor, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:1 }}>
                {roleLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Nav label */}
        <div style={{ padding:'6px 20px 2px' }}>
          <span style={{ fontSize:9.5, fontWeight:700, color:'var(--border-bright)', textTransform:'uppercase', letterSpacing:'0.12em' }}>Menu</span>
        </div>

        {/* Navigation */}
        <nav style={{ flex:1, overflowY:'auto', padding:'4px 10px' }}>
          {navItems.map(item => (
            <NavLink key={item.key} to={item.path} end={item.exact} onClick={onClose}
              style={({isActive}) => ({
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 12px', borderRadius:10, marginBottom:2,
                background: isActive ? `linear-gradient(135deg, var(--maroon-pale), transparent)` : 'transparent',
                border: isActive ? '1px solid rgba(155,24,38,0.3)' : '1px solid transparent',
                color: isActive ? 'var(--gold-light)' : 'var(--text-muted)',
                fontSize:13.5, fontWeight: isActive ? 600 : 400,
                transition:'all 0.15s', textDecoration:'none',
                boxShadow: isActive ? 'inset 2px 0 0 var(--maroon-light)' : 'none',
              })}
              onMouseEnter={e=>{
                if(!e.currentTarget.style.background.includes('gradient(135deg, var(--maroon')) {
                  e.currentTarget.style.background='var(--bg-elevated)';
                  e.currentTarget.style.color='var(--text)';
                }
              }}
              onMouseLeave={e=>{
                if(!e.currentTarget.style.background.includes('gradient(135deg, var(--maroon')) {
                  e.currentTarget.style.background='transparent';
                  e.currentTarget.style.color='var(--text-muted)';
                }
              }}
            >
              <span style={{ fontSize:16 }}>{item.icon}</span>
              <span style={{ flex:1 }}>{t(item.label)}</span>
              {item.key==='chat' && unreadMessages>0 && (
                <span style={{
                  background:'var(--red)', color:'#fff', borderRadius:999,
                  fontSize:10, fontWeight:700, padding:'2px 6px', minWidth:18, textAlign:'center',
                }}>{unreadMessages}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding:'10px 10px 16px', borderTop:'1px solid var(--border)' }}>
          <button onClick={handleLogout} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10,
            padding:'9px 13px', borderRadius:10,
            background:'var(--red-bg)', border:'1px solid var(--red-border)',
            color:'var(--red)', cursor:'pointer', fontSize:13.5, fontWeight:500,
            transition:'all 0.15s',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.background='var(--red)'; e.currentTarget.style.color='#fff'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background='var(--red-bg)'; e.currentTarget.style.color='var(--red)'; }}
          >
            <span>⏏️</span>
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) { .mobile-overlay { display: block !important; } }
      `}</style>
    </>
  );
}
