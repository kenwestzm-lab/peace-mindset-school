
import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminSlideshow() {
  const [slides, setSlides]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading]= useState(false);
  const [form, setForm]          = useState({ title:'', caption:'', order:0 });
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const r = await api.get('/slideshow/all');
      setSlides(r.data.slides || []);
    } catch { toast.error('Failed to load slides'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
    setUploading(true);
    const tid = toast.loading('Uploading slide...');
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file);
      });
      await api.post('/slideshow', {
        imageData: b64, mimeType: file.type,
        title: form.title, caption: form.caption, order: +form.order,
      });
      toast.success('✅ Slide added! Parents see it instantly.', { id: tid });
      setForm({ title:'', caption:'', order:0 });
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Upload failed', { id: tid }); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const toggle = async (slide) => {
    try {
      await api.put(`/slideshow/${slide._id}`, { isActive: !slide.isActive });
      setSlides(s => s.map(x => x._id === slide._id ? { ...x, isActive: !x.isActive } : x));
      toast.success(slide.isActive ? 'Slide hidden from parents' : 'Slide visible to parents');
    } catch { toast.error('Update failed'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this slide permanently?')) return;
    try {
      await api.delete(`/slideshow/${id}`);
      setSlides(s => s.filter(x => x._id !== id));
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  };

  const inp = {
    padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '20px 16px 80px', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>🖼️ Dashboard Slideshow</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Photos shown on the parent dashboard in a beautiful gold-framed slideshow
        </p>
      </div>

      {/* Upload form */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>+ Add New Slide</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title (optional)</label>
              <input style={inp} value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Sports Day 2026"/>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order (lower = first)</label>
              <input style={inp} type="number" value={form.order} onChange={e => setForm(f => ({...f, order: e.target.value}))} min={0}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Caption (optional)</label>
            <input style={inp} value={form.caption} onChange={e => setForm(f => ({...f, caption: e.target.value}))} placeholder="e.g. Students enjoying the annual sports day"/>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile}/>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ padding: '14px', background: uploading ? 'var(--bg-elevated)' : 'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border: 'none', borderRadius: 12, color: uploading ? 'var(--text-muted)' : '#fff', fontWeight: 700, fontSize: 15, cursor: uploading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {uploading ? '⏳ Uploading to Cloudinary...' : '📷 Choose & Upload Photo'}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
            Max 10MB · JPG, PNG, WebP · Uploaded permanently to Cloudinary
          </p>
        </div>
      </div>

      {/* Slides list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner spinner-dark"/></div>
      ) : slides.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🖼️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>No slides yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Upload photos above to add them to the parent dashboard slideshow</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            {slides.filter(s => s.isActive).length} active · {slides.length} total
          </div>
          {slides.map(slide => (
            <div key={slide._id} style={{ background: 'var(--bg-card)', border: `1.5px solid ${slide.isActive ? 'rgba(212,168,67,0.3)' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden', display: 'flex', gap: 0, opacity: slide.isActive ? 1 : 0.55 }}>
              {/* Thumbnail */}
              <div style={{ width: 100, flexShrink: 0, position: 'relative' }}>
                <img src={slide.imageUrl} alt={slide.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 80 }}/>
                {!slide.isActive && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>HIDDEN</span>
                  </div>
                )}
              </div>
              {/* Info */}
              <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                  {slide.title || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No title</span>}
                </div>
                {slide.caption && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>{slide.caption}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Order: {slide.order} · {new Date(slide.createdAt).toLocaleDateString('en-ZM', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 12px', flexShrink: 0, justifyContent: 'center' }}>
                <button
                  onClick={() => toggle(slide)}
                  style={{ padding: '6px 12px', background: slide.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)', border: `1px solid ${slide.isActive ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.3)'}`, borderRadius: 8, color: slide.isActive ? '#FC8181' : '#4ADE80', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {slide.isActive ? '🙈 Hide' : '👁 Show'}
                </button>
                <button
                  onClick={() => del(slide._id)}
                  style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#FC8181', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
