import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const TERMS = { 1:'First Term', 2:'Second Term', 3:'Third Term' };
const GRADES = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Form 1','Form 2','Form 3','Form 4','Form 5'];

function UploadBar({ pct, label }) {
  if (pct === null) return null;
  return (
    <div style={{ padding:'8px 12px', background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:'#25D366', transition:'width 0.4s', borderRadius:2 }}/>
      </div>
      <span style={{ fontSize:11, color:'#25D366', whiteSpace:'nowrap' }}>{label}</span>
    </div>
  );
}

export default function AdminResults() {
  const [children, setChildren] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState(null);
  const [uploadLabel, setUploadLabel] = useState('');
  const [selectedChild, setSelectedChild] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ childId:'', title:'', term:1, year:new Date().getFullYear(), subjects:'' });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const [cRes] = await Promise.all([api.get('/children/admin/all')]);
      setChildren(cRes.data.children || []);
      // Load results for selected child
      if (selectedChild) {
        const rRes = await api.get(`/results/child/${selectedChild}`);
        setResults(rRes.data.results || []);
      }
    } catch (e) { toast.error('Load failed: ' + (e.response?.data?.error || e.message)); }
    finally { setLoading(false); }
  };

  const loadResults = async (childId) => {
    if (!childId) { setResults([]); return; }
    try {
      const r = await api.get(`/results/child/${childId}`);
      setResults(r.data.results || []);
    } catch (e) { toast.error('Failed to load results'); }
  };

  useEffect(() => { load(); }, []);

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (!allowed.includes(f.type)) { toast.error('Only images (JPG/PNG) or PDF files'); return; }
    if (f.size > 50 * 1024 * 1024) { toast.error('Max 50MB'); return; }
    setFile(f);
    // Preview for images
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setFilePreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setFilePreview('pdf');
    }
  };

  const uploadFile = async (f) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setUploadPct(20); setUploadLabel('Reading file...');
          const base64 = e.target.result;
          setUploadPct(40); setUploadLabel('Uploading to server...');
          const res = await api.post('/media/upload', {
            mediaData: base64,
            mimeType: f.type,
            folder: 'peace-mindset/results',
          });
          setUploadPct(90); setUploadLabel('Almost done...');
          resolve({ url: res.data.url, publicId: res.data.publicId });
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsDataURL(f);
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.childId) { toast.error('Select a child'); return; }
    if (!form.title) { toast.error('Enter a title'); return; }
    if (!file) { toast.error('Select a result file (image or PDF)'); return; }

    setSubmitting(true);
    setUploadPct(5); setUploadLabel('Starting upload...');
    try {
      const { url, publicId } = await uploadFile(file);
      setUploadPct(95); setUploadLabel('Saving result...');

      await api.post('/results', {
        childId: form.childId,
        title: form.title,
        term: Number(form.term),
        year: Number(form.year),
        fileUrl: url,
        filePublicId: publicId,
        subjects: form.subjects ? form.subjects.split(',').map(s => s.trim()).filter(Boolean) : [],
      });

      setUploadPct(100); setUploadLabel('✅ Done!');
      toast.success(`✅ Result uploaded for Term ${form.term}!`);
      setShowForm(false);
      setFile(null); setFilePreview(null);
      setForm(f => ({ ...f, title:'', subjects:'' }));
      await loadResults(form.childId);
      setTimeout(() => setUploadPct(null), 1000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
      setUploadPct(null);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (resultId) => {
    if (!confirm('Delete this result?')) return;
    try {
      await api.delete(`/results/${resultId}`);
      setResults(p => p.filter(r => r._id !== resultId));
      toast.success('Result deleted');
    } catch { toast.error('Delete failed'); }
  };

  const inp = { padding:'10px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, outline:'none', width:'100%' };
  const filtered = children.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.grade?.toLowerCase().includes(search.toLowerCase()) ||
    c.studentId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding:'20px 16px 80px', maxWidth:700, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)' }}>📋 Test Results</h2>
        <button onClick={() => setShowForm(!showForm)} style={{ padding:'10px 18px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:12, color:'#fff', fontWeight:600, cursor:'pointer', fontSize:14 }}>
          {showForm ? '✕ Cancel' : '+ Upload Result'}
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <form onSubmit={submit} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24, marginBottom:24, display:'flex', flexDirection:'column', gap:14 }}>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>Upload Test Result</h3>

          <div>
            <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Student *</label>
            <select value={form.childId} onChange={e => { setForm(f=>({...f,childId:e.target.value})); loadResults(e.target.value); }} required style={inp}>
              <option value="">— Select student —</option>
              {children.map(c => <option key={c._id} value={c._id}>{c.name} — {c.grade} {c.studentId?`(${c.studentId})`:''}</option>)}
            </select>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Term *</label>
              <select value={form.term} onChange={e=>setForm(f=>({...f,term:e.target.value}))} style={inp}>
                <option value={1}>Term 1 (Jan–Apr)</option>
                <option value={2}>Term 2 (May–Aug)</option>
                <option value={3}>Term 3 (Sep–Dec)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Year *</label>
              <select value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))} style={inp}>
                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. End of Term 1 Results 2026" required style={inp}/>
          </div>

          <div>
            <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Subjects (comma separated, optional)</label>
            <input value={form.subjects} onChange={e=>setForm(f=>({...f,subjects:e.target.value}))} placeholder="e.g. Maths, English, Science, Social Studies" style={inp}/>
          </div>

          {/* File upload */}
          <div>
            <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6, display:'block' }}>Result File * (Image or PDF)</label>
            {filePreview ? (
              <div style={{ position:'relative', borderRadius:12, overflow:'hidden', background:'var(--bg-elevated)', border:'1px solid var(--border)' }}>
                {filePreview === 'pdf' ? (
                  <div style={{ padding:20, textAlign:'center' }}>
                    <div style={{ fontSize:48 }}>📄</div>
                    <div style={{ fontSize:13, color:'var(--text)', marginTop:6 }}>{file?.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{(file?.size/1024).toFixed(0)} KB</div>
                  </div>
                ) : (
                  <img src={filePreview} alt="preview" style={{ width:'100%', maxHeight:200, objectFit:'contain' }}/>
                )}
                <button type="button" onClick={() => { setFile(null); setFilePreview(null); }} style={{ position:'absolute', top:8, right:8, background:'rgba(239,68,68,0.8)', border:'none', color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:14 }}>✕</button>
              </div>
            ) : (
              <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'24px 20px', background:'var(--bg-elevated)', border:'2px dashed var(--border)', borderRadius:12, cursor:'pointer' }}>
                <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} style={{display:'none'}}/>
                <span style={{ fontSize:36 }}>📎</span>
                <span style={{ fontSize:14, color:'var(--text)', fontWeight:500 }}>Tap to select file</span>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>JPG, PNG or PDF · Max 50MB</span>
              </label>
            )}
          </div>

          <UploadBar pct={uploadPct} label={uploadLabel}/>

          <button type="submit" disabled={submitting || !file} style={{ padding:'14px', background: (!file||submitting)?'var(--bg-elevated)':'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:12, color: (!file||submitting)?'var(--text-muted)':'#fff', cursor: (!file||submitting)?'default':'pointer', fontWeight:700, fontSize:15 }}>
            {submitting ? 'Uploading...' : '📤 Upload Result'}
          </button>

          <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>
            🔒 Result will be locked until parent pays the test fee for this term
          </p>
        </form>
      )}

      {/* Search and select child */}
      <div style={{ marginBottom:16, display:'flex', gap:10 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search student..." style={{ ...inp, flex:1 }}/>
      </div>

      {/* Student list with results */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner spinner-dark"/></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text)' }}>No students found</div>
        </div>
      ) : filtered.map(child => (
        <div key={child._id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, marginBottom:10, overflow:'hidden' }}>
          <div
            onClick={() => { setSelectedChild(s => s===child._id ? '' : child._id); loadResults(child._id); }}
            style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
          >
            <div style={{ width:46, height:46, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#D4A843,#F0C86A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#000', flexShrink:0 }}>
              {child.profilePic ? <img src={child.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={e=>e.target.style.display='none'}/> : child.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{child.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>{child.grade}{child.studentId?` · ${child.studentId}`:''}</div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button
                onClick={e => { e.stopPropagation(); setForm(f=>({...f,childId:child._id})); setShowForm(true); }}
                style={{ padding:'6px 12px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:600 }}
              >+ Upload</button>
              <span style={{ fontSize:18, color:'var(--text-muted)' }}>{selectedChild===child._id?'▲':'▼'}</span>
            </div>
          </div>

          {/* Results for this child */}
          {selectedChild === child._id && (
            <div style={{ borderTop:'1px solid var(--border)', padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
              {results.length === 0 ? (
                <p style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', padding:'12px 0' }}>No results uploaded yet</p>
              ) : results.map(result => (
                <div key={result._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:10, border:'1px solid var(--border)' }}>
                  <span style={{ fontSize:24, flexShrink:0 }}>📋</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{result.title}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                      {TERMS[result.term]} {result.year} · {result.isLocked ? '🔒 Locked (fee unpaid)' : '🔓 Accessible'}
                    </div>
                    {result.subjects?.length > 0 && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{result.subjects.join(' · ')}</div>}
                  </div>
                  <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                    {result.fileUrl && (
                      <a href={result.fileUrl} target="_blank" rel="noreferrer" style={{ padding:'5px 10px', background:'rgba(37,211,102,0.1)', border:'1px solid rgba(37,211,102,0.3)', borderRadius:8, color:'#25D366', fontSize:11, fontWeight:600, textDecoration:'none' }}>👁 View</a>
                    )}
                    <button onClick={() => handleDelete(result._id)} style={{ padding:'5px 10px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, color:'#FC8181', cursor:'pointer', fontSize:11 }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
