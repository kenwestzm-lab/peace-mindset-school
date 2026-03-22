import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { compressImage, formatSize } from '../../utils/media';
import toast from 'react-hot-toast';

const genId = () => `PM${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000+Math.random()*9000)}`;

export default function AdminChildren() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [photoUploading, setPhotoUploading] = useState(null);
  const [form, setForm] = useState({
    name:'', grade:'', studentId:genId(), parentEmail:'',
    dob:'', gender:'male', gradeTeacher:'', teacherPhone:''
  });
  const photoRefs = useRef({});

  const load = async () => {
    try { const r = await api.get('/children/admin/all'); setChildren(r.data.children||[]); }
    catch(e) { toast.error('Failed: '+(e.response?.data?.error||e.message)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name||!form.grade) { toast.error('Name and grade required'); return; }
    setSubmitting(true);
    try {
      await api.post('/children/admin/register', form);
      toast.success(`✅ ${form.name} registered! ID: ${form.studentId}`);
      setShowForm(false);
      setForm({ name:'', grade:'', studentId:genId(), parentEmail:'', dob:'', gender:'male', gradeTeacher:'', teacherPhone:'' });
      load();
    } catch(err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setSubmitting(false); }
  };

  const handlePhoto = async (e, childId) => {
    const file = e.target.files[0]; if(!file) return;
    if(!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    setPhotoUploading(childId);
    try {
      const { data, sizeKB } = await compressImage(file, 0.5);
      await api.put(`/profile/child/${childId}/picture`, { childPic: data });
      setChildren(p=>p.map(c=>c._id===childId?{...c,profilePic:data}:c));
      toast.success(`Photo updated (${formatSize(sizeKB)})`);
    } catch(err) { toast.error(err.response?.data?.error||'Upload failed'); }
    finally { setPhotoUploading(null); e.target.value=''; }
  };

  const inp = { padding:'10px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, outline:'none', width:'100%' };
  const lbl = { fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' };

  const filtered = children.filter(c =>
    [c.name,c.grade,c.studentId,c.gradeTeacher].some(v=>v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ padding:'20px 16px 80px', maxWidth:700, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)' }}>🧒 Students ({children.length})</h2>
        <button onClick={()=>setShowForm(!showForm)} style={{ padding:'10px 20px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:12, color:'#fff', cursor:'pointer', fontWeight:600, fontSize:14 }}>
          {showForm?'✕ Cancel':'+ Register Child'}
        </button>
      </div>

      {/* Registration form */}
      {showForm && (
        <form onSubmit={submit} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24, marginBottom:24, display:'flex', flexDirection:'column', gap:14 }}>
          <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:4 }}>📝 Register New Student</h3>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Full Name *</label>
              <input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="Child's full name" required style={inp}/>
            </div>

            <div>
              <label style={lbl}>Grade / Class *</label>
              <input value={form.grade} onChange={e=>f('grade',e.target.value)} placeholder="e.g. Grade 5, Form 2" required style={inp}/>
            </div>

            <div>
              <label style={lbl}>Student ID</label>
              <div style={{ display:'flex', gap:6 }}>
                <input value={form.studentId} onChange={e=>f('studentId',e.target.value)} style={{ ...inp, fontFamily:'monospace' }}/>
                <button type="button" onClick={()=>f('studentId',genId())} style={{ padding:'0 10px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text-muted)', cursor:'pointer', fontSize:16, flexShrink:0 }}>🔄</button>
              </div>
            </div>

            {/* ── GRADE TEACHER SECTION ─────────────────────────────── */}
            <div>
              <label style={lbl}>👨‍🏫 Grade Teacher Name</label>
              <input value={form.gradeTeacher} onChange={e=>f('gradeTeacher',e.target.value)} placeholder="e.g. Mr. Banda" style={inp}/>
            </div>

            <div>
              <label style={lbl}>📞 Teacher Phone Number</label>
              <input value={form.teacherPhone} onChange={e=>f('teacherPhone',e.target.value)} placeholder="e.g. 0976123456" type="tel" style={inp}/>
            </div>
            {/* ───────────────────────────────────────────────────────── */}

            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Parent Email (to link account)</label>
              <input value={form.parentEmail} onChange={e=>f('parentEmail',e.target.value)} placeholder="parent@email.com" type="email" style={inp}/>
            </div>

            <div>
              <label style={lbl}>Date of Birth</label>
              <input value={form.dob} onChange={e=>f('dob',e.target.value)} type="date" style={inp}/>
            </div>

            <div>
              <label style={lbl}>Gender</label>
              <select value={form.gender} onChange={e=>f('gender',e.target.value)} style={inp}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={submitting} style={{ padding:'14px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:12, color:'#fff', cursor:'pointer', fontWeight:700, fontSize:15 }}>
            {submitting?'Registering...':'✓ Register Student'}
          </button>
        </form>
      )}

      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search name, ID, grade, teacher..." style={{ ...inp, marginBottom:14 }}/>

      {/* Students list */}
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner spinner-dark"/></div>
      : filtered.length===0 ? <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🧒</div>
        <div style={{ fontSize:16, fontWeight:600, color:'var(--text)' }}>{search?'No matches found':'No students registered yet'}</div>
      </div>
      : <div>
        <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>{filtered.length} student{filtered.length!==1?'s':''}</p>
        {filtered.map(child=>(
          <div key={child._id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
            {/* Photo */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ width:58, height:58, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#D4A843,#F0C86A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:'#000' }}>
                {child.profilePic
                  ? <img src={child.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={child.name} onError={e=>e.target.style.display='none'}/>
                  : child.name?.[0]?.toUpperCase()}
              </div>
              <button onClick={()=>photoRefs.current[child._id]?.click()} style={{ position:'absolute', bottom:0, right:0, width:22, height:22, borderRadius:'50%', background:'var(--maroon)', border:'2px solid var(--bg-card)', fontSize:10, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {photoUploading===child._id?'⏳':'✏'}
              </button>
            </div>
            <input ref={r=>photoRefs.current[child._id]=r} type="file" accept="image/*" onChange={e=>handlePhoto(e,child._id)} style={{display:'none'}}/>

            {/* Info */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{child.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                <span style={{ color:'var(--gold)', fontWeight:600 }}>{child.grade}</span>
                {child.studentId && <> · <span style={{ fontFamily:'monospace', color:'var(--gold)' }}>{child.studentId}</span></>}
              </div>
              {/* Teacher info */}
              {(child.gradeTeacher||child.teacherPhone) && (
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  {child.gradeTeacher && <span>👨‍🏫 {child.gradeTeacher}</span>}
                  {child.teacherPhone && (
                    <a href={`tel:${child.teacherPhone}`} style={{ color:'#25D366', textDecoration:'none', fontWeight:600 }}>
                      📞 {child.teacherPhone}
                    </a>
                  )}
                </div>
              )}
              {child.parent && (
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                  👤 {child.parent?.name||'Parent linked'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
