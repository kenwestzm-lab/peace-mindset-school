import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const [tab, setTab] = useState('overview');
  const [searchStudent, setSearchStudent] = useState('');

  const load = async () => {
    try {
      const [dash, stud] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/students'),
      ]);
      setStats(dash.data.stats);
      setRecentPayments(dash.data.recentPayments);
      setStudents(stud.data.students);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    if (socket) {
      socket.on('new_payment', () => { toast('💳 New payment submitted!', { icon:'🔔' }); load(); });
    }
    return () => getSocket()?.off('new_payment');
  }, []);

  const approve = async (id) => {
    setApproving(id);
    try {
      await api.put(`/payments/${id}/approve`);
      toast.success('Payment approved ✅');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setApproving(null); }
  };

  const reject = async (id) => {
    if (!confirm('Reject this payment?')) return;
    try {
      await api.put(`/payments/${id}/reject`, { reason:'Could not verify payment.' });
      toast.success('Payment rejected');
      load();
    } catch { toast.error('Failed'); }
  };

  const sendReminders = async () => {
    try {
      const r = await api.post('/admin/send-reminders');
      toast.success(r.data.message);
    } catch { toast.error('Failed to send reminders'); }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark" />
    </div>
  );

  const pendingPayments = recentPayments.filter(p=>p.status==='pending');
  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.grade?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.parent?.name?.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const paymentTypeLabel = { school_fee_monthly:'Monthly', school_fee_term:'Term', test_fee:'Test', event_fee:'Event' };

  return (
    <div>
      {/* Hero */}
      <div style={{
        background:'linear-gradient(135deg, rgba(155,24,38,0.3) 0%, rgba(155,24,38,0.1) 60%, transparent 100%)',
        borderRadius:20, padding:'20px 22px', marginBottom:20,
        border:'1px solid var(--border-bright)', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,168,67,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontFamily:'var(--font-title)', fontSize:9.5, letterSpacing:'0.2em', color:'var(--gold)', textTransform:'uppercase', marginBottom:4, opacity:0.8 }}>Admin Panel</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:26, color:'var(--text)', fontWeight:700 }}>Peace Mindset</h2>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Private School Management</p>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <button className="btn btn-gold btn-sm" onClick={sendReminders}>🔔 Send Reminders</button>
            <Link to="/admin/calendar" className="btn btn-secondary btn-sm">📅 Calendar</Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:20 }}>
        {[
          { icon:'👪', label:'Parents', value:stats?.totalParents||0, color:'var(--blue)', bg:'var(--blue-bg)', border:'var(--blue-border)', to:'/admin/parents' },
          { icon:'🧒', label:'Students', value:stats?.totalChildren||0, color:'var(--maroon-light)', bg:'var(--maroon-pale)', border:'rgba(155,24,38,0.3)', to:'/admin/children' },
          { icon:'⏳', label:'Pending', value:stats?.pendingPayments||0, color:'var(--orange)', bg:'var(--orange-bg)', border:'var(--orange-border)', to:'/admin/payments' },
          { icon:'💰', label:'Revenue', value:`ZMW ${(stats?.totalRevenue||0).toLocaleString()}`, color:'var(--green)', bg:'var(--green-bg)', border:'var(--green-border)', to:'/admin/payments' },
        ].map((s,i) => (
          <Link key={i} to={s.to} style={{ textDecoration:'none' }}>
            <div style={{
              background:'var(--bg-card)', borderRadius:14, padding:'16px 18px',
              border:`1px solid ${s.border}`, transition:'all 0.18s',
              display:'flex', alignItems:'center', gap:12,
            }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.4)`; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
            >
              <div style={{ width:44, height:44, borderRadius:12, background:s.bg, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>{s.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { to:'/admin/children', icon:'🧒', label:'Students' },
          { to:'/admin/payments', icon:'💳', label:'Payments' },
          { to:'/admin/announcements', icon:'📢', label:'Announce' },
          { to:'/admin/chat', icon:'💬', label:'Chat' },
        ].map((a,i) => (
          <Link key={i} to={a.to} style={{
            background:'var(--bg-card)', borderRadius:14, padding:'14px 8px',
            textAlign:'center', border:'1px solid var(--border)',
            textDecoration:'none', transition:'all 0.15s',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--maroon-light)'; e.currentTarget.style.background='var(--bg-elevated)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg-card)'; }}
          >
            <div style={{ fontSize:24, marginBottom:5 }}>{a.icon}</div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{a.label}</div>
          </Link>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[
          { key:'overview', label:'Payments' },
          { key:'students', label:'Student List (Excel)' },
        ].map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            padding:'8px 18px', borderRadius:10, border:'1px solid var(--border)',
            background:tab===t.key?'var(--maroon)':'var(--bg-card)',
            color:tab===t.key?'#fff':'var(--text-muted)',
            fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s',
            boxShadow:tab===t.key?'0 0 12px var(--maroon-glow)':'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Pending payments */}
      {tab==='overview' && (
        <>
          {pendingPayments.length > 0 && (
            <div className="card" style={{ marginBottom:16, borderColor:'var(--orange-border)' }}>
              <div className="card-header" style={{ background:'var(--orange-bg)' }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--orange)' }}>
                  ⚠️ Awaiting Approval ({pendingPayments.length})
                </h3>
                <Link to="/admin/payments" style={{ fontSize:12.5, color:'var(--orange)', fontWeight:600 }}>View all →</Link>
              </div>
              {pendingPayments.map(p => (
                <div key={p._id} style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>
                        {p.child?.name} <span style={{ color:'var(--text-muted)', fontWeight:400 }}>· {p.child?.grade}</span>
                      </div>
                      <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:2 }}>
                        {p.parent?.name} · {paymentTypeLabel[p.paymentType]||p.paymentType}
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--gold)', marginTop:3 }}>
                        ZMW {p.amount}
                        <span style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)', marginLeft:8 }}>via {p.mobileMoneyProvider}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                      <button className="btn btn-success btn-sm" onClick={()=>approve(p._id)} disabled={approving===p._id} style={{ fontSize:12 }}>
                        {approving===p._id ? <span className="spinner" style={{ width:12, height:12 }} /> : '✓ Approve'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={()=>reject(p._id)} style={{ fontSize:12 }}>✗ Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>💳 Recent Payments</h3>
              <Link to="/admin/payments" style={{ fontSize:12.5, color:'var(--gold)', fontWeight:600 }}>View all →</Link>
            </div>
            {recentPayments.filter(p=>p.status!=='pending').length===0 ? (
              <div style={{ padding:'28px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>💳</div>No payments yet
              </div>
            ) : recentPayments.filter(p=>p.status!=='pending').slice(0,6).map(p => (
              <div key={p._id} style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text)' }}>{p.child?.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>
                    {p.parent?.name} · ZMW {p.amount} · {new Date(p.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                  </div>
                </div>
                <span className={`badge ${p.status==='approved'?'badge-success':'badge-danger'}`}>
                  {p.status==='approved'?'✓ Paid':'✗ Rejected'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Excel-style student table */}
      {tab==='students' && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>📊 Student List</h3>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <input
                className="form-input" placeholder="Search students..."
                value={searchStudent} onChange={e=>setSearchStudent(e.target.value)}
                style={{ width:200, padding:'7px 12px' }}
              />
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>{filteredStudents.length} students</span>
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--bg-elevated)', borderBottom:'1px solid var(--border)' }}>
                  {['#','Student Name','Grade','Teacher','Parent','Phone','Paid','Balance','Status'].map(h => (
                    <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s,i) => (
                  <tr key={s._id} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}
                  >
                    <td style={{ padding:'12px 14px', color:'var(--text-muted)', fontWeight:600 }}>{i+1}</td>
                    <td style={{ padding:'12px 14px', fontWeight:700, color:'var(--text)' }}>{s.name}</td>
                    <td style={{ padding:'12px 14px', color:'var(--text-muted)' }}>{s.grade}</td>
                    <td style={{ padding:'12px 14px', color:'var(--text-muted)', fontSize:12 }}>{s.gradeTeacher}</td>
                    <td style={{ padding:'12px 14px', color:'var(--text-muted)' }}>{s.parent?.name || '-'}</td>
                    <td style={{ padding:'12px 14px', color:'var(--text-muted)', fontSize:12 }}>{s.parent?.phone || '-'}</td>
                    <td style={{ padding:'12px 14px', color:'var(--green)', fontWeight:600 }}>ZMW {(s.totalPaid||0).toFixed(2)}</td>
                    <td style={{ padding:'12px 14px', color:s.remainingBalance>0?'var(--orange)':'var(--green)', fontWeight:600 }}>
                      {s.remainingBalance>0 ? `ZMW ${s.remainingBalance.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <span className={`badge ${s.paymentStatus==='paid'?'badge-success':s.paymentStatus==='partial'?'badge-warning':'badge-danger'}`}>
                        {s.paymentStatus==='paid'?'✓ Paid':s.paymentStatus==='partial'?'Partial':'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length===0 && (
              <div style={{ padding:'30px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>No students found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
