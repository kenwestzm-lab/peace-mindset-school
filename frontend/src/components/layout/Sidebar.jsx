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
  { key:'settings', path:'/admin/settings', icon:'⚙️', label:'systemSettings' },
];
const devNav = [
  { key:'dashboard', path:'/developer', icon:'🏠', label:'developerDashboard', exact:true },
  { key:'earnings', path:'/developer/earnings', icon:'💰', label:'earningsLedger' },
  { key:'withdrawals', path:'/developer/withdrawals', icon:'💸', label:'withdrawalHistory' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout, unreadMessages } = useStore();
  const { t } = useT();
  const navigate = useNavigate();

  const navItems = user?.role==='admin' ? adminNav : user?.role==='developer' ? devNav : parentNav;
  const roleLabel = user?.role==='admin' ? 'Administrator' : user?.role==='developer' ? 'Developer' : 'Parent';
  const roleColor = user?.role==='admin' ? '#D4A843' : user?.role==='developer' ? '#60A5FA' : '#4ADE80';

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
    onClose?.();
  };

  return (
    <>
      {mobileOpen && (
        <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', backdropFilter:'blur(3px)', zIndex:199 }} />
      )}

      <aside className={`sidebar${mobileOpen?' open':''}`} style={{
        width:'var(--sidebar-width)', position:'fixed', top:0, left:0,
        height:'100vh', background:'#0F0F1A',
        borderRight:'1px solid rgba(255,255,255,0.05)',
        display:'flex', flexDirection:'column', zIndex:200,
        boxShadow:'4px 0 30px rgba(0,0,0,0.6)',
      }}>
        {/* Logo */}
        <div style={{ padding:'18px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:11 }}>
            <div style={{ width:40, height:40, borderRadius:11, overflow:'hidden', border:'1.5px solid rgba(255,255,255,0.1)', flexShrink:0, background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src="/logo.webp" alt="Logo" style={{ width:'100%', height:'100%', objectFit:'cover' }}
                onError={e=>{ e.target.style.display='none'; e.target.parentNode.innerHTML='🕊️'; e.target.parentNode.style.fontSize='20px'; }} />
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:13.5, fontWeight:700, color:'#FFFFFF', lineHeight:1.2 }}>Peace Mindset</div>
              <div style={{ fontSize:8.5, letterSpacing:'0.15em', color:'rgba(212,168,67,0.8)', marginTop:2, textTransform:'uppercase' }}>Private School</div>
            </div>
          </div>
        </div>

        {/* User card */}
        <div style={{ padding:'11px 12px 8px', flexShrink:0 }}>
          <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:11, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', boxShadow:'0 0 10px rgba(155,24,38,0.35)' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12.5, fontWeight:600, color:'#FFFFFF', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize:9.5, fontWeight:700, color:roleColor, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:1 }}>{roleLabel}</div>
            </div>
          </div>
        </div>

        {/* Nav label */}
        <div style={{ padding:'5px 18px 2px', flexShrink:0 }}>
          <span style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.18)', textTransform:'uppercase', letterSpacing:'0.12em' }}>Menu</span>
        </div>

        {/* Navigation - scrollable */}
        <nav style={{ flex:1, padding:'2px 8px 4px', overflowY:'auto', minHeight:0 }}>
          {navItems.map(item => (
            <NavLink key={item.key} to={item.path} end={item.exact} onClick={onClose}
              style={({isActive}) => ({
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 11px', borderRadius:9, marginBottom:1,
                background: isActive ? 'linear-gradient(135deg, rgba(155,24,38,0.3), rgba(155,24,38,0.12))' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(155,24,38,0.35)' : 'transparent'}`,
                color: isActive ? '#F0C86A' : 'rgba(255,255,255,0.5)',
                fontSize:13, fontWeight: isActive ? 600 : 400,
                transition:'all 0.13s', textDecoration:'none',
                boxShadow: isActive ? 'inset 2px 0 0 #C02035' : 'none',
              })}
              onMouseEnter={e=>{ if(!e.currentTarget.style.background.includes('rgba(155,24,38')) { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='rgba(255,255,255,0.85)'; } }}
              onMouseLeave={e=>{ if(!e.currentTarget.style.background.includes('rgba(155,24,38')) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.5)'; } }}
            >
              <span style={{ fontSize:16, width:20, textAlign:'center', flexShrink:0 }}>{item.icon}</span>
              <span style={{ flex:1 }}>{t(item.label)}</span>
              {item.key==='chat' && unreadMessages>0 && (
                <span style={{ background:'#25D366', color:'#000', borderRadius:999, fontSize:10, fontWeight:700, padding:'2px 6px', minWidth:18, textAlign:'center', flexShrink:0 }}>{unreadMessages}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* LOGOUT — Always visible, never hidden */}
        <div style={{ padding:'10px 8px 20px', borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0, background:'#0F0F1A' }}>
          <button
            onClick={handleLogout}
            style={{
              width:'100%', display:'flex', alignItems:'center', gap:10,
              padding:'12px 14px', borderRadius:11,
              background:'rgba(239,68,68,0.08)',
              border:'1.5px solid rgba(239,68,68,0.22)',
              color:'#FC8181', cursor:'pointer',
              fontSize:14, fontWeight:700,
              transition:'all 0.15s', letterSpacing:'0.01em',
            }}
            onMouseEnter={e=>{ e.currentTarget.style.background='rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.45)'; e.currentTarget.style.color='#FCA5A5'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background='rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor='rgba(239,68,68,0.22)'; e.currentTarget.style.color='#FC8181'; }}
          >
            <span style={{ fontSize:18 }}>🚪</span>
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
