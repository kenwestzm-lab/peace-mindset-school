import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { compressImage, formatSize } from '../../utils/media';
import toast from 'react-hot-toast';

function generateStudentId() {
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PM${year}${rand}`;
}

export default function AdminChildren() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', grade:'', studentId: generateStudentId(), parentEmail:'', dob:'', gender:'male', gradeTeacher:'', teacherPhone:'' });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [childPhotoUploading, setChildPhotoUploading] = useState(null);
  const photoRefs = useRef({});

  const load = async () => {
    try { const r = await api.get('/children/admin/all'); setChildren(r.data.children||[]); }
    catch { toast.error('Failed to load children'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.grade) { toast.error('Name and grade are required'); return; }
    setSubmitting(true);
    try {
      await api.post('/children/admin/register', form);
      toast.success(`Child registered! ID: ${form.studentId}`);
      setShowForm(false);
      setForm({ name:'', grade:'', studentId: generateStudentId(), parentEmail:'', dob:'', gender:'male' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Registration failed'); }
    finally { setSubmitting(false); }
  };

  const handleChildPhoto = async (e, childId) => {
    const f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Images only'); return; }
    setChildPhotoUploading(childId);
    try {
      const { data, sizeKB } = await compressImage(f, 0.5);
      await api.put(`/profile/child/${childId}/picture`, { childPic: data });
      setChildren(p => p.map(c => c._id===childId ? {...c, profilePic:data} : c));
      toast.success(`Photo updated (${formatSize(sizeKB)})`);
    } catch { toast.error('Upload failed'); }
    finally { setChildPhotoUploading(null); e.target.value=''; }
  };

  const filtered = children.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.studentId?.toLowerCase().includes(search.toLowerCase()) ||
    c.grade?.toLowerCase().includes(search.toLowerCase())
  );

  const cardStyle = {
    background:'var(--bg-card)', border:'1px solid var(--border)',
    borderRadius:16, padding:18, display:'flex', alignItems:'center', gap:14,
  };

  return (
    <div style={{ padding:'20px 16px', maxWidth:700, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)' }}>🧒 Manage Children</h2>
        <button onClick={()=>setShowForm(!showForm)} style={{ padding:'10px 20px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:12, color:'#fff', cursor:'pointer', fontWeight:600, fontSize:14 }}>
          {showForm ? '✕ Cancel' : '+ Register Child'}
        </button>
      </div>

      {/* Register Form */}
      {showForm && (
        <form onSubmit={submit} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24, marginBottom:24, display:'flex', flexDirection:'column', gap:14 }}>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Register New Student</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Full Name *</label>
              <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Child's full name" required style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Grade / Class *</label>
              <input value={form.grade} onChange={e=>setForm(p=>({...p,grade:e.target.value}))} placeholder="e.g. Grade 5, Form 2" required style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Student ID (auto-generated)</label>
              <div style={{ display:'flex', gap:8 }}>
                <input value={form.studentId} onChange={e=>setForm(p=>({...p,studentId:e.target.value}))} style={inputStyle} />
                <button type="button" onClick={()=>setForm(p=>({...p,studentId:generateStudentId()}))} style={{ padding:'0 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text-muted)', cursor:'pointer', fontSize:12, whiteSpace:'nowrap' }}>🔄</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Parent Email</label>
              <input value={form.parentEmail} onChange={e=>setForm(p=>({...p,parentEmail:e.target.value}))} placeholder="parent@email.com" type="email" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Date of Birth</label>
              <input value={form.dob} onChange={e=>setForm(p=>({...p,dob:e.target.value}))} type="date" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Gender</label>
              <select value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))} style={inputStyle}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={submitting} style={{ padding:'13px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:12, color:'#fff', cursor:'pointer', fontWeight:700, fontSize:15 }}>
            {submitting ? 'Registering...' : '✓ Register Student'}
          </button>
        </form>
      )}

      {/* Search */}
      <div style={{ marginBottom:16 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by name, ID, or grade..." style={{ ...inputStyle, width:'100%' }} />
      </div>

      {/* Children list */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner spinner-dark" /></div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🧒</div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text)' }}>{search ? 'No matches found' : 'No children registered yet'}</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>{filtered.length} student{filtered.length!==1?'s':''}</p>
          {filtered.map(child => (
            <div key={child._id} style={cardStyle}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width:58, height:58, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#D4A843,#F0C86A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:'#000' }}>
                  {child.profilePic
                    ? <img src={child.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={child.name} onError={e=>e.target.style.display='none'}/>
                    : child.name?.[0]?.toUpperCase()}
                </div>
                <button onClick={()=>photoRefs.current[child._id]?.click()} style={{ position:'absolute', bottom:0, right:0, width:22, height:22, borderRadius:'50%', background:'var(--maroon)', border:'2px solid var(--bg-card)', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>✏</button>
              </div>
              <input ref={r=>photoRefs.current[child._id]=r} type="file" accept="image/*" onChange={e=>handleChildPhoto(e,child._id)} style={{display:'none'}} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{child.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                  Grade: <span style={{color:'var(--gold)'}}>{child.grade}</span>
                  {child.studentId && <> · ID: <span style={{color:'var(--gold)',fontFamily:'monospace'}}>{child.studentId}</span></>}
                </div>
                {child.parent && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>👤 {child.parent?.name||'No parent linked'}</div>}
              </div>
              {childPhotoUploading===child._id && <div style={{ fontSize:11, color:'#25D366' }}>Uploading...</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle = { padding:'10px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, outline:'none', width:'100%' };
