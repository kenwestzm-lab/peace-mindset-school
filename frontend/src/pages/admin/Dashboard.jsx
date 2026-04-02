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
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const [dash, stud] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/students').catch(()=>({ data:{ students:[] } })),
      ]);
      setStats(dash.data.stats);
      setRecentPayments(dash.data.recentPayments || []);
      setStudents(stud.data.students || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    if (socket) socket.on('new_payment', () => { toast('💳 New payment submitted!', { icon:'🔔', duration:5000 }); load(); });
    return () => getSocket()?.off('new_payment');
  }, []);

  const approve = async (id) => {
    setApproving(id);
    try { await api.put(`/payments/${id}/approve`); toast.success('✅ Payment approved!'); load(); }
    catch (err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setApproving(null); }
  };

  const reject = async (id) => {
    if (!confirm('Reject this payment?')) return;
    try { await api.put(`/payments/${id}/reject`, { reason:'Could not verify payment.' }); toast.success('Payment rejected'); load(); }
    catch { toast.error('Failed'); }
  };

  const sendReminders = async () => {
    try { const r = await api.post('/admin/send-reminders'); toast.success(r.data.message); }
    catch { toast.error('Failed'); }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark" />
    </div>
  );

  const pending = recentPayments.filter(p=>p.status==='pending');
  const approved = recentPayments.filter(p=>p.status!=='pending');
  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.grade?.toLowerCase().includes(search.toLowerCase()) ||
    s.parent?.name?.toLowerCase().includes(search.toLowerCase())
  );
  const ptLabel = { school_fee_monthly:'Monthly Fee', school_fee_term:'Term Fee', test_fee:'Test Fee', event_fee:'Event Fee' };

  return (
    <div>
      {/* Hero */}
      <div style={{
        background:'linear-gradient(135deg, rgba(155,24,38,0.25) 0%, rgba(155,24,38,0.08) 100%)',
        borderRadius:18, padding:'18px 20px', marginBottom:18,
        border:'1px solid rgba(155,24,38,0.2)', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,168,67,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontFamily:'var(--font-title)', fontSize:9, letterSpacing:'0.2em', color:'var(--gold)', textTransform:'uppercase', marginBottom:3, opacity:0.8 }}>Admin Panel</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:24, color:'var(--text)', fontWeight:700 }}>Peace Mindset</h2>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>Private School Management System</p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button className="btn btn-gold btn-sm" onClick={sendReminders}>🔔 Remind Parents</button>
            <Link to="/admin/calendar" className="btn btn-secondary btn-sm">📅 Calendar</Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:11, marginBottom:18 }}>
        {[
          { icon:'👪', label:'Parents', value:stats?.totalParents||0, color:'#60A5FA', bg:'rgba(96,165,250,0.1)', border:'rgba(96,165,250,0.25)', to:'/admin/parents' },
          { icon:'🧒', label:'Students', value:stats?.totalChildren||0, color:'#C02035', bg:'rgba(155,24,38,0.12)', border:'rgba(155,24,38,0.3)', to:'/admin/children' },
          { icon:'⏳', label:'Pending', value:stats?.pendingPayments||0, color:'#F59E0B', bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.25)', to:'/admin/payments' },
          { icon:'💰', label:'Revenue', value:`ZMW ${(stats?.totalRevenue||0).toLocaleString()}`, color:'#4ADE80', bg:'rgba(74,222,128,0.1)', border:'rgba(74,222,128,0.25)', to:'/admin/payments' },
        ].map((s,i) => (
          <Link key={i} to={s.to} style={{ textDecoration:'none' }}>
            <div style={{
              background:'var(--bg-card)', borderRadius:14, padding:'15px 16px',
              border:`1px solid ${s.border}`, transition:'all 0.18s',
              display:'flex', alignItems:'center', gap:12,
            }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform=''; }}
            >
              <div style={{ width:42, height:42, borderRadius:11, background:s.bg, border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>{s.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
        {[
          { to:'/admin/children', icon:'🧒', label:'Students' },
          { to:'/admin/payments', icon:'💳', label:'Payments' },
          { to:'/admin/announcements', icon:'📢', label:'Announce' },
          { to:'/admin/chat', icon:'💬', label:'Chat' },
        ].map((a,i) => (
          <Link key={i} to={a.to} style={{
            background:'var(--bg-card)', borderRadius:13, padding:'13px 8px',
            textAlign:'center', border:'1px solid var(--border)',
            textDecoration:'none', transition:'all 0.14s',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(155,24,38,0.4)'; e.currentTarget.style.background='var(--bg-elevated)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg-card)'; }}
          >
            <div style={{ fontSize:22, marginBottom:5 }}>{a.icon}</div>
            <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{a.label}</div>
          </Link>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {[{k:'overview',l:'💳 Payments'},{k:'students',l:'📊 Student List'}].map(t => (
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            padding:'8px 18px', borderRadius:10,
            border:`1px solid ${tab===t.k?'var(--maroon)':'var(--border)'}`,
            background:tab===t.k?'var(--maroon)':'var(--bg-card)',
            color:tab===t.k?'#fff':'var(--text-muted)',
            fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.14s',
            boxShadow:tab===t.k?'0 0 10px rgba(155,24,38,0.3)':'none',
          }}>{t.l}</button>
        ))}
      </div>

      {tab==='overview' && (
        <>
          {/* Pending approvals */}
          {pending.length>0 && (
            <div className="card" style={{ marginBottom:14, borderColor:'rgba(245,158,11,0.3)' }}>
              <div className="card-header" style={{ background:'rgba(245,158,11,0.06)' }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'#F59E0B' }}>⚠️ Awaiting Approval ({pending.length})</h3>
                <Link to="/admin/payments" style={{ fontSize:12.5, color:'#F59E0B', fontWeight:600 }}>All →</Link>
              </div>
              {pending.map(p => (
                <div key={p._id} style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>
                        {p.child?.name} <span style={{ color:'var(--text-muted)', fontWeight:400, fontSize:12 }}>· {p.child?.grade}</span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{p.parent?.name} · {ptLabel[p.paymentType]||p.paymentType}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--gold)', marginTop:3 }}>
                        ZMW {p.amount} <span style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)' }}>via {p.mobileMoneyProvider}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                      <button onClick={()=>approve(p._id)} disabled={approving===p._id} style={{
                        padding:'7px 14px', borderRadius:8, background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.3)',
                        color:'#4ADE80', cursor:'pointer', fontSize:12.5, fontWeight:600, transition:'all 0.14s',
                      }}
                      onMouseEnter={e=>{ e.currentTarget.style.background='#4ADE80'; e.currentTarget.style.color='#000'; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background='rgba(74,222,128,0.1)'; e.currentTarget.style.color='#4ADE80'; }}
                      >{approving===p._id?<span className="spinner" style={{width:12,height:12}}/>:'✓ Approve'}</button>
                      <button onClick={()=>reject(p._id)} style={{
                        padding:'7px 14px', borderRadius:8, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
                        color:'#EF4444', cursor:'pointer', fontSize:12.5, fontWeight:600,
                      }}>✗ Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent payments */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>💳 Recent Payments</h3>
              <Link to="/admin/payments" style={{ fontSize:12.5, color:'var(--gold)', fontWeight:600 }}>All →</Link>
            </div>
            {approved.length===0 ? (
              <div style={{ padding:'28px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>💳</div>No payments yet
              </div>
            ) : approved.slice(0,6).map(p => (
              <div key={p._id} style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text)' }}>{p.child?.name}</div>
                  <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:1 }}>
                    {p.parent?.name} · ZMW {p.amount} · {new Date(p.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                  </div>
                </div>
                <span style={{
                  padding:'3px 10px', borderRadius:999, fontSize:11.5, fontWeight:700, flexShrink:0,
                  background:p.status==='approved'?'rgba(74,222,128,0.1)':'rgba(239,68,68,0.1)',
                  color:p.status==='approved'?'#4ADE80':'#EF4444',
                  border:`1px solid ${p.status==='approved'?'rgba(74,222,128,0.3)':'rgba(239,68,68,0.25)'}`,
                }}>{p.status==='approved'?'✓ Paid':'✗ Rejected'}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {tab==='students' && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>📊 Student List</h3>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <input className="form-input" placeholder="Search..." value={search}
                onChange={e=>setSearch(e.target.value)}
                style={{ width:180, padding:'6px 11px', fontSize:'14px' }}
              />
              <span style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{filtered.length} total</span>
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'var(--bg-elevated)', borderBottom:'1px solid var(--border)' }}>
                  {['#','Name','Grade','Teacher','Parent','Phone','Paid','Balance','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 13px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s,i) => (
                  <tr key={s._id} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}
                  >
                    <td style={{ padding:'11px 13px', color:'var(--text-muted)', fontWeight:600 }}>{i+1}</td>
                    <td style={{ padding:'11px 13px' }}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:32,height:32,borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#D4A843,#F0C86A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>
                          {s.profilePic?<img src={s.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={e=>e.target.style.display='none'}/>:s.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:13,color:'var(--text)'}}>{s.name}</div>
                          {s.studentId&&<div style={{fontSize:10,fontFamily:'monospace',color:'var(--text-muted)'}}>{s.studentId}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'11px 13px', color:'var(--text-muted)' }}>{s.grade}</td>
                    <td style={{ padding:'11px 13px', color:'var(--text-muted)', fontSize:12 }}>{s.gradeTeacher}</td>
                    <td style={{ padding:'11px 13px', color:'var(--text-muted)' }}>
                      <div style={{fontSize:13}}>{s.parent?.name||<span style={{color:'#FC8181',fontSize:11}}>⚠️ Not linked</span>}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{s.parent?.email||''}</div>
                    </td>
                    <td style={{ padding:'11px 13px', fontSize:13 }}>
                      {s.parent?.phone
                        ? <a href={`tel:${s.parent.phone}`} style={{color:'#25D366',textDecoration:'none',fontWeight:600}}>📞 {s.parent.phone}</a>
                        : <span style={{color:'var(--text-muted)'}}>—</span>}
                    </td>
                    {/* School Fee */}
                    <td style={{ padding:'8px 10px', minWidth:100 }}>
                      {(() => {
                        const sf = s.fees?.school;
                        if (!sf) return <span style={{color:'#EF4444',fontSize:11}}>Unpaid</span>;
                        const color = sf.status==='paid'?'#4ADE80':sf.status==='partial'?'#FB923C':sf.status==='expired'?'#9CA3AF':'#EF4444';
                        return (
                          <div>
                            <span style={{fontSize:11,fontWeight:800,color,background:color+'18',padding:'2px 8px',borderRadius:20,border:`1px solid ${color}30`}}>
                              {sf.status==='paid'?'✅ Paid':sf.status==='partial'?'⚠️ Partial':sf.status==='expired'?'⌛ Expired':'❌ Unpaid'}
                            </span>
                            {sf.balance>0&&<div style={{fontSize:10,color:'#FB923C',marginTop:2}}>Bal: ZMW {sf.balance.toFixed(2)}</div>}
                            {sf.paid>0&&<div style={{fontSize:10,color:'var(--text-muted)'}}>Paid: ZMW {sf.paid.toFixed(2)}</div>}
                          </div>
                        );
                      })()}
                    </td>
                    {/* Test Fee */}
                    <td style={{ padding:'8px 10px', minWidth:80 }}>
                      {(() => {
                        const tf = s.fees?.test;
                        if (!tf || tf.count===0) return <span style={{color:'#EF4444',fontSize:11}}>❌ Not Paid</span>;
                        const color = tf.status==='paid'?'#4ADE80':tf.status==='expired'?'#9CA3AF':'#EF4444';
                        return <span style={{fontSize:11,fontWeight:800,color,background:color+'18',padding:'2px 8px',borderRadius:20,border:`1px solid ${color}30`}}>
                          {tf.status==='paid'?'✅ Paid':'⌛ Expired'}
                        </span>;
                      })()}
                    </td>
                    {/* Event Fees */}
                    <td style={{ padding:'8px 10px' }}>
                      {(s.fees?.event?.count||0)>0
                        ? <span style={{fontSize:11,color:'#A78BFA',fontWeight:700}}>✅ {s.fees.event.count} paid</span>
                        : <span style={{fontSize:11,color:'var(--text-muted)'}}>—</span>}
                    </td>
                    {/* Pending */}
                    <td style={{ padding:'8px 10px' }}>
                      {(s.fees?.pending?.count||0)>0
                        ? <span style={{fontSize:11,fontWeight:800,color:'#F59E0B',background:'rgba(245,158,11,0.1)',padding:'2px 8px',borderRadius:20,border:'1px solid rgba(245,158,11,0.3)'}}>⏳ {s.fees.pending.count}</span>
                        : <span style={{fontSize:11,color:'var(--text-muted)'}}>—</span>}
                    </td>
                    {/* Overall status */}
                    <td style={{ padding:'8px 10px' }}>
                      {(() => {
                        const sf = s.fees?.school;
                        const status = sf?.status || s.paymentStatus || 'unpaid';
                        const cfg = {
                          paid:    {bg:'rgba(74,222,128,0.1)', color:'#4ADE80',  label:'✓ Paid'},
                          partial: {bg:'rgba(251,146,60,0.1)', color:'#FB923C',  label:'⚠ Partial'},
                          expired: {bg:'rgba(156,163,175,0.1)',color:'#9CA3AF', label:'⌛ Expired'},
                          unpaid:  {bg:'rgba(239,68,68,0.1)',  color:'#EF4444',  label:'✕ Unpaid'},
                        }[status] || {bg:'rgba(239,68,68,0.1)',color:'#EF4444',label:'✕ Unpaid'};
                        return <span style={{padding:'3px 9px',borderRadius:999,fontSize:11,fontWeight:700,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}25`,whiteSpace:'nowrap'}}>{cfg.label}</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length===0 && (
              <div style={{ padding:'28px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>No students found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
