import { useState, useEffect } from 'react';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Admin Announcements ───────────────────────────────────────────────────────
export function AdminAnnouncements() {
  const { t } = useT();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', titleFr: '', content: '', contentFr: '', priority: 'normal' });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/announcements').then((r) => { setAnnouncements(r.data.announcements); setLoading(false); });
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/announcements', form);
      toast.success('Announcement created!');
      setShowForm(false);
      setForm({ title: '', titleFr: '', content: '', contentFr: '', priority: 'normal' });
      load();
    } catch (err) { toast.error('Failed to create.'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    toast.success('Removed.');
    load();
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const priorityColor = { urgent: 'var(--red)', important: 'var(--orange)', normal: 'var(--blue)' };

  return (
    <div className="animate-in">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('announcements')}</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Broadcast messages to all parents</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ {t('createAnnouncement')}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {announcements.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-icon">📭</div><h4>{t('noAnnouncements')}</h4></div></div>
        ) : announcements.map((a) => (
          <div key={a._id} className="card" style={{ borderLeft: `4px solid ${priorityColor[a.priority]}`, padding: 0 }}>
            <div style={{ padding: '16px 20px' }}>
              <div className="flex-between">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <h4 style={{ fontSize: 15 }}>{a.title}</h4>
                  <span className={`badge ${a.priority === 'urgent' ? 'badge-danger' : a.priority === 'important' ? 'badge-warning' : 'badge-info'}`}>
                    {a.priority}
                  </span>
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => remove(a._id)}>✕ Delete</button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 8, lineHeight: 1.5 }}>{a.content}</p>
              {a.titleFr && (
                <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6, fontStyle: 'italic' }}>🇫🇷 {a.titleFr}</p>
              )}
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 10 }}>
                {format(new Date(a.createdAt), 'dd MMMM yyyy · HH:mm')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📢 {t('createAnnouncement')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('announcementTitle')} (English) *</label>
                  <input type="text" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('frenchTitle')} (Optionnel)</label>
                  <input type="text" className="form-input" value={form.titleFr} onChange={(e) => setForm({ ...form, titleFr: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('announcementContent')} (English) *</label>
                  <textarea className="form-textarea" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('frenchContent')} (Optionnel)</label>
                  <textarea className="form-textarea" value={form.contentFr} onChange={(e) => setForm({ ...form, contentFr: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('priority')}</label>
                  <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="normal">{t('normal')}</option>
                    <option value="important">{t('important')}</option>
                    <option value="urgent">{t('urgent')}</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('loading') : 'Publish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Events ──────────────────────────────────────────────────────────────
export function AdminEvents() {
  const { t } = useT();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', titleFr: '', description: '', descriptionFr: '', eventDate: '', paymentRequired: false, paymentAmount: 0 });

  const load = () => api.get('/events').then((r) => { setEvents(r.data.events); setLoading(false); });
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/events', form);
      toast.success('Event created!');
      setShowForm(false);
      setForm({ title: '', titleFr: '', description: '', descriptionFr: '', eventDate: '', paymentRequired: false, paymentAmount: 0 });
      load();
    } catch (err) { toast.error('Failed to create event.'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this event?')) return;
    await api.delete(`/events/${id}`);
    toast.success('Event removed.');
    load();
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('upcomingEvents')}</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Manage school events and activities</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ {t('createEvent')}</button>
      </div>

      <div className="grid-2">
        {events.length === 0 ? (
          <div className="card" style={{ gridColumn: '1/-1' }}><div className="empty-state"><div className="empty-icon">📅</div><h4>{t('noEvents')}</h4></div></div>
        ) : events.map((ev) => (
          <div key={ev._id} className="card" style={{ padding: 0 }}>
            <div style={{ background: 'var(--maroon)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{ev.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{format(new Date(ev.eventDate), 'dd MMMM yyyy')}</div>
              </div>
              <button className="btn btn-sm" onClick={() => remove(ev._id)} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5, marginBottom: 12 }}>{ev.description}</p>
              {ev.paymentRequired && (
                <span className="badge badge-maroon">Payment Required: ZMW {ev.paymentAmount}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗓️ {t('createEvent')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('eventTitle')} (English) *</label>
                  <input type="text" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('eventTitle')} (Français)</label>
                  <input type="text" className="form-input" value={form.titleFr} onChange={(e) => setForm({ ...form, titleFr: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('eventDate')} *</label>
                  <input type="datetime-local" className="form-input" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('eventDescription')} (English) *</label>
                  <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('eventDescription')} (Français)</label>
                  <textarea className="form-textarea" value={form.descriptionFr} onChange={(e) => setForm({ ...form, descriptionFr: e.target.value })} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.paymentRequired} onChange={(e) => setForm({ ...form, paymentRequired: e.target.checked })} />
                    <span className="form-label" style={{ margin: 0 }}>{t('paymentRequired')}</span>
                  </label>
                </div>
                {form.paymentRequired && (
                  <div className="form-group">
                    <label className="form-label">{t('paymentAmount')} *</label>
                    <input type="number" className="form-input" value={form.paymentAmount} onChange={(e) => setForm({ ...form, paymentAmount: e.target.value })} min={0} required />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('loading') : t('createEvent')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Parents ─────────────────────────────────────────────────────────────
export function AdminParents() {
  const { t } = useT();
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/admin/parents').then((r) => { setParents(r.data.parents); setLoading(false); });
  useEffect(() => { load(); }, []);

  const toggle = async (id, isActive) => {
    try {
      await api.put(`/admin/parents/${id}/${isActive ? 'deactivate' : 'activate'}`);
      toast.success(`Account ${isActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err) { toast.error('Failed.'); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="mb-24">
        <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('manageParents')}</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>{parents.length} parent accounts</p>
      </div>
      <div className="card">
        <div className="table-wrapper">
          {parents.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">👪</div><h4>No parents yet.</h4></div>
          ) : (
            <table>
              <thead><tr>
                <th>Name</th><th>Email</th><th>Phone</th><th>Language</th>
                <th>Children</th><th>Joined</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {parents.map((p) => (
                  <tr key={p._id}>
                    <td><strong>{p.name}</strong></td>
                    <td style={{ fontSize: 13 }}>{p.email}</td>
                    <td style={{ fontSize: 13 }}>{p.phone || '—'}</td>
                    <td><span className="badge badge-default">{p.language?.toUpperCase() || 'EN'}</span></td>
                    <td>{p.childCount}</td>
                    <td style={{ fontSize: 12 }}>{format(new Date(p.createdAt), 'dd MMM yyyy')}</td>
                    <td>
                      <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${p.isActive ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggle(p._id, p.isActive)}
                      >
                        {p.isActive ? t('deactivate') : t('activate')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Admin Settings ────────────────────────────────────────────────────────────
export function AdminSettings() {
  const { t } = useT();
  return (
    <div className="animate-in">
      <div className="mb-24">
        <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('systemSettings')}</h2>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3>ℹ️ School Information</h3></div>
          <div className="card-body">
            <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>
              <strong>School Name:</strong> Peace Mindset Private School<br />
              <strong>Motto:</strong> Better Education<br />
              <strong>Airtel Money:</strong> 0977200127<br />
              <strong>MTN MoMo:</strong> 0960774535<br />
              <strong>Admin Email:</strong> adminpeacemindset.edu.zm@gmail.com
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>⚙️ Quick Actions</h3></div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>
              Use the Payments section to update fee amounts at any time.
            </p>
            <a href="/admin/payments" className="btn btn-primary">
              💳 Manage Fees
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAnnouncements;
