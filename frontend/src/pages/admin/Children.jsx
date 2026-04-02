
import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const genId = () => `PM${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000+Math.random()*9000)}`;

const GRADES = ['Baby Class','PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7'];

const statusColor = s => ({
  paid:    { bg:'rgba(74,222,128,0.1)',  color:'#4ADE80',  border:'rgba(74,222,128,0.3)'  },
  partial: { bg:'rgba(245,158,11,0.1)', color:'#F59E0B',  border:'rgba(245,158,11,0.3)'  },
  unpaid:  { bg:'rgba(239,68,68,0.1)',  color:'#FC8181',  border:'rgba(239,68,68,0.3)'   },
  expired: { bg:'rgba(156,163,175,0.1)',color:'#9CA3AF', border:'rgba(156,163,175,0.3)' },
}[s] || { bg:'rgba(156,163,175,0.1)',color:'#9CA3AF',border:'rgba(156,163,175,0.3)' });

export default function AdminChildren() {
  const [children,       setChildren]      = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [showForm,       setShowForm]      = useState(false);
  const [submitting,     setSubmitting]    = useState(false);
  const [search,         setSearch]        = useState('');
  const [photoUploading, setPhotoUploading]= useState(null);
  const [editChild,      setEditChild]     = useState(null);
  const [viewChild,      setViewChild]     = useState(null);
  const [filterGrade,    setFilterGrade]   = useState('');
  const [form, setForm] = useState({
    name:'', grade:'', studentId:genId(), parentEmail:'',
    dob:'', gender:'male', gradeTeacher:'', teacherPhone:'',
  });
  const photoRefs = useRef({});
  const fileRef   = useRef(null);

  const load = async () => {
    try {
      const r = await api.get('/children/admin/all');
      setChildren(r.data.children || []);
    } catch(e) { toast.error('Failed: '+(e.response?.data?.error||e.message)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const s = getSocket();
    if (!s) return;
    // Real-time photo updates
    s.on('child_photo_updated', ({ childId, profilePic }) => {
      setChildren(p => p.map(c => c._id === childId ? { ...c, profilePic } : c));
    });
    return () => s.off('child_photo_updated');
  }, []);

  const f = (k,v) => setForm(p => ({...p,[k]:v}));

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

  const saveEdit = async () => {
    if (!editChild) return;
    setSubmitting(true);
    try {
      await api.put(`/children/${editChild._id}`, editChild);
      toast.success('✅ Student updated!');
      setEditChild(null);
      load();
    } catch(err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setSubmitting(false); }
  };

  const handlePhoto = async (e, childId) => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Images only'); return; }
    if (file.size > 8*1024*1024) { toast.error('Max 8MB'); return; }
    setPhotoUploading(childId);
    const tid = toast.loading('Uploading photo to Cloudinary...');
    try {
      // Read as base64
      const b64 = await new Promise((res,rej) => {
        const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsDataURL(file);
      });
      // Upload — server saves to Cloudinary & MongoDB permanently
      const result = await api.put(`/profile/child/${childId}/picture`, { childPic: b64 });
      const picUrl = result.data.childPic;
      // Update local state with Cloudinary URL
      setChildren(p => p.map(c => c._id === childId ? { ...c, profilePic: picUrl } : c));
      toast.success('✅ Photo saved permanently!', { id: tid });
    } catch(err) {
      toast.error(err.response?.data?.error || 'Upload failed', { id: tid });
    } finally {
      setPhotoUploading(null);
      e.target.value = '';
    }
  };

  const inp = { padding:'10px 13px', background:'var(--bg-elevated)', border:'1.5px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' };
  const lbl = { fontSize:11, color:'var(--text-muted)', marginBottom:5, display:'block', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' };

  const filtered = children.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || [c.name,c.grade,c.studentId,c.gradeTeacher,c.parent?.name,c.parent?.phone,c.parent?.email].some(v=>v?.toLowerCase().includes(q));
    const matchGrade = !filterGrade || c.grade === filterGrade;
    return matchSearch && matchGrade;
  });

  const grades = [...new Set(children.map(c=>c.grade).filter(Boolean))].sort();

  return (
    <div style={{ padding:'20px 16px 80px', maxWidth:800, margin:'0 auto' }}>

      {/* ── Header ── */}
      <div style={{ background:'linear-gradient(135deg,#6B0F1A,#9B1826)', borderRadius:16, padding:'18px 20px', marginBottom:20, boxShadow:'0 4px 16px rgba(155,24,38,0.3)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <h2 style={{ fontSize:22, fontWeight:900, color:'#fff', margin:0 }}>🧒 Students ({children.length})</h2>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize:13, margin:'4px 0 0' }}>Manage all registered students</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding:'10px 20px', background:showForm?'rgba(255,255,255,0.15)':'#fff', border:'none', borderRadius:20, color:showForm?'#fff':'#9B1826', fontWeight:800, fontSize:14, cursor:'pointer' }}
          >
            {showForm ? '✕ Cancel' : '+ Register Student'}
          </button>
        </div>
      </div>

      {/* ── Registration Form ── */}
      {showForm && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24, marginBottom:24 }}>
          <h3 style={{ fontSize:16, fontWeight:800, color:'var(--text)', marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
            📝 Register New Student
          </h3>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Full Name *</label>
                <input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="Student's full name" required style={inp}/>
              </div>
              <div>
                <label style={lbl}>Grade / Class *</label>
                <input value={form.grade} onChange={e=>f('grade',e.target.value)} placeholder="e.g. Grade 5" required style={inp} list="grade-list"/>
                <datalist id="grade-list">{GRADES.map(g=><option key={g} value={g}/>)}</datalist>
              </div>
              <div>
                <label style={lbl}>Student ID</label>
                <div style={{ display:'flex', gap:6 }}>
                  <input value={form.studentId} onChange={e=>f('studentId',e.target.value)} style={{ ...inp, fontFamily:'monospace' }}/>
                  <button type="button" onClick={()=>f('studentId',genId())} style={{ padding:'0 12px', background:'var(--bg-elevated)', border:'1.5px solid var(--border)', borderRadius:10, color:'var(--text-muted)', cursor:'pointer', fontSize:16, flexShrink:0 }}>🔄</button>
                </div>
              </div>
              <div>
                <label style={lbl}>👨‍🏫 Class Teacher</label>
                <input value={form.gradeTeacher} onChange={e=>f('gradeTeacher',e.target.value)} placeholder="e.g. Mr. Banda" style={inp}/>
              </div>
              <div>
                <label style={lbl}>📞 Teacher Phone</label>
                <input value={form.teacherPhone} onChange={e=>f('teacherPhone',e.target.value)} placeholder="e.g. 0976123456" type="tel" style={inp}/>
              </div>
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
            <button type="submit" disabled={submitting} style={{ padding:14, background:'linear-gradient(135deg,#9B1826,#C02035)', border:'none', borderRadius:12, color:'#fff', fontWeight:800, fontSize:15, cursor:submitting?'default':'pointer' }}>
              {submitting ? '⏳ Registering...' : '✓ Register Student'}
            </button>
          </form>
        </div>
      )}

      {/* ── Search & Filter ── */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Search name, ID, grade, parent, phone..."
          style={{ ...inp, flex:1, minWidth:200 }}
        />
        <select value={filterGrade} onChange={e=>setFilterGrade(e.target.value)} style={{ ...inp, width:'auto', flexShrink:0 }}>
          <option value="">All Grades</option>
          {grades.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        {[
          { label:'Total', value:children.length, color:'var(--gold)' },
          { label:'Showing', value:filtered.length, color:'#60A5FA' },
          { label:'With Parent', value:children.filter(c=>c.parent).length, color:'#4ADE80' },
          { label:'With Photo', value:children.filter(c=>c.profilePic).length, color:'#A78BFA' },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'8px 14px', display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:16, fontWeight:800, color:s.color }}>{s.value}</span>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Student Cards ── */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><div className="spinner spinner-dark"/></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:52, marginBottom:12 }}>🧒</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{search||filterGrade ? 'No matches found' : 'No students yet'}</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.map((child, idx) => {
            const sc = statusColor(child.paymentStatus);
            return (
              <div key={child._id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
                {/* Card Header */}
                <div style={{ background:'linear-gradient(135deg,rgba(155,24,38,0.12),rgba(155,24,38,0.04))', padding:'14px 16px', display:'flex', alignItems:'center', gap:14, borderBottom:'1px solid var(--border)' }}>
                  {/* Photo */}
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <div style={{ width:60, height:60, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#D4A843,#F0C86A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#000', border:'2.5px solid rgba(212,168,67,0.5)', boxShadow:'0 2px 8px rgba(212,168,67,0.3)' }}>
                      {child.profilePic
                        ? <img src={child.profilePic} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt={child.name} onError={e=>{ e.target.style.display='none'; }}/>
                        : child.name?.[0]?.toUpperCase()
                      }
                    </div>
                    {/* Upload button */}
                    <button
                      onClick={() => photoRefs.current[child._id]?.click()}
                      disabled={photoUploading === child._id}
                      style={{ position:'absolute', bottom:-2, right:-2, width:22, height:22, borderRadius:'50%', background:'linear-gradient(135deg,#9B1826,#C02035)', border:'2px solid var(--bg-card)', fontSize:11, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}
                      title="Update photo"
                    >
                      {photoUploading===child._id ? '⏳' : '📷'}
                    </button>
                    <input ref={r=>photoRefs.current[child._id]=r} type="file" accept="image/*" onChange={e=>handlePhoto(e,child._id)} style={{ display:'none' }}/>
                  </div>

                  {/* Name + Grade */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:800, fontSize:16, color:'var(--text)' }}>{child.name}</span>
                      <span style={{ fontSize:10, fontWeight:700, background:'rgba(212,168,67,0.15)', color:'var(--gold)', border:'1px solid rgba(212,168,67,0.3)', padding:'2px 8px', borderRadius:20 }}>
                        {child.grade}
                      </span>
                      {child.studentId && (
                        <span style={{ fontSize:10, fontFamily:'monospace', fontWeight:700, color:'var(--text-muted)', background:'var(--bg-elevated)', padding:'2px 8px', borderRadius:8 }}>
                          {child.studentId}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                      {child.gender === 'male' ? '👦' : '👧'} {child.dob ? new Date(child.dob).toLocaleDateString('en-ZM',{day:'numeric',month:'short',year:'numeric'}) : 'DOB not set'}
                    </div>
                  </div>

                  {/* Payment status badge */}
                  <span style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:800, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, flexShrink:0, textTransform:'uppercase' }}>
                    {child.paymentStatus||'unpaid'}
                  </span>
                </div>

                {/* Card Body — Details Grid */}
                <div style={{ padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 20px' }}>
                  {/* Teacher */}
                  <div style={{ borderBottom:'1px solid var(--border)', paddingBottom:8 }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>👨‍🏫 Class Teacher</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{child.gradeTeacher||'—'}</div>
                    {child.teacherPhone && (
                      <a href={`tel:${child.teacherPhone}`} style={{ fontSize:12, color:'#25D366', textDecoration:'none', fontWeight:600 }}>📞 {child.teacherPhone}</a>
                    )}
                  </div>

                  {/* Parent */}
                  <div style={{ borderBottom:'1px solid var(--border)', paddingBottom:8 }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>👤 Parent</div>
                    {child.parent ? (
                      <>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{child.parent.name}</div>
                        {child.parent.phone && (
                          <a href={`tel:${child.parent.phone}`} style={{ fontSize:12, color:'#25D366', textDecoration:'none', fontWeight:600 }}>📞 {child.parent.phone}</a>
                        )}
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{child.parent.email}</div>
                      </>
                    ) : (
                      <div style={{ fontSize:12, color:'#FC8181' }}>⚠️ No parent linked</div>
                    )}
                  </div>

                  {/* Balance */}
                  <div style={{ borderBottom:'1px solid var(--border)', paddingBottom:8 }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>💰 Balance</div>
                    <div style={{ fontSize:15, fontWeight:800, color: (child.balance||0) > 0 ? '#F59E0B' : '#4ADE80' }}>
                      {(child.balance||0) > 0 ? `ZMW ${child.balance.toFixed(2)} owed` : 'Settled ✓'}
                    </div>
                  </div>

                  {/* Registered date */}
                  <div style={{ borderBottom:'1px solid var(--border)', paddingBottom:8 }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>📅 Registered</div>
                    <div style={{ fontSize:13, color:'var(--text)' }}>{new Date(child.createdAt).toLocaleDateString('en-ZM',{day:'numeric',month:'short',year:'numeric'})}</div>
                  </div>
                </div>

                {/* Card Footer — Actions */}
                <div style={{ padding:'10px 16px', background:'rgba(0,0,0,0.03)', borderTop:'1px solid var(--border)', display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button
                    onClick={() => setEditChild({ ...child })}
                    style={{ padding:'7px 16px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:20, color:'var(--text)', fontSize:12, fontWeight:700, cursor:'pointer' }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setViewChild(child)}
                    style={{ padding:'7px 16px', background:'rgba(96,165,250,0.1)', border:'1px solid rgba(96,165,250,0.3)', borderRadius:20, color:'#60A5FA', fontSize:12, fontWeight:700, cursor:'pointer' }}
                  >
                    👁 View Details
                  </button>
                  <button
                    onClick={() => photoRefs.current[child._id]?.click()}
                    style={{ padding:'7px 16px', background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.3)', borderRadius:20, color:'#A78BFA', fontSize:12, fontWeight:700, cursor:'pointer' }}
                  >
                    📷 Update Photo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editChild && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9000, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={() => setEditChild(null)}>
          <div style={{ background:'var(--bg-card)', borderRadius:'20px 20px 0 0', padding:24, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h3 style={{ color:'var(--text)', fontWeight:800, fontSize:17 }}>✏️ Edit {editChild.name}</h3>
              <button onClick={()=>setEditChild(null)} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:22, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                ['Full Name','name','text'],
                ['Grade','grade','text'],
                ['Student ID','studentId','text'],
                ['Class Teacher','gradeTeacher','text'],
                ['Teacher Phone','teacherPhone','tel'],
              ].map(([label, key, type]) => (
                <div key={key}>
                  <label style={lbl}>{label}</label>
                  <input style={inp} type={type} value={editChild[key]||''} onChange={e=>setEditChild(ec=>({...ec,[key]:e.target.value}))}/>
                </div>
              ))}
              <div>
                <label style={lbl}>Date of Birth</label>
                <input style={inp} type="date" value={editChild.dob ? new Date(editChild.dob).toISOString().split('T')[0] : ''} onChange={e=>setEditChild(ec=>({...ec,dob:e.target.value}))}/>
              </div>
              <div>
                <label style={lbl}>Gender</label>
                <select style={inp} value={editChild.gender||'male'} onChange={e=>setEditChild(ec=>({...ec,gender:e.target.value}))}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <button onClick={saveEdit} disabled={submitting} style={{ padding:14, background:'linear-gradient(135deg,#9B1826,#C02035)', border:'none', borderRadius:12, color:'#fff', fontWeight:800, fontSize:15, cursor:'pointer', marginTop:6 }}>
                {submitting ? '⏳ Saving...' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {viewChild && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={()=>setViewChild(null)}>
          <div style={{ background:'var(--bg-card)', borderRadius:20, padding:24, width:'100%', maxWidth:420, maxHeight:'88vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            {/* Student photo + name */}
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ width:90, height:90, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#D4A843,#F0C86A)', margin:'0 auto 12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, fontWeight:800, border:'3px solid rgba(212,168,67,0.5)', boxShadow:'0 4px 16px rgba(212,168,67,0.3)' }}>
                {viewChild.profilePic
                  ? <img src={viewChild.profilePic} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
                  : viewChild.name?.[0]?.toUpperCase()
                }
              </div>
              <h2 style={{ fontSize:20, fontWeight:900, color:'var(--text)', margin:0 }}>{viewChild.name}</h2>
              <div style={{ fontSize:13, color:'var(--gold)', fontWeight:700, marginTop:4 }}>{viewChild.grade}</div>
              {viewChild.studentId && <div style={{ fontSize:12, fontFamily:'monospace', color:'var(--text-muted)', marginTop:2 }}>{viewChild.studentId}</div>}
            </div>

            {/* Details list */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                ['👤 Parent', viewChild.parent?.name || 'Not linked'],
                ['📞 Parent Phone', viewChild.parent?.phone || '—'],
                ['📧 Parent Email', viewChild.parent?.email || '—'],
                ['👨‍🏫 Class Teacher', viewChild.gradeTeacher || '—'],
                ['📞 Teacher Phone', viewChild.teacherPhone || '—'],
                ['🎂 Date of Birth', viewChild.dob ? new Date(viewChild.dob).toLocaleDateString('en-ZM',{day:'numeric',month:'long',year:'numeric'}) : '—'],
                ['⚧ Gender', viewChild.gender || '—'],
                ['💳 Payment Status', viewChild.paymentStatus || 'unpaid'],
                ['📅 Registered', new Date(viewChild.createdAt).toLocaleDateString('en-ZM',{day:'numeric',month:'long',year:'numeric'})],
              ].map(([label, value]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'9px 12px', background:'var(--bg-elevated)', borderRadius:10, gap:10 }}>
                  <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, flexShrink:0 }}>{label}</span>
                  <span style={{ fontSize:13, color:'var(--text)', fontWeight:700, textAlign:'right', wordBreak:'break-all' }}>{value}</span>
                </div>
              ))}
            </div>

            <button onClick={()=>setViewChild(null)} style={{ marginTop:18, width:'100%', padding:13, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:12, color:'var(--text)', fontWeight:700, fontSize:14, cursor:'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
