import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register, setLanguage, language } = useStore();
  const { t } = useT();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form);
      toast.success(t('accountCreated'));
      navigate('/parent');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed.');
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
        <div style={{ position:'fixed', top:'20%', left:'50%', transform:'translateX(-50%)', width:500, height:300, background:'radial-gradient(ellipse, rgba(155,24,38,0.15) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />

        {/* Lang toggle */}
        <div style={{ position:'fixed', top:16, right:16, display:'flex', background:'var(--bg-elevated)', borderRadius:8, padding:3, gap:2, zIndex:100, border:'1px solid var(--border)' }}>
          {['en','fr'].map(l => (
            <button key={l} onClick={()=>setLanguage(l)} style={{
              padding:'5px 13px', borderRadius:6, border:'none',
              background:language===l ? 'var(--maroon)' : 'transparent',
              color:language===l ? '#fff' : 'var(--text-muted)',
              fontSize:12, fontWeight:700, cursor:'pointer',
            }}>{l.toUpperCase()}</button>
          ))}
        </div>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:22, position:'relative', zIndex:1 }}>
          <div style={{
            width:82, height:82, borderRadius:'50%',
            background:'var(--bg-elevated)', border:'2px solid var(--border-bright)',
            margin:'0 auto 14px', overflow:'hidden',
            boxShadow:'0 0 30px var(--maroon-glow)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <img src="/logo.webp" alt="Logo"
              style={{ width:'100%', height:'100%', objectFit:'cover' }}
              onError={e=>{ e.target.style.display='none'; e.target.parentNode.innerHTML='🕊️'; e.target.parentNode.style.fontSize='36px'; }}
            />
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--text)' }}>
            Peace Mindset Private School
          </h1>
          <div style={{ fontFamily:'var(--font-title)', fontSize:9, letterSpacing:'0.2em', color:'var(--gold)', textTransform:'uppercase', marginTop:4, opacity:0.8 }}>
            Better Education
          </div>
        </div>

        {/* Form card */}
        <div style={{
          background:'var(--bg-card)', borderRadius:22,
          width:'100%', maxWidth:400,
          border:'1px solid var(--border-bright)',
          boxShadow:'0 24px 80px rgba(0,0,0,0.8)',
          overflow:'hidden', position:'relative', zIndex:1,
        }}>
          <div style={{ height:2, background:'linear-gradient(90deg, var(--maroon), var(--gold), var(--maroon))', opacity:0.8 }} />

          <div style={{ padding:'24px 24px 8px' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, color:'var(--text)', marginBottom:3 }}>
              {t('registerTitle')}
            </h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:18 }}>{t('registerSubtitle')}</p>

            {error && <div className="alert alert-danger">⚠️ {error}</div>}

            <form onSubmit={handleSubmit} autoComplete="on">
              <div className="form-group">
                <label className="form-label">{t('name')}</label>
                <input type="text" className="form-input"
                  value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                  placeholder="Jane Banda" required autoComplete="name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('email')}</label>
                <input type="email" className="form-input"
                  value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                  placeholder="jane@example.com" required autoComplete="email" inputMode="email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t('phone')} <span style={{ fontWeight:400, textTransform:'none', fontSize:10, color:'var(--text-muted)' }}>({t('optional')})</span>
                </label>
                <input type="tel" className="form-input"
                  value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}
                  placeholder="097XXXXXXX" autoComplete="tel" inputMode="tel"
                />
              </div>
              <div className="form-group" style={{ position:'relative' }}>
                <label className="form-label">{t('password')}</label>
                <input type={showPass?'text':'password'} className="form-input"
                  value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                  placeholder="••••••••" minLength={6} required autoComplete="new-password"
                  style={{ paddingRight:46 }}
                />
                <button type="button" onClick={()=>setShowPass(!showPass)} style={{
                  position:'absolute', right:14, bottom:12, background:'none', border:'none',
                  cursor:'pointer', fontSize:15, color:'var(--text-muted)', padding:0, zIndex:2,
                }}>{showPass?'🙈':'👁️'}</button>
              </div>
              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ marginTop:4 }}>
                {loading ? <><span className="spinner"/> {t('loading')}</> : t('createAccount')}
              </button>
            </form>
          </div>

          <div style={{ padding:'14px 24px 22px', textAlign:'center' }}>
            <p style={{ fontSize:13.5, color:'var(--text-muted)' }}>
              {t('alreadyHaveAccount')}{' '}
              <Link to="/login" style={{ color:'var(--gold)', fontWeight:700 }}>{t('login')} →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
