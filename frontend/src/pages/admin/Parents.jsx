import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminParents() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);

  const load = async () => {
    try {
      const r = await api.get('/admin/parents');
      setParents(r.data.parents || []);
    } catch (err) { toast.error('Failed to load parents'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (parent) => {
    const confirmed = window.confirm(`Delete ${parent.name}'s account?\n\nThis will permanently remove their account and deactivate their children. This cannot be undone.`);
    if (!confirmed) return;
    setDeleting(parent._id);
    try {
      await api.delete(`/admin/parents/${parent._id}`);
      setParents(p => p.filter(x => x._id !== parent._id));
      toast.success(`✅ ${parent.name}'s account deleted`);
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
    finally { setDeleting(null); }
  };

  const handleToggle = async (parent) => {
    setToggling(parent._id);
    try {
      const endpoint = parent.isActive ? 'deactivate' : 'activate';
      await api.put(`/admin/parents/${parent._id}/${endpoint}`);
      setParents(p => p.map(x => x._id === parent._id ? { ...x, isActive: !x.isActive } : x));
      toast.success(`${parent.name} ${parent.isActive ? 'deactivated' : 'activated'}`);
    } catch (err) { toast.error('Failed'); }
    finally { setToggling(null); }
  };

  const filtered = parents.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search)
  );

  const inp = { padding:'10px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, outline:'none', width:'100%' };

  return (
    <div style={{ padding:'20px 16px 80px', maxWidth:700, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)' }}>👨‍👩‍👦 Parents ({parents.length})</h2>
      </div>

      <div style={{ marginBottom:16 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search name, email or phone..." style={inp}/>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner spinner-dark"/></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>👨‍👩‍👦</div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text)' }}>{search ? 'No matches' : 'No parents registered'}</div>
        </div>
      ) : filtered.map(parent => (
        <div key={parent._id} style={{ background:'var(--bg-card)', border:`1px solid ${parent.isActive ? 'var(--border)' : 'rgba(239,68,68,0.3)'}`, borderRadius:14, padding:'14px 16px', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {/* Avatar */}
            <div style={{ width:50, height:50, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'#fff', flexShrink:0 }}>
              {parent.profilePic
                ? <img src={parent.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={e=>e.target.style.display='none'}/>
                : parent.name?.[0]?.toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                <span style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{parent.name}</span>
                {!parent.isActive && <span style={{ fontSize:10, background:'rgba(239,68,68,0.15)', color:'#FC8181', borderRadius:999, padding:'1px 7px', fontWeight:600 }}>INACTIVE</span>}
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>{parent.email}</div>
              {parent.phone && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>📞 {parent.phone}</div>}
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
                🧒 {parent.childCount || 0} child{parent.childCount!==1?'ren':''}
                {parent.pendingPayments > 0 && <span style={{ color:'#F59E0B', marginLeft:8 }}>⚠️ {parent.pendingPayments} pending payment{parent.pendingPayments!==1?'s':''}</span>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
              <button
                onClick={() => handleToggle(parent)}
                disabled={toggling === parent._id}
                style={{ padding:'6px 12px', background: parent.isActive ? 'rgba(245,158,11,0.1)' : 'rgba(74,222,128,0.1)', border:`1px solid ${parent.isActive?'rgba(245,158,11,0.3)':'rgba(74,222,128,0.3)'}`, borderRadius:8, color: parent.isActive ? '#F59E0B' : '#4ADE80', cursor:'pointer', fontSize:11, fontWeight:600 }}
              >
                {toggling===parent._id ? '...' : parent.isActive ? '🚫 Deactivate' : '✅ Activate'}
              </button>
              <button
                onClick={() => handleDelete(parent)}
                disabled={deleting === parent._id}
                style={{ padding:'6px 12px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, color:'#FC8181', cursor:'pointer', fontSize:11, fontWeight:600 }}
              >
                {deleting===parent._id ? '...' : '🗑 Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
