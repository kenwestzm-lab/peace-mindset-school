import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useT } from '../../hooks/useT';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const { t, language } = useT();
  const { setLanguage } = useStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ background:'var(--bg-card)', borderRadius:20, overflow:'hidden', boxShadow:'0 8px 30px rgba(0,0,0,0.12)' }}>
          <div style={{ padding:'28px 24px 8px' }}>
            <h2 style={{ fontSize:22, fontWeight:800, color:'var(--maroon-dark)', marginBottom:4 }}>
              {language === 'fr' ? 'Mot de passe oublié' : 'Forgot Password'}
            </h2>
            <p style={{ fontSize:13.5, color:'var(--text-muted)', marginBottom:20 }}>
              {language === 'fr'
                ? 'Entrez votre email pour recevoir un lien de réinitialisation'
                : "Enter your email and we'll send you a reset link"}
            </p>

            {sent ? (
              <div style={{ background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.25)', borderRadius:12, padding:'16px 18px', textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📧</div>
                <p style={{ color:'#16a34a', fontWeight:700, fontSize:14, marginBottom:6 }}>
                  {language === 'fr' ? 'Email envoyé !' : 'Email Sent!'}
                </p>
                <p style={{ color:'var(--text-muted)', fontSize:13 }}>
                  {language === 'fr'
                    ? `Si un compte existe pour ${email}, un lien de réinitialisation a été envoyé.`
                    : `If an account exists for ${email}, a reset link has been sent. Check your inbox.`}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">{t('email')}</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ marginTop:8 }}>
                  {loading ? <><span className="spinner"/> {t('loading')}</> : (language === 'fr' ? 'Envoyer le lien' : 'Send Reset Link')}
                </button>
              </form>
            )}
          </div>
          <div style={{ padding:'14px 24px 22px', textAlign:'center' }}>
            <Link to="/login" style={{ fontSize:13.5, color:'var(--gold)', fontWeight:700, textDecoration:'none' }}>
              ← {t('back')} {t('login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
