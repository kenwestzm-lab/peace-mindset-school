import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useT } from '../../hooks/useT';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t, language } = useT();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(language === 'fr' ? 'Le mot de passe doit contenir au moins 6 caractères' : 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.error(language === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setDone(true);
      toast.success(language === 'fr' ? 'Mot de passe réinitialisé !' : 'Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed — link may have expired');
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
              {language === 'fr' ? 'Réinitialiser le mot de passe' : 'Reset Password'}
            </h2>

            {done ? (
              <div style={{ background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.25)', borderRadius:12, padding:'16px 18px', textAlign:'center', marginTop:16 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                <p style={{ color:'#16a34a', fontWeight:700, fontSize:14 }}>
                  {language === 'fr' ? 'Succès ! Redirection...' : 'Success! Redirecting to login...'}
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize:13.5, color:'var(--text-muted)', marginBottom:20 }}>
                  {language === 'fr' ? 'Entrez votre nouveau mot de passe' : 'Enter your new password below'}
                </p>
                <form onSubmit={handleSubmit}>
                  <div className="form-group" style={{ position:'relative' }}>
                    <label className="form-label">{language === 'fr' ? 'Nouveau mot de passe' : 'New Password'}</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ paddingRight:46 }}
                    />
                    <button type="button" onClick={()=>setShowPass(!showPass)} style={{
                      position:'absolute', right:14, bottom:12, background:'none', border:'none',
                      cursor:'pointer', fontSize:15, color:'var(--text-muted)', padding:0,
                    }}>{showPass ? '🙈' : '👁️'}</button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{language === 'fr' ? 'Confirmer le mot de passe' : 'Confirm Password'}</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ marginTop:8 }}>
                    {loading ? <><span className="spinner"/> {t('loading')}</> : (language === 'fr' ? 'Réinitialiser' : 'Reset Password')}
                  </button>
                </form>
              </>
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
