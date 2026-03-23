import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

export default function ParentDashboard() {
  const { user } = useStore();
  const [data, setData] = useState({ children:[], announcements:[], payments:[], events:[], fees:{ schoolFeeMonthly:150 } });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [c, a, p, cal] = await Promise.all([
        api.get('/children'),
        api.get('/announcements'),
        api.get('/payments/my').catch(()=>({ data:{ payments:[] } })),
        api.get('/calendar/upcoming').catch(()=>({ data:{ events:[] } })),
      ]);
      setData({
        children: c.data.children || [],
        announcements: a.data.announcements || [],
        payments: p.data.payments || [],
        events: cal.data.events || [],
      });
    } catch (err) { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const s = getSocket();
    if (s) {
      s.on('payment_approved', load);
      s.on('payment_rejected', load);
      s.on('new_announcement', load);
      s.on('child_registered', load);
      s.on('payment_expired', load);
    }
    return () => { s?.off('payment_approved'); s?.off('payment_rejected'); s?.off('new_announcement'); s?.off('child_registered'); s?.off('payment_expired'); };
  }, []);

  const pendingPayments = data.payments.filter(p => p.status === 'pending').length;
  const approvedPayments = data.payments.filter(p => p.status === 'approved' && !p.isExpired).length;

  const card = (icon, label, value, color, to) => (
    <Link to={to} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 14px', textDecoration:'none', display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ fontSize:24 }}>{icon}</div>
      <div style={{ fontSize:22, fontWeight:700, color }}>{value}</div>
      <div style={{ fontSize:12, color:'var(--text-muted)' }}>{label}</div>
    </Link>
  );

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}><div className="spinner spinner-dark"/></div>;

  return (
    <div style={{ padding:'20px 16px 80px', maxWidth:700, margin:'0 auto' }}>

      {/* Welcome */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22 }}>
        <div style={{ width:52, height:52, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'#fff' }}>
          {user?.profilePic
            ? <img src={user.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={e=>e.target.style.display='none'}/>
            : user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>Welcome, {user?.name?.split(' ')[0]}!</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>Peace Mindset School Parent</div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:22 }}>
        {card('🧒', 'My Children', data.children.length, 'var(--gold)', '/parent/children')}
        {card('💳', 'Active Payments', approvedPayments, '#4ADE80', '/parent/payments')}
        {card('⏳', 'Pending', pendingPayments, '#F59E0B', '/parent/payments')}
        {card('📋', 'Results', 'View', 'var(--maroon-light)', '/parent/results')}
      </div>

      {/* Children with teacher info */}
      {data.children.length > 0 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, marginBottom:18, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>My Children</h3>
            <Link to="/parent/children" style={{ fontSize:12, color:'var(--maroon-light)', textDecoration:'none' }}>View all</Link>
          </div>
          {data.children.map(child => (
            <div key={child._id} style={{ padding:'13px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:13 }}>
              {/* Profile pic */}
              <div style={{ width:46, height:46, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#D4A843,#F0C86A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#000', flexShrink:0 }}>
                {child.profilePic
                  ? <img src={child.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={child.name} onError={e=>e.target.style.display='none'}/>
                  : child.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, color:'var(--text)', fontSize:14 }}>{child.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>
                  {child.grade}
                  {child.studentId && <> · <span style={{fontFamily:'monospace'}}>{child.studentId}</span></>}
                </div>
                {/* ── Teacher info with clickable phone ── */}
                {(child.gradeTeacher || child.teacherPhone) && (
                  <div style={{ fontSize:12, marginTop:3, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    {child.gradeTeacher && (
                      <span style={{ color:'var(--text-muted)' }}>👨‍🏫 {child.gradeTeacher}</span>
                    )}
                    {child.teacherPhone && (
                      <a href={`tel:${child.teacherPhone}`} style={{ color:'#25D366', textDecoration:'none', fontWeight:600 }}>
                        📞 {child.teacherPhone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Announcements */}
      {data.announcements.length > 0 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, marginBottom:18, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>📢 Announcements</h3>
          </div>
          {data.announcements.slice(0,3).map(a => (
            <div key={a._id} style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', marginBottom:3 }}>{a.title}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>{a.content?.substring(0,100)}{a.content?.length>100?'...':''}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{new Date(a.createdAt).toLocaleDateString('en-ZM',{day:'numeric',month:'short',year:'numeric'})}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent payments */}
      {data.payments.length > 0 && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>💳 Recent Payments</h3>
            <Link to="/parent/payments" style={{ fontSize:12, color:'var(--maroon-light)', textDecoration:'none' }}>View all</Link>
          </div>
          {data.payments.slice(0,3).map(p => (
            <div key={p._id} style={{ padding:'11px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>💳</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.paymentType?.replace(/_/g,' ')}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>ZMW {p.amount?.toFixed(2)}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:999,
                background: p.status==='approved'?'rgba(74,222,128,0.1)':p.status==='rejected'?'rgba(239,68,68,0.1)':'rgba(245,158,11,0.1)',
                color: p.status==='approved'?'#4ADE80':p.status==='rejected'?'#FC8181':'#F59E0B'
              }}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
