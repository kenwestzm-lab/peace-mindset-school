import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { compressImage, formatSize } from '../utils/media';
import { uploadBase64 } from '../utils/mediaUpload';
import toast from 'react-hot-toast';

export default function ProfileSettings() {
  const { user, logout } = useStore();
  const [form, setForm] = useState({ name:'', email:'', phone:'', currentPassword:'', newPassword:'', confirmPassword:'' });
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picLoading, setPicLoading] = useState(false);
  const [childUploading, setChildUploading] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const picRef = useRef(null);
  const childPicRefs = useRef({});

  useEffect(() => {
    setForm(f=>({ ...f, name:user?.name||'', email:user?.email||'', phone:user?.phone||'' }));
    setProfilePic(user?.profilePic||null);
    if (user?.role==='parent') {
      api.get('/children').then(r=>setChildren(r.data.children||[])).catch(()=>{});
    }
  }, [user]);

  const handleUpdate = async e => {
    e.preventDefault();
    if (form.newPassword && form.newPassword !== form.confirmPassword) { toast.error('New passwords do not match'); return; }
    if (form.newPassword && form.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone };
      if (form.newPassword) { payload.currentPassword = form.currentPassword; payload.newPassword = form.newPassword; }
      const r = await api.put('/profile/update', payload);
      // Update store
      if (window.__store_set_user) window.__store_set_user(r.data.user);
      toast.success('✅ Profile updated successfully!');
      setForm(f=>({ ...f, currentPassword:'', newPassword:'', confirmPassword:'' }));
    } catch(err) { toast.error(err.response?.data?.error||'Update failed'); }
    finally { setLoading(false); }
  };

  const handleProfilePic = async e => {
    const f = e.target.files[0]; if(!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Images only'); return; }
    setPicLoading(true);
    try {
      const { data, sizeKB } = await compressImage(f, 0.5);
      // Upload to Cloudinary via backend
      const result = await uploadBase64(data, 'image/jpeg', 'peace-mindset/profiles');
      await api.put('/profile/picture', { profilePic: result.url });
      setProfilePic(result.url);
      toast.success(`✅ Profile photo updated!`);
    } catch(err) { toast.error(err.response?.data?.error||'Upload failed'); }
    finally { setPicLoading(false); e.target.value=''; }
  };

  const handleChildPic = async (e, childId) => {
    const f = e.target.files[0]; if(!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Images only'); return; }
    setChildUploading(childId);
    try {
      const { data } = await compressImage(f, 0.5);
      const result = await uploadBase64(data, 'image/jpeg', 'peace-mindset/children');
      await api.put(`/profile/child/${childId}/picture`, { childPic: result.url });
      setChildren(p=>p.map(c=>c._id===childId?{...c,profilePic:result.url}:c));
      toast.success('✅ Child photo updated!');
    } catch(err) { toast.error(err.response?.data?.error||'Upload failed'); }
    finally { setChildUploading(null); e.target.value=''; }
  };

  const inp = { padding:'11px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:12, color:'var(--text)', fontSize:14, outline:'none', width:'100%' };
  const lbl = { fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' };

  return (
    <div style={{ padding:'20px 16px 80px', maxWidth:560, margin:'0 auto' }}>
      <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:20 }}>⚙️ Profile Settings</h2>

      {/* Profile photo */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24, marginBottom:20, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <div style={{ position:'relative' }}>
          <div style={{ width:100, height:100, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, fontWeight:700, color:'#fff', border:'3px solid var(--border)' }}>
            {profilePic ? <img src={profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="Profile" onError={e=>{e.target.style.display='none';}} /> : user?.name?.[0]?.toUpperCase()}
          </div>
          <button onClick={()=>picRef.current?.click()} disabled={picLoading} style={{ position:'absolute', bottom:0, right:0, width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'2px solid var(--bg-card)', cursor:'pointer', fontSize:14, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {picLoading?'⏳':'✏'}
          </button>
        </div>
        <input ref={picRef} type="file" accept="image/*" onChange={handleProfilePic} style={{display:'none'}}/>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>{user?.name}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>{user?.role}</div>
        </div>
        <button onClick={()=>picRef.current?.click()} disabled={picLoading} style={{ padding:'10px 24px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:12, color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}>
          {picLoading?'Uploading...':'📷 Change Profile Photo'}
        </button>
      </div>

      {/* Update details form */}
      <form onSubmit={handleUpdate}>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24, marginBottom:20, display:'flex', flexDirection:'column', gap:14 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Personal Information</h3>

          <div><label style={lbl}>Full Name</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Your full name" style={inp}/></div>
          <div><label style={lbl}>Email Address</label>
            <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="your@email.com" style={inp}/></div>
          <div><label style={lbl}>Phone Number</label>
            <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="e.g. 0976123456" style={inp}/></div>
        </div>

        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24, marginBottom:20, display:'flex', flexDirection:'column', gap:14 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Change Password</h3>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:-8 }}>Leave blank to keep your current password</p>

          <div><label style={lbl}>Current Password</label>
            <input type="password" value={form.currentPassword} onChange={e=>setForm(f=>({...f,currentPassword:e.target.value}))} placeholder="Enter current password" style={inp}/></div>
          <div><label style={lbl}>New Password</label>
            <input type="password" value={form.newPassword} onChange={e=>setForm(f=>({...f,newPassword:e.target.value}))} placeholder="Min 6 characters" style={inp}/></div>
          <div><label style={lbl}>Confirm New Password</label>
            <input type="password" value={form.confirmPassword} onChange={e=>setForm(f=>({...f,confirmPassword:e.target.value}))} placeholder="Repeat new password" style={inp}/></div>
        </div>

        <button type="submit" disabled={loading} style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:14, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', marginBottom:20 }}>
          {loading?'Saving...':'✓ Save Changes'}
        </button>
      </form>

      {/* Children photos (parents only) */}
      {children.length>0 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:16 }}>My Children</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {children.map(child=>(
              <div key={child._id} style={{ display:'flex', alignItems:'center', gap:14, padding:14, background:'var(--bg-elevated)', borderRadius:14 }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{ width:60, height:60, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#D4A843,#F0C86A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:'#000', border:'2px solid var(--border)' }}>
                    {child.profilePic ? <img src={child.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={child.name} onError={e=>e.target.style.display='none'}/> : child.name?.[0]?.toUpperCase()}
                  </div>
                  <button onClick={()=>childPicRefs.current[child._id]?.click()} style={{ position:'absolute', bottom:0, right:0, width:22, height:22, borderRadius:'50%', background:'var(--maroon)', border:'2px solid var(--bg-card)', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>✏</button>
                </div>
                <input ref={r=>childPicRefs.current[child._id]=r} type="file" accept="image/*" onChange={e=>handleChildPic(e,child._id)} style={{display:'none'}}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:'var(--text)' }}>{child.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Grade {child.grade}{child.studentId?` · ID: ${child.studentId}`:''}</div>
                </div>
                <button onClick={()=>childPicRefs.current[child._id]?.click()} disabled={childUploading===child._id} style={{ padding:'7px 12px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text-muted)', cursor:'pointer', fontSize:12 }}>
                  {childUploading===child._id?'Uploading...':'📷'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
