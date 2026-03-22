import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import toast from 'react-hot-toast';

const parentNav = [
  { key:'dashboard', path:'/parent', icon:'🏠', label:'dashboard', exact:true },
  { key:'children', path:'/parent/children', icon:'🧒', label:'children' },
  { key:'payments', path:'/parent/payments', icon:'💳', label:'payments' },
  { key:'results', path:'/parent/results', icon:'📋', label:'results' },
  { key:'announcements', path:'/parent/announcements', icon:'📢', label:'announcements' },
  { key:'events', path:'/parent/events', icon:'🗓️', label:'events' },
  { key:'chat', path:'/parent/chat', icon:'💬', label:'chat' },
  { key:'stories', path:'/parent/stories', icon:'📖', label:'stories' },
  { key:'profile', path:'/parent/profile', icon:'👤', label:'profile' },
];
const adminNav = [
  { key:'dashboard', path:'/admin', icon:'🏠', label:'adminDashboard', exact:true },
  { key:'children', path:'/admin/children', icon:'🧒', label:'manageChildren' },
  { key:'payments', path:'/admin/payments', icon:'💳', label:'managePayments' },
  { key:'calendar', path:'/admin/calendar', icon:'📅', label:'schoolCalendar' },
  { key:'announcements', path:'/admin/announcements', icon:'📢', label:'announcements' },
  { key:'events', path:'/admin/events', icon:'🗓️', label:'events' },
  { key:'chat', path:'/admin/chat', icon:'💬', label:'chat' },
  { key:'parents', path:'/admin/parents', icon:'👪', label:'manageParents' },
  { key:'stories', path:'/admin/stories', icon:'📖', label:'stories' },
  { key:'profile', path:'/admin/profile', icon:'👤', label:'profile' },
  { key:'settings', path:'/admin/settings', icon:'⚙️', label:'systemSettings' },
];
const devNav = [
  { key:'dashboard', path:'/developer', icon:'🏠', label:'developerDashboard', exact:true },
  { key:'earnings', path:'/developer/earnings', icon:'💰', label:'earningsLedger' },
  { key:'withdrawals', path:'/developer/withdrawals', icon:'💸', label:'withdrawalHistory' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout, unreadMessages } = useStore();
  const navigate = useNavigate();

  // Fallback t() if hook not available
  let t = (key) => key;
  try { const hook = useT(); t = hook.t; } catch {}

  const navItems = user?.role === 'admin' ? adminNav : user?.role === 'developer' ? devNav : parentNav;
  const roleLabel = user?.role === 'admin' ? 'Administrator' : user?.role === 'developer' ? 'Developer' : 'Parent';
  const roleColor = user?.role === 'admin' ? '#D4A843' : user?.role === 'developer' ? '#60A5FA' : '#4ADE80';

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
    onClose?.();
  };

  return (
    <>
      {mobileOpen && (
        <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(3px)', zIndex:199 }} />
      )}

      <aside className={`sidebar${mobileOpen?' open':''}`} style={{
        width:'var(--sidebar-width)', position:'fixed', top:0, left:0, height:'100vh',
        background:'#0F0F1A', borderRight:'1px solid rgba(255,255,255,0.06)',
        display:'flex', flexDirection:'column', zIndex:200,
        boxShadow:'4px 0 30px rgba(0,0,0,0.6)', overflowY:'auto',
      }}>
        {/* Logo */}
        <div style={{ padding:'18px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:11 }}>
            <div style={{ width:40, height:40, borderRadius:10, overflow:'hidden', border:'1.5px solid rgba(255,255,255,0.12)', flexShrink:0, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src="/logo.webp" alt="Logo" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{ e.target.style.display='none'; e.target.parentNode.textContent='🕊️'; }} />
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#FFFFFF', lineHeight:1.2 }}>Peace Mindset</div>
              <div style={{ fontSize:8.5, letterSpacing:'0.14em', color:'rgba(212,168,67,0.8)', marginTop:2, textTransform:'uppercase', fontFamily:'var(--font-title)' }}>Private School</div>
            </div>
          </div>
        </div>

        {/* User card */}
        <div style={{ padding:'11px 12px 8px', flexShrink:0 }}>
          <NavLink to={user?.role === 'parent' ? '/parent/profile' : '#'} style={{ textDecoration:'none' }} onClick={onClose}>
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:11, padding:'10px 12px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', transition:'background 0.15s' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, overflow:'hidden', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', boxShadow:'0 0 10px rgba(155,24,38,0.4)' }}>
                {user?.profilePic
                  ? <img src={user.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={e=>e.target.style.display='none'}/>
                  : user?.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:600, color:'#FFFFFF', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</div>
                <div style={{ fontSize:9.5, fontWeight:700, color:roleColor, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:1 }}>{roleLabel}</div>
              </div>
              {user?.role === 'parent' && <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>✏</span>}
            </div>
          </NavLink>
        </div>

        {/* Nav label */}
        <div style={{ padding:'6px 18px 2px', flexShrink:0 }}>
          <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.2)', textTransform:'uppercase', letterSpacing:'0.12em' }}>Navigation</span>
        </div>

        {/* Navigation */}
        <nav style={{ flex:1, padding:'2px 8px 8px', overflowY:'auto' }}>
          {navItems.map(item => (
            <NavLink key={item.key} to={item.path} end={item.exact} onClick={onClose}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 11px', borderRadius:9, marginBottom:1,
                background: isActive ? 'linear-gradient(135deg,rgba(155,24,38,0.35),rgba(155,24,38,0.15))' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(155,24,38,0.4)' : 'transparent'}`,
                color: isActive ? '#F0C86A' : 'rgba(255,255,255,0.55)',
                fontSize:13, fontWeight: isActive ? 600 : 400,
                transition:'all 0.14s', textDecoration:'none',
                boxShadow: isActive ? 'inset 2px 0 0 #C02035' : 'none',
              })}
            >
              <span style={{ fontSize:16, width:20, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
              <span style={{ flex:1 }}>
                {item.key === 'stories' ? 'Stories' :
                 item.key === 'profile' ? 'Profile' :
                 item.key === 'chat' ? 'Chat' :
                 t(item.label)}
              </span>
              {item.key === 'chat' && unreadMessages > 0 && (
                <span style={{ background:'#EF4444', color:'#fff', borderRadius:999, fontSize:10, fontWeight:700, padding:'1px 6px', minWidth:18, textAlign:'center', flexShrink:0 }}>
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── LOGOUT BUTTON — Always visible at bottom ── */}
        <div style={{ padding:'10px 8px 20px', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
          <button
            onClick={handleLogout}
            style={{
              width:'100%', display:'flex', alignItems:'center', gap:10,
              padding:'12px 14px', borderRadius:11,
              background:'rgba(239,68,68,0.1)',
              border:'1px solid rgba(239,68,68,0.25)',
              color:'#FC8181', cursor:'pointer',
              fontSize:14, fontWeight:600,
              transition:'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.2)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.5)'; e.currentTarget.style.color='#FCA5A5'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.25)'; e.currentTarget.style.color='#FC8181'; }}
          >
            <span style={{ fontSize:18 }}>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
