import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';

export default function Header({ onMenuToggle }) {
  const { user, setLanguage, language } = useStore();
  const { t } = useT();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  const getRoleBadge = () => {
    if (user?.role === 'admin') return { label: 'Administrator', bg: 'var(--gold-pale)', color: 'var(--gold)', border: 'rgba(184,149,42,0.25)' };
    if (user?.role === 'developer') return { label: 'Developer', bg: 'var(--blue-light)', color: 'var(--blue)', border: 'rgba(30,95,138,0.2)' };
    return { label: 'Parent', bg: 'var(--maroon-pale)', color: 'var(--maroon)', border: 'rgba(107,15,26,0.15)' };
  };

  const badge = getRoleBadge();
  const today = new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <header style={{
      position: 'fixed', top: 0, left: 'var(--sidebar-width)', right: 0,
      height: 'var(--header-height)',
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--gray-200)',
      display: 'flex', alignItems: 'center',
      padding: '0 28px 0 24px',
      zIndex: 100,
      boxShadow: '0 1px 10px rgba(0,0,0,0.05)',
      gap: 16,
    }}>
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        style={{
          display: 'none', background: 'none', border: '1px solid var(--gray-200)',
          fontSize: 18, cursor: 'pointer', color: 'var(--gray-600)',
          padding: '6px 10px', borderRadius: 8, flexShrink: 0,
          transition: 'background 0.15s',
        }}
        className="mobile-menu-btn"
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        ☰
      </button>

      {/* Greeting */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-700)', lineHeight: 1.3 }}>
          {getGreeting()},{' '}
          <span style={{
            color: 'var(--maroon)',
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontStyle: 'italic',
          }}>
            {user?.name?.split(' ')[0]}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 1 }}>
          {today}
        </div>
      </div>

      {/* Role badge */}
      <div style={{
        padding: '5px 14px', borderRadius: 'var(--radius-full)',
        background: badge.bg, color: badge.color,
        border: `1px solid ${badge.border}`,
        fontSize: 11.5, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        flexShrink: 0,
      }} className="hide-mobile">
        {badge.label}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--gray-200)' }} className="hide-mobile" />

      {/* Language toggle */}
      <div style={{
        display: 'flex', background: 'var(--gray-100)',
        borderRadius: 8, padding: '3px', gap: 2, flexShrink: 0,
        border: '1px solid var(--gray-200)',
      }}>
        {['en', 'fr'].map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            style={{
              padding: '5px 13px', borderRadius: 6, border: 'none',
              background: language === lang ? 'var(--maroon)' : 'transparent',
              color: language === lang ? 'var(--white)' : 'var(--gray-500)',
              fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s ease',
              letterSpacing: '0.04em',
            }}
          >
            {lang === 'en' ? 'EN' : 'FR'}
          </button>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          header { left: 0 !important; padding: 0 16px !important; }
        }
      `}</style>
    </header>
  );
}
