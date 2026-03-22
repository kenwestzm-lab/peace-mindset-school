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
      const [c, a, p, cal, f] = await Promise.all([
        api.get('/children'),
        api.get('/announcements'),
        api.get('/payments'),
        api.get('/calendar/upcoming').catch(()=>({ data:{events:[]} })),
        api.get('/payments/fees').catch(()=>({ data:{fees:{ schoolFeeMonthly:150 }} })),
      ]);
      setData({
        children: c.data.children || [],
        announcements: a.data.announcements || [],
        payments: p.data.payments || [],
        events: cal.data.events || [],
        fees: f.data.fees || { schoolFeeMonthly:150 },
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    if (socket) {
      socket.on('payment_approved', load);
      socket.on('balance_reminder', (d) => toast(`⚠️ ZMW ${d.remaining} owed for ${d.childName}`, { duration:8000, icon:'💳' }));
      socket.on('school_status', (d) => toast(d.message || 'School status updated', { duration:7000 }));
    }
    return () => {
      getSocket()?.off('payment_approved', load);
      getSocket()?.off('balance_reminder');
      getSocket()?.off('school_status');
    };
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark" />
    </div>
  );

  const { children, announcements, payments, events, fees } = data;
  const monthlyFee = fees?.schoolFeeMonthly || 150;
  const pendingCount = payments.filter(p=>p.status==='pending').length;
  const approvedCount = payments.filter(p=>p.status==='approved').length;
  const hour = new Date().getHours();
  const greeting = hour<12?'Good Morning':hour<17?'Good Afternoon':'Good Evening';

  const childrenWithBalance = children.map(child => {
    const childPayments = payments.filter(p=>p.child?._id===child._id||p.child===child._id);
    const approvedAmt = childPayments.filter(p=>p.status==='approved').reduce((s,p)=>s+p.amount, 0);
    const remaining = child.paymentStatus==='paid' ? 0 : Math.max(0, monthlyFee - (approvedAmt % monthlyFee || approvedAmt));
    return { ...child, approvedAmt, remaining };
  });

  const totalOwed = childrenWithBalance.reduce((s,c)=>s+c.remaining, 0);
  const priorityBorder = { urgent:'var(--red)', important:'var(--orange)', normal:'var(--blue)' };
  const calEmoji = { open:'🟢', closed:'🔴', holiday:'🎉', event:'⭐' };

  const statusStyle = (status) => ({
    approved: { bg:'rgba(74,222,128,0.1)', color:'#4ADE80', text:'✓ Paid' },
    pending:  { bg:'rgba(245,158,11,0.1)', color:'#F59E0B', text:'⏳ Pending' },
    rejected: { bg:'rgba(239,68,68,0.1)',  color:'#EF4444', text:'✗ Rejected' },
  }[status] || { bg:'rgba(245,158,11,0.1)', color:'#F59E0B', text:'Pending' });

  return (
    <div>
      {/* Hero welcome */}
      <div style={{
        background:'linear-gradient(135deg, rgba(155,24,38,0.25) 0%, rgba(155,24,38,0.08) 100%)',
        borderRadius:18, padding:'20px', marginBottom:16,
        border:'1px solid rgba(155,24,38,0.2)', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:150, height:150, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,168,67,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{
            width:48, height:48, borderRadius:'50%', flexShrink:0,
            background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, fontWeight:700, color:'#fff',
            boxShadow:'0 0 14px rgba(155,24,38,0.4)',
          }}>{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div style={{ fontSize:12.5, color:'var(--text-muted)' }}>{greeting} 👋</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--text)', fontWeight:700, lineHeight:1.1 }}>
              {user?.name?.split(' ')[0]}
            </h2>
            <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:1 }}>Peace Mindset Private School</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:16 }}>
          {[
            { icon:'🧒', val:children.length, label:'Children' },
            { icon:'⏳', val:pendingCount, label:'Pending' },
            { icon:'✅', val:approvedCount, label:'Paid' },
          ].map((s,i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'10px 8px', textAlign:'center', border:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize:20 }}>{s.icon}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--text)', lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Balance alert */}
      {totalOwed > 0 && (
        <div style={{
          background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)',
          borderRadius:14, padding:'13px 16px', marginBottom:14,
          display:'flex', alignItems:'center', gap:12,
        }}>
          <span style={{ fontSize:24, flexShrink:0 }}>💳</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:'#F59E0B', fontSize:14 }}>Outstanding Balance</div>
            <div style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:2 }}>
              ZMW {totalOwed.toFixed(2)} remaining · Please clear fees to maintain access
            </div>
          </div>
          <Link to="/parent/payments" style={{
            padding:'7px 14px', borderRadius:9, background:'#F59E0B', color:'#000',
            fontSize:12, fontWeight:700, textDecoration:'none', flexShrink:0,
          }}>Pay Now</Link>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {[
          { to:'/parent/children', icon:'🧒', label:'Children' },
          { to:'/parent/payments', icon:'💳', label:'Pay Fees' },
          { to:'/parent/results', icon:'📋', label:'Results' },
          { to:'/parent/chat', icon:'💬', label:'Chat' },
        ].map((a,i) => (
          <Link key={i} to={a.to} style={{
            background:'var(--bg-card)', borderRadius:14, padding:'13px 8px',
            textAlign:'center', border:'1px solid var(--border)',
            textDecoration:'none', transition:'all 0.15s', display:'block',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--maroon-light)'; e.currentTarget.style.background='var(--bg-elevated)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg-card)'; }}
          >
            <div style={{ fontSize:24, marginBottom:5 }}>{a.icon}</div>
            <div style={{ fontSize:10.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{a.label}</div>
          </Link>
        ))}
      </div>

      {/* Children + balances */}
      <div className="card" style={{ marginBottom:13 }}>
        <div className="card-header">
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>🧒 My Children</h3>
          <Link to="/parent/children" style={{ fontSize:12.5, color:'var(--gold)', fontWeight:600 }}>Manage →</Link>
        </div>
        {childrenWithBalance.length===0 ? (
          <div style={{ padding:'28px 20px', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>👶</div>
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>No children added yet</p>
            <Link to="/parent/children" className="btn btn-primary btn-sm" style={{ marginTop:10, display:'inline-flex' }}>+ Add Child</Link>
          </div>
        ) : childrenWithBalance.map(child => (
          <div key={child._id} style={{ padding:'13px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:13 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:'rgba(155,24,38,0.15)', border:'1px solid rgba(155,24,38,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
              {child.gender==='female'?'👧':'👦'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, color:'var(--text)', fontSize:13.5 }}>{child.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>{child.grade}{child.gradeTeacher?` · ${child.gradeTeacher}`:''}</div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              {child.remaining>0 ? (
                <>
                  <div style={{ fontSize:13, fontWeight:700, color:'#F59E0B' }}>ZMW {child.remaining.toFixed(2)}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>outstanding</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:13, fontWeight:700, color:'#4ADE80' }}>✓ Clear</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>up to date</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Announcements */}
      {announcements.length>0 && (
        <div className="card" style={{ marginBottom:13 }}>
          <div className="card-header">
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>📢 Announcements</h3>
            <Link to="/parent/announcements" style={{ fontSize:12.5, color:'var(--gold)', fontWeight:600 }}>All →</Link>
          </div>
          {announcements.slice(0,3).map(a => (
            <div key={a._id} style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', borderLeft:`3px solid ${priorityBorder[a.priority]||'var(--blue)'}` }}>
              <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text)', marginBottom:2 }}>{a.title}</div>
              <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>
                {new Date(a.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* School schedule */}
      {events.length>0 && (
        <div className="card" style={{ marginBottom:13 }}>
          <div className="card-header">
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>📅 School Schedule</h3>
          </div>
          {events.map(ev => (
            <div key={ev._id} style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{calEmoji[ev.status]||'📅'}</span>
              <div>
                <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text)' }}>{ev.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>
                  {new Date(ev.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}
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
          <Link to="/parent/payments" style={{ fontSize:12.5, color:'var(--gold)', fontWeight:600 }}>All →</Link>
        </div>
        {payments.length===0 ? (
          <div style={{ padding:'24px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
            <div style={{ fontSize:30, marginBottom:6 }}>💳</div>No payments yet
          </div>
        ) : payments.slice(0,5).map(pay => {
          const s = statusStyle(pay.status);
          return (
            <div key={pay._id} style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <div>
                <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text)' }}>{pay.child?.name}</div>
                <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:1 }}>
                  ZMW {pay.amount} · {new Date(pay.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                </div>
              </div>
              <div style={{ padding:'3px 10px', borderRadius:999, background:s.bg, color:s.color, fontSize:11.5, fontWeight:700, flexShrink:0 }}>
                {s.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
