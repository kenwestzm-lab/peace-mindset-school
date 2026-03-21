import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';

export default function Header({ onMenuToggle }) {
  const { user, setLanguage, language } = useStore();
  const { t } = useT();

  const hour = new Date().getHours();
  const greeting = hour<12 ? t('goodMorning') : hour<17 ? t('goodAfternoon') : t('goodEvening');
  const today = new Date().toLocaleDateString(language==='fr'?'fr-FR':'en-GB', {
    weekday:'long', day:'numeric', month:'long', year:'numeric',
  });

  const roleColor = user?.role==='admin' ? 'var(--gold)' : user?.role==='developer' ? 'var(--blue)' : 'var(--green)';
  const roleBg = user?.role==='admin' ? 'var(--gold-pale)' : user?.role==='developer' ? 'var(--blue-bg)' : 'var(--green-bg)';
  const roleBorder = user?.role==='admin' ? 'rgba(212,168,67,0.3)' : user?.role==='developer' ? 'var(--blue-border)' : 'var(--green-border)';
  const roleLabel = user?.role==='admin' ? 'Administrator' : user?.role==='developer' ? 'Developer' : 'Parent';

  return (
    <header style={{
      position:'fixed', top:0, left:'var(--sidebar-width)', right:0,
      height:'var(--header-height)',
      background:'rgba(13,13,20,0.92)',
      backdropFilter:'blur(20px)',
      borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center',
      padding:'0 24px 0 20px',
      zIndex:100, gap:14,
      boxShadow:'0 2px 20px rgba(0,0,0,0.4)',
    }}>
      {/* Mobile hamburger */}
      <button onClick={onMenuToggle} className="mobile-menu-btn" style={{
        display:'none', background:'var(--bg-elevated)', border:'1px solid var(--border)',
        fontSize:16, cursor:'pointer', color:'var(--text-muted)',
        padding:'7px 11px', borderRadius:8, flexShrink:0, transition:'all 0.15s',
      }}
      onMouseEnter={e=>{ e.currentTarget.style.background='var(--bg-hover)'; e.currentTarget.style.color='var(--text)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.background='var(--bg-elevated)'; e.currentTarget.style.color='var(--text-muted)'; }}
      >☰</button>

      {/* Greeting */}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14.5, fontWeight:600, color:'var(--text)', lineHeight:1.3 }}>
          {greeting},{' '}
          <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontStyle:'italic', color:'var(--gold)' }}>
            {user?.name?.split(' ')[0]}
          </span>
        </div>
        <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:1 }}>{today}</div>
      </div>

      {/* Role badge */}
      <div className="hide-mobile" style={{
        padding:'4px 12px', borderRadius:'999px',
        background:roleBg, color:roleColor, border:`1px solid ${roleBorder}`,
        fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em',
        flexShrink:0,
      }}>
        {roleLabel}
      </div>

      {/* Divider */}
      <div className="hide-mobile" style={{ width:1, height:26, background:'var(--border)' }} />

      {/* Language toggle */}
      <div style={{
        display:'flex', background:'var(--bg-elevated)',
        borderRadius:8, padding:3, gap:2, flexShrink:0,
        border:'1px solid var(--border)',
      }}>
        {['en','fr'].map(l => (
          <button key={l} onClick={() => setLanguage(l)} style={{
            padding:'5px 12px', borderRadius:6, border:'none',
            background: language===l ? 'var(--maroon)' : 'transparent',
            color: language===l ? '#fff' : 'var(--text-muted)',
            fontSize:11.5, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
          }}>{l.toUpperCase()}</button>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          header { left: 0 !important; padding: 0 14px !important; }
        }
      `}</style>
    </header>
  );
}
