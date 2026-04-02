import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, setLanguage, language } = useStore();
  const { t } = useT();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(t('loginSuccess'));
      if (user.role==='admin') navigate('/admin');
      else if (user.role==='developer') navigate('/developer');
      else navigate('/parent');
    } catch (err) {
      setError(err.response?.data?.error || t('invalidCredentials'));
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight:'100dvh', background:'var(--bg)',
      overflowY:'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch',
    }}>
      <div style={{
        minHeight:'100dvh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', padding:'32px 16px 40px',
        position:'relative',
      }}>
        {/* Background glow effects */}
        <div style={{ position:'fixed', top:'20%', left:'50%', transform:'translateX(-50%)', width:500, height:300, background:'radial-gradient(ellipse, rgba(155,24,38,0.15) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />
        <div style={{ position:'fixed', bottom:'10%', right:'10%', width:300, height:300, background:'radial-gradient(ellipse, rgba(212,168,67,0.05) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />

        {/* Lang toggle */}
        <div style={{ position:'fixed', top:16, right:16, display:'flex', background:'var(--bg-elevated)', borderRadius:8, padding:3, gap:2, zIndex:100, border:'1px solid var(--border)' }}>
          {['en','fr'].map(l => (
            <button key={l} onClick={()=>setLanguage(l)} style={{
              padding:'5px 13px', borderRadius:6, border:'none',
              background:language===l ? 'var(--maroon)' : 'transparent',
              color:language===l ? '#fff' : 'var(--text-muted)',
              fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
            }}>{l.toUpperCase()}</button>
          ))}
        </div>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28, position:'relative', zIndex:1, animation:'slideUp 0.5s ease' }}>
          <div style={{
            width:100, height:100, borderRadius:'50%',
            background:'var(--bg-elevated)',
            border:'2px solid var(--border-bright)',
            margin:'0 auto 16px', overflow:'hidden',
            boxShadow:'0 0 40px var(--maroon-glow)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <img src="/logo.webp" alt="Logo"
              style={{ width:'100%', height:'100%', objectFit:'cover' }}
              onError={e=>{ e.target.style.display='none'; e.target.parentNode.innerHTML='🕊️'; e.target.parentNode.style.fontSize='46px'; }}
            />
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'var(--text)', lineHeight:1.2 }}>
            Peace Mindset<br/>Private School
          </h1>
          <div style={{ fontFamily:'var(--font-title)', fontSize:9, letterSpacing:'0.22em', color:'var(--gold)', textTransform:'uppercase', marginTop:5, opacity:0.8 }}>
            Better Education
          </div>
        </div>

        {/* Form card */}
        <div style={{
          background:'var(--bg-card)', borderRadius:22,
          width:'100%', maxWidth:400,
          border:'1px solid var(--border-bright)',
          boxShadow:'0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(155,24,38,0.1)',
          overflow:'hidden', position:'relative', zIndex:1,
          animation:'slideUp 0.6s ease',
        }}>
          {/* Top gold line */}
          <div style={{ height:2, background:'linear-gradient(90deg, var(--maroon), var(--gold), var(--maroon))', opacity:0.8 }} />

          <div style={{ padding:'26px 24px 8px' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, color:'var(--text)', marginBottom:3 }}>
              {t('loginTitle')}
            </h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>{t('loginSubtitle')}</p>

            {error && <div className="alert alert-danger">⚠️ {error}</div>}

            <form onSubmit={handleSubmit} autoComplete="on">
              <div className="form-group">
                <label className="form-label">{t('email')}</label>
                <input type="email" className="form-input"
                  value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                  placeholder="you@example.com" required autoComplete="email" inputMode="email"
                />
              </div>
              <div className="form-group" style={{ position:'relative' }}>
                <label className="form-label">{t('password')}</label>
                <input type={showPass?'text':'password'} className="form-input"
                  value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                  placeholder="••••••••" required autoComplete="current-password"
                  style={{ paddingRight:46 }}
                />
                <button type="button" onClick={()=>setShowPass(!showPass)} style={{
                  position:'absolute', right:14, bottom:12, background:'none', border:'none',
                  cursor:'pointer', fontSize:15, color:'var(--text-muted)', padding:0, zIndex:2,
                }}>{showPass?'🙈':'👁️'}</button>
              </div>
              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ marginTop:4, letterSpacing:'0.04em' }}>
                {loading ? <><span className="spinner"/> {t('loading')}</> : t('login')}
              </button>
            </form>
          </div>

          <div style={{ padding:'14px 24px 22px', textAlign:'center' }}>
            <p style={{ fontSize:13.5, color:'var(--text-muted)' }}>
              {t('dontHaveAccount')}{' '}
              <Link to="/register" style={{ color:'var(--gold)', fontWeight:700 }}>{t('createAccount')} →</Link>
            </p>
          </div>
        </div>

        <p style={{ marginTop:20, fontSize:11, color:'var(--border-bright)', textAlign:'center', position:'relative', zIndex:1 }}>
          Zambia · Empowering families through education
        </p>
      </div>
    </div>
  );
}
