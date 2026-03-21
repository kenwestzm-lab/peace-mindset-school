import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ParentChildren() {
  const { t } = useT();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/children').then((r) => { setChildren(r.data.children); setLoading(false); });
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="mb-24">
        <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('myChildren')}</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Children registered under your account</p>
      </div>
      {children.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">👧</div><h4>{t('noChildren')}</h4>
          <p>Contact the school admin to register your child.</p>
        </div></div>
      ) : (
        <div className="grid-2">
          {children.map((c) => (
            <div className="card" key={c._id} style={{ padding: 0 }}>
              <div style={{ background: 'linear-gradient(135deg, var(--maroon-dark), var(--maroon))', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👦</div>
                <div>
                  <div style={{ color: 'var(--white)', fontFamily: 'var(--font-display)', fontSize: 18 }}>{c.name}</div>
                  <div style={{ color: 'var(--gold-light)', fontSize: 13 }}>{c.grade}</div>
                </div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { label: t('gradeTeacher'), value: c.gradeTeacher },
                    { label: t('teacherPhone'), value: c.gradeTeacherPhone },
                    { label: t('paymentStatus'), value: <span className={`badge ${c.paymentStatus === 'paid' ? 'badge-success' : c.paymentStatus === 'expired' ? 'badge-warning' : 'badge-danger'}`}>{t(c.paymentStatus)}</span> },
                  ].map((item, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 14, color: 'var(--gray-700)', fontWeight: 500 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ParentAnnouncements() {
  const { t } = useT();
  const { user } = useStore();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/announcements').then((r) => { setAnnouncements(r.data.announcements); setLoading(false); });
    const socket = getSocket();
    if (socket) socket.on('new_announcement', ({ announcement }) => setAnnouncements((p) => [announcement, ...p]));
    return () => getSocket()?.off('new_announcement');
  }, []);

  const pCfg = { urgent: { color: 'var(--red)', bg: 'var(--red-light)', icon: '🚨' }, important: { color: 'var(--orange)', bg: 'var(--orange-light)', icon: '⚠️' }, normal: { color: 'var(--blue)', bg: 'var(--blue-light)', icon: '📢' } };
  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="mb-24"><h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('announcements')}</h2></div>
      {announcements.length === 0 ? <div className="card"><div className="empty-state"><div className="empty-icon">📭</div><h4>{t('noAnnouncements')}</h4></div></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {announcements.map((a) => {
            const cfg = pCfg[a.priority] || pCfg.normal;
            const title = user?.language === 'fr' && a.titleFr ? a.titleFr : a.title;
            const content = user?.language === 'fr' && a.contentFr ? a.contentFr : a.content;
            return (
              <div key={a._id} className="card" style={{ borderLeft: `4px solid ${cfg.color}`, padding: 0 }}>
                <div style={{ padding: '18px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                    <h4 style={{ flex: 1, fontSize: 16, color: 'var(--gray-800)' }}>{title}</h4>
                    <span style={{ padding: '3px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{a.priority}</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.6 }}>{content}</p>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 12 }}>{format(new Date(a.createdAt), 'dd MMMM yyyy')}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ParentEvents() {
  const { t } = useT();
  const { user } = useStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/events').then((r) => { setEvents(r.data.events); setLoading(false); });
    const socket = getSocket();
    if (socket) socket.on('new_event', ({ event }) => setEvents((p) => [...p, event]));
    return () => getSocket()?.off('new_event');
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="mb-24"><h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('upcomingEvents')}</h2></div>
      {events.length === 0 ? <div className="card"><div className="empty-state"><div className="empty-icon">📅</div><h4>{t('noEvents')}</h4></div></div> : (
        <div className="grid-2">
          {events.map((ev) => {
            const title = user?.language === 'fr' && ev.titleFr ? ev.titleFr : ev.title;
            const desc = user?.language === 'fr' && ev.descriptionFr ? ev.descriptionFr : ev.description;
            const isPast = new Date(ev.eventDate) < new Date();
            return (
              <div key={ev._id} className="card" style={{ opacity: isPast ? 0.7 : 1 }}>
                <div style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ background: 'var(--maroon-pale)', padding: '8px 14px', borderRadius: 10, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--maroon)' }}>{format(new Date(ev.eventDate), 'dd')}</div>
                      <div style={{ fontSize: 11, color: 'var(--maroon)', fontWeight: 600, textTransform: 'uppercase' }}>{format(new Date(ev.eventDate), 'MMM')}</div>
                    </div>
                    {isPast ? <span className="badge badge-default">Past</span> : ev.paymentRequired ? <span className="badge badge-maroon">ZMW {ev.paymentAmount}</span> : null}
                  </div>
                  <h4 style={{ fontSize: 16, marginBottom: 8, color: 'var(--gray-800)' }}>{title}</h4>
                  <p style={{ fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.5 }}>{desc}</p>
                  {!isPast && ev.paymentRequired && <Link to="/parent/payments" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>💳 {t('payForEvent')}</Link>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ParentProfile() {
  const { t } = useT();
  const { user, updateUser, setLanguage, language } = useStore();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try { const r = await api.put('/auth/profile', profileForm); updateUser(r.data.user); toast.success(t('profileUpdated')); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setSaving(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault(); setSavingPw(true);
    try { await api.put('/auth/password', pwForm); toast.success(t('passwordChanged')); setPwForm({ currentPassword: '', newPassword: '' }); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setSavingPw(false); }
  };

  return (
    <div className="animate-in">
      <div className="mb-24"><h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('profile')}</h2></div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>👤 {t('updateProfile')}</h3></div>
          <div className="card-body">
            <form onSubmit={saveProfile}>
              <div className="form-group"><label className="form-label">{t('name')}</label><input type="text" className="form-input" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">{t('email')}</label><input type="email" className="form-input" value={user?.email} disabled style={{ background: 'var(--gray-100)' }} /></div>
              <div className="form-group"><label className="form-label">{t('phone')}</label><input type="tel" className="form-input" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="097XXXXXXX" /></div>
              <div className="form-group">
                <label className="form-label">{t('preferredLanguage')}</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['en', 'fr'].map((lang) => (<button key={lang} type="button" onClick={() => setLanguage(lang)} className={`btn ${language === lang ? 'btn-primary' : 'btn-secondary'}`}>{lang === 'en' ? '🇬🇧 ' + t('english') : '🇫🇷 ' + t('french')}</button>))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('loading') : t('save')}</button>
            </form>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>🔒 {t('changePassword')}</h3></div>
          <div className="card-body">
            <form onSubmit={savePassword}>
              <div className="form-group"><label className="form-label">{t('currentPassword')}</label><input type="password" className="form-input" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">{t('newPassword')}</label><input type="password" className="form-input" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} minLength={6} required /></div>
              <button type="submit" className="btn btn-primary" disabled={savingPw}>{savingPw ? t('loading') : t('changePassword')}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
