import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { compressImage, formatSize } from '../../utils/media';
import toast from 'react-hot-toast';

export default function ParentProfile() {
  const { user, setUser } = useStore();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [childUploading, setChildUploading] = useState(null);
  const picRef = useRef(null);
  const childPicRefs = useRef({});

  useEffect(() => {
    api.get('/children').then(r => setChildren(r.data.children||[])).catch(()=>{});
  }, []);

  const handleProfilePic = async (e) => {
    const f = e.target.files[0]; if(!f) return;
    if(!f.type.startsWith('image/')) { toast.error('Images only'); return; }
    setLoading(true);
    try {
      const { data, sizeKB } = await compressImage(f, 0.5);
      await api.put('/profile/picture', { profilePic: data });
      // Update store
      if (setUser) setUser({ ...user, profilePic: data });
      toast.success(`Profile photo updated (${formatSize(sizeKB)})`);
      // Reload page to reflect
      window.location.reload();
    } catch { toast.error('Upload failed'); }
    finally { setLoading(false); e.target.value=''; }
  };

  const handleChildPic = async (e, childId) => {
    const f = e.target.files[0]; if(!f) return;
    if(!f.type.startsWith('image/')) { toast.error('Images only'); return; }
    setChildUploading(childId);
    try {
      const { data, sizeKB } = await compressImage(f, 0.5);
      await api.put(`/profile/child/${childId}/picture`, { childPic: data });
      setChildren(p => p.map(c => c._id===childId ? {...c, profilePic:data} : c));
      toast.success(`Child photo updated (${formatSize(sizeKB)})`);
    } catch { toast.error('Upload failed'); }
    finally { setChildUploading(null); e.target.value=''; }
  };

  return (
    <div style={{ padding:'20px 16px', maxWidth:560, margin:'0 auto' }}>
      <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:20 }}>My Profile</h2>

      {/* Profile Photo */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24, marginBottom:20, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <div style={{ position:'relative' }}>
          <div style={{ width:100, height:100, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, fontWeight:700, color:'#fff', border:'3px solid var(--border)' }}>
            {user?.profilePic
              ? <img src={user.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="Profile" onError={e=>{e.target.style.display='none';}}/>
              : user?.name?.[0]?.toUpperCase()}
          </div>
          <button onClick={()=>picRef.current?.click()} style={{ position:'absolute', bottom:0, right:0, width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'2px solid var(--bg-card)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:14, color:'#fff' }}>✏</button>
        </div>
        <input ref={picRef} type="file" accept="image/*" onChange={handleProfilePic} style={{display:'none'}} />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>{user?.name}</div>
          <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>{user?.email}</div>
          {user?.phone && <div style={{ fontSize:13, color:'var(--text-muted)' }}>{user.phone}</div>}
        </div>
        <button onClick={()=>picRef.current?.click()} disabled={loading} style={{ padding:'10px 24px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:12, color:'#fff', cursor:'pointer', fontWeight:600, fontSize:14 }}>
          {loading ? 'Uploading...' : '📷 Change Profile Photo'}
        </button>
      </div>

      {/* Children Photos */}
      {children.length > 0 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:16 }}>My Children</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {children.map(child => (
              <div key={child._id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px', background:'var(--bg-elevated)', borderRadius:14 }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#D4A843,#F0C86A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:700, color:'#000', border:'2px solid var(--border)' }}>
                    {child.profilePic
                      ? <img src={child.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={child.name} onError={e=>e.target.style.display='none'}/>
                      : child.name?.[0]?.toUpperCase()}
                  </div>
                  <button onClick={()=>childPicRefs.current[child._id]?.click()} style={{ position:'absolute', bottom:0, right:0, width:22, height:22, borderRadius:'50%', background:'linear-gradient(135deg,#D4A843,#F0C86A)', border:'2px solid var(--bg-card)', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✏</button>
                </div>
                <input ref={r=>childPicRefs.current[child._id]=r} type="file" accept="image/*" onChange={e=>handleChildPic(e,child._id)} style={{display:'none'}} />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:15, color:'var(--text)' }}>{child.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Grade: {child.grade} · ID: {child.studentId||'—'}</div>
                </div>
                <button onClick={()=>childPicRefs.current[child._id]?.click()} disabled={childUploading===child._id} style={{ padding:'7px 14px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text-muted)', cursor:'pointer', fontSize:12 }}>
                  {childUploading===child._id ? 'Uploading...' : '📷 Photo'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
