import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, setLanguage, language } = useStore();
  const { t } = useT();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(t('loginSuccess'));
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'developer') navigate('/developer');
      else navigate('/parent');
    } catch (err) {
      setError(err.response?.data?.error || t('invalidCredentials'));
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, var(--maroon-dark) 0%, var(--maroon) 60%, #8B1525 100%)',
      overflowY: 'auto',
      overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
    }}>
      {/* Inner scroll container */}
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px 40px',
      }}>
        {/* Decorative rings — pointer events off so they don't block */}
        <div style={{ position:'fixed', top:-80, right:-80, width:280, height:280, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none', zIndex:0 }} />
        <div style={{ position:'fixed', bottom:-100, left:-60, width:320, height:320, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.04)', pointerEvents:'none', zIndex:0 }} />

        {/* Lang toggle */}
        <div style={{ position:'fixed', top:16, right:16, display:'flex', background:'rgba(255,255,255,0.15)', borderRadius:8, padding:3, gap:2, zIndex:100 }}>
          {['en','fr'].map(l => (
            <button key={l} onClick={() => setLanguage(l)} style={{
              padding:'5px 13px', borderRadius:6, border:'none',
              background: language===l ? 'white' : 'transparent',
              color: language===l ? 'var(--maroon)' : 'rgba(255,255,255,0.85)',
              fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
            }}>{l.toUpperCase()}</button>
          ))}
        </div>

        {/* Logo + branding */}
        <div style={{ textAlign:'center', marginBottom:28, position:'relative', zIndex:1 }}>
          <div style={{
            width:100, height:100, borderRadius:'50%',
            background:'rgba(255,255,255,0.1)',
            border:'2.5px solid rgba(255,255,255,0.25)',
            margin:'0 auto 16px',
            overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <img src="/logo.webp" alt="Logo"
              style={{ width:'100%', height:'100%', objectFit:'cover' }}
              onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML='🕊️'; e.target.parentNode.style.fontSize='46px'; }}
            />
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:'#fff', lineHeight:1.2 }}>
            Peace Mindset<br/>Private School
          </h1>
          <div style={{ fontFamily:'var(--font-title)', fontSize:9, letterSpacing:'0.22em', color:'var(--gold-light)', textTransform:'uppercase', marginTop:5 }}>
            Better Education
          </div>
        </div>

        {/* Form card */}
        <div style={{
          background:'#fff', borderRadius:22,
          width:'100%', maxWidth:400,
          boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
          overflow:'hidden',
          position:'relative', zIndex:1,
        }}>
          <div style={{ padding:'26px 24px 8px' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, color:'var(--maroon-dark)', marginBottom:3 }}>
              {t('loginTitle')}
            </h2>
            <p style={{ fontSize:13, color:'var(--gray-400)', marginBottom:20 }}>{t('loginSubtitle')}</p>

            {error && <div className="alert alert-danger">⚠️ {error}</div>}

            <form onSubmit={handleSubmit} autoComplete="on">
              <div className="form-group">
                <label className="form-label">{t('email')}</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  inputMode="email"
                  style={{ fontSize:16 }}
                />
              </div>
              <div className="form-group" style={{ position:'relative' }}>
                <label className="form-label">{t('password')}</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight:48, fontSize:16 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position:'absolute', right:14, bottom:12,
                  background:'none', border:'none', cursor:'pointer',
                  fontSize:16, color:'var(--gray-400)', padding:0, zIndex:2,
                }}>{showPass ? '🙈' : '👁️'}</button>
              </div>
              <button type="submit" className="btn btn-primary w-full btn-lg"
                disabled={loading} style={{ marginTop:4 }}>
                {loading ? <><span className="spinner" /> {t('loading')}</> : t('login')}
              </button>
            </form>
          </div>
          <div style={{ padding:'14px 24px 22px', textAlign:'center' }}>
            <p style={{ fontSize:13.5, color:'var(--gray-500)' }}>
              {t('dontHaveAccount')}{' '}
              <Link to="/register" style={{ color:'var(--maroon)', fontWeight:700 }}>{t('createAccount')} →</Link>
            </p>
          </div>
        </div>

        <p style={{ marginTop:20, fontSize:11.5, color:'rgba(255,255,255,0.3)', textAlign:'center', position:'relative', zIndex:1 }}>
          Zambia · Empowering families through education
        </p>
      </div>
    </div>
  );
}
