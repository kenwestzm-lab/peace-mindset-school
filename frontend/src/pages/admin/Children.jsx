import { useState, useEffect } from 'react';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const GRADES = ['Baby Class','Reception','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];

export default function AdminChildren() {
  const { t } = useT();
  const [children, setChildren] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'remove' | 'result'
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', grade: 'Grade 1', gradeTeacher: '', gradeTeacherPhone: '', parentId: '' });
  const [resultForm, setResultForm] = useState({ title: '', term: '1', year: new Date().getFullYear().toString(), subjects: '' });
  const [resultFile, setResultFile] = useState(null);
  const [removeReason, setRemoveReason] = useState('');

  const load = async () => {
    try {
      const [c, p] = await Promise.all([api.get('/children/all'), api.get('/admin/parents')]);
      setChildren(c.data.children);
      setParents(p.data.parents);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ name: '', grade: 'Grade 1', gradeTeacher: '', gradeTeacherPhone: '', parentId: '' });
    setModal('add');
  };

  const openEdit = (child) => {
    setSelected(child);
    setForm({ name: child.name, grade: child.grade, gradeTeacher: child.gradeTeacher, gradeTeacherPhone: child.gradeTeacherPhone, parentId: child.parent?._id || '' });
    setModal('edit');
  };

  const openResult = (child) => { setSelected(child); setModal('result'); };
  const openRemove = (child) => { setSelected(child); setModal('remove'); };

  const saveChild = async (e) => {
    e.preventDefault();
    if (!form.parentId) { toast.error('Please select a parent.'); return; }
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/children', form);
        toast.success('Child registered!');
      } else {
        await api.put(`/children/${selected._id}`, form);
        toast.success('Child updated!');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const removeChild = async () => {
    setSaving(true);
    try {
      await api.delete(`/children/${selected._id}`, { data: { reason: removeReason } });
      toast.success('Child removed.');
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove.');
    } finally { setSaving(false); }
  };

  const uploadResult = async (e) => {
    e.preventDefault();
    if (!resultFile) { toast.error('Please select a PDF file.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('childId', selected._id);
      fd.append('title', resultForm.title);
      fd.append('term', resultForm.term);
      fd.append('year', resultForm.year);
      fd.append('resultFile', resultFile);
      if (resultForm.subjects) fd.append('subjects', resultForm.subjects);
      await api.post('/results', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('resultUploaded'));
      setModal(null);
      setResultFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const ChildForm = () => (
    <form onSubmit={saveChild}>
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">{t('childName')} *</label>
          <input type="text" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="form-group">
          <label className="form-label">{t('parentAccount')} *</label>
          <select className="form-select" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} required>
            <option value="">— Select parent —</option>
            {parents.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.email})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('grade')} *</label>
          <select className="form-select" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('gradeTeacher')} *</label>
          <input type="text" className="form-input" value={form.gradeTeacher} onChange={(e) => setForm({ ...form, gradeTeacher: e.target.value })} required />
        </div>
        <div className="form-group">
          <label className="form-label">{t('teacherPhone')} *</label>
          <input type="tel" className="form-input" value={form.gradeTeacherPhone} onChange={(e) => setForm({ ...form, gradeTeacherPhone: e.target.value })} placeholder="097XXXXXXX" required />
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>{t('cancel')}</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? t('loading') : t('save')}
        </button>
      </div>
    </form>
  );

  return (
    <div className="animate-in">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('manageChildren')}</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>{children.filter(c => c.isActive).length} active children</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ {t('addChild')}</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {children.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">👧</div><h4>No children registered yet.</h4></div>
          ) : (
            <table>
              <thead><tr>
                <th>{t('childName')}</th><th>{t('grade')}</th><th>{t('gradeTeacher')}</th>
                <th>{t('parentAccount')}</th><th>{t('paymentStatus')}</th><th>{t('status')}</th><th>{t('actions')}</th>
              </tr></thead>
              <tbody>
                {children.map((c) => (
                  <tr key={c._id} style={{ opacity: c.isActive ? 1 : 0.5 }}>
                    <td><strong>{c.name}</strong></td>
                    <td><span className="badge badge-maroon">{c.grade}</span></td>
                    <td>
                      <div style={{ fontSize: 13 }}>{c.gradeTeacher}</div>
                      <div className="text-xs text-muted">{c.gradeTeacherPhone}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{c.parent?.name}</div>
                      <div className="text-xs text-muted">{c.parent?.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${c.paymentStatus === 'paid' ? 'badge-success' : c.paymentStatus === 'expired' ? 'badge-warning' : 'badge-danger'}`}>
                        {c.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${c.isActive ? 'badge-success' : 'badge-default'}`}>
                        {c.isActive ? 'Active' : 'Removed'}
                      </span>
                    </td>
                    <td>
                      {c.isActive && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)}>{t('edit')}</button>
                          <button className="btn btn-sm btn-gold" onClick={() => openResult(c)}>📋 Result</button>
                          <button className="btn btn-sm btn-danger" onClick={() => openRemove(c)}>✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'add' ? '➕ ' + t('addChild') : '✏️ ' + t('editChild')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <ChildForm />
          </div>
        </div>
      )}

      {/* Upload Result Modal */}
      {modal === 'result' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 {t('uploadResult')} — {selected?.name}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={uploadResult}>
              <div className="modal-body">
                <div style={{ background: 'var(--maroon-pale)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--maroon)' }}>
                  ℹ️ Results will be locked if parent has not paid school fees.
                </div>
                <div className="form-group">
                  <label className="form-label">{t('resultTitle')} *</label>
                  <input type="text" className="form-input" value={resultForm.title} onChange={(e) => setResultForm({ ...resultForm, title: e.target.value })} placeholder="e.g. End of Term 1 Results" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">{t('term')} *</label>
                    <select className="form-select" value={resultForm.term} onChange={(e) => setResultForm({ ...resultForm, term: e.target.value })}>
                      {[1,2,3].map((n) => <option key={n} value={n}>Term {n}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('year')} *</label>
                    <input type="number" className="form-input" value={resultForm.year} onChange={(e) => setResultForm({ ...resultForm, year: e.target.value })} min="2020" max="2030" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('uploadFile')} (PDF) *</label>
                  <input type="file" className="form-input" accept=".pdf" onChange={(e) => setResultFile(e.target.files[0])} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t('loading') : '⬆️ ' + t('uploadResult')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Modal */}
      {modal === 'remove' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>⚠️ {t('removeChild')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger">
                Are you sure you want to remove <strong>{selected?.name}</strong>? This action cannot be undone.
              </div>
              <div className="form-group">
                <label className="form-label">{t('removeReason')}</label>
                <input type="text" className="form-input" value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} placeholder="e.g. Transferred to another school" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>{t('cancel')}</button>
              <button className="btn btn-danger" onClick={removeChild} disabled={saving}>
                {saving ? t('loading') : t('removeChild')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
