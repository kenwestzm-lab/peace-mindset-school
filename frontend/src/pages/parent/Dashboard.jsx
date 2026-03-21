import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

export default function ParentDashboard() {
  const { user } = useStore();
  const [children, setChildren] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [fees, setFees] = useState({ schoolFeeMonthly: 150 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [c, a, p, cal, f] = await Promise.all([
        api.get('/children'),
        api.get('/announcements'),
        api.get('/payments'),
        api.get('/calendar/upcoming'),
        api.get('/payments/fees'),
      ]);
      setChildren(c.data.children);
      setAnnouncements(a.data.announcements);
      setPayments(p.data.payments);
      setUpcomingEvents(cal.data.events);
      if (f.data.fees) setFees(f.data.fees);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    if (socket) {
      socket.on('payment_approved', load);
      socket.on('balance_reminder', (d) => {
        toast(`⚠️ Reminder: ZMW ${d.remaining} still owed for ${d.childName}`, { duration: 8000, icon:'💳' });
      });
    }
    return () => {
      getSocket()?.off('payment_approved', load);
      getSocket()?.off('balance_reminder');
    };
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark" />
    </div>
  );

  const pendingPayments = payments.filter(p => p.status==='pending').length;
  const approvedPayments = payments.filter(p => p.status==='approved').length;
  const hour = new Date().getHours();
  const greeting = hour<12 ? 'Good Morning' : hour<17 ? 'Good Afternoon' : 'Good Evening';
  const monthlyFee = fees?.schoolFeeMonthly || 150;

  // Calculate balance per child
  const childrenWithBalance = children.map(child => {
    const childPayments = payments.filter(p => p.child?._id===child._id || p.child===child._id);
    const approvedAmount = childPayments.filter(p=>p.status==='approved').reduce((s,p)=>s+p.amount,0);
    const pendingAmount = childPayments.filter(p=>p.status==='pending').reduce((s,p)=>s+p.amount,0);
    const remaining = child.paymentStatus==='paid' ? 0 : Math.max(0, monthlyFee - (approvedAmount % monthlyFee || approvedAmount));
    return { ...child, approvedAmount, pendingAmount, remaining };
  });

  const totalRemaining = childrenWithBalance.reduce((s,c) => s+c.remaining, 0);

  const priorityColor = { urgent:'var(--red)', important:'var(--orange)', normal:'var(--blue)' };

  const calStatusEmoji = { open:'🟢', closed:'🔴', holiday:'🎉', event:'⭐' };

  return (
    <div>
      {/* Hero */}
      <div style={{
        background:'linear-gradient(135deg, rgba(155,24,38,0.3) 0%, rgba(155,24,38,0.1) 60%, transparent 100%)',
        borderRadius:20, padding:'22px', marginBottom:18,
        border:'1px solid var(--border-bright)',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, rgba(212,168,67,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{
            width:50, height:50, borderRadius:'50%',
            background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, fontWeight:700, color:'#fff', flexShrink:0,
            boxShadow:'0 0 16px var(--maroon-glow)',
          }}>{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>{greeting} 👋</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--text)', fontWeight:700 }}>{user?.name?.split(' ')[0]}!</h2>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>Peace Mindset Private School</div>
          </div>
        </div>

        {/* Mini stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:18 }}>
          {[
            { icon:'🧒', value:children.length, label:'Children' },
            { icon:'⏳', value:pendingPayments, label:'Pending' },
            { icon:'✅', value:approvedPayments, label:'Paid' },
          ].map((s,i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'10px 8px', textAlign:'center', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:20 }}>{s.icon}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--text)', lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Balance warning */}
      {totalRemaining > 0 && (
        <div style={{
          background:'var(--orange-bg)', border:'1px solid var(--orange-border)',
          borderRadius:14, padding:'14px 18px', marginBottom:16,
          display:'flex', alignItems:'center', gap:12,
        }}>
          <span style={{ fontSize:24, flexShrink:0 }}>💳</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:'var(--orange)', fontSize:14 }}>Outstanding Balance</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>
              ZMW {totalRemaining.toFixed(2)} remaining — please clear fees to maintain access
            </div>
          </div>
          <Link to="/parent/payments" className="btn btn-sm" style={{ background:'var(--orange)', color:'#fff', flexShrink:0, fontSize:12 }}>
            Pay Now
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
        {[
          { to:'/parent/children', icon:'🧒', label:'Children' },
          { to:'/parent/payments', icon:'💳', label:'Pay Fees' },
          { to:'/parent/results', icon:'📋', label:'Results' },
          { to:'/parent/chat', icon:'💬', label:'Chat' },
        ].map((a,i) => (
          <Link key={i} to={a.to} style={{
            background:'var(--bg-card)', borderRadius:14, padding:'14px 8px',
            textAlign:'center', border:'1px solid var(--border)',
            textDecoration:'none', transition:'all 0.15s', display:'block',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--maroon-light)'; e.currentTarget.style.background='var(--bg-elevated)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg-card)'; }}
          >
            <div style={{ fontSize:26, marginBottom:5 }}>{a.icon}</div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{a.label}</div>
          </Link>
        ))}
      </div>

      {/* Children with balance */}
      <div className="card" style={{ marginBottom:14 }}>
        <div className="card-header">
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>🧒 My Children & Balances</h3>
          <Link to="/parent/children" style={{ fontSize:12.5, color:'var(--gold)', fontWeight:600 }}>View all →</Link>
        </div>
        {childrenWithBalance.length===0 ? (
          <div style={{ padding:'28px 20px', textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>👶</div>
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>No children added yet</p>
            <Link to="/parent/children" className="btn btn-primary btn-sm" style={{ marginTop:10 }}>+ Add Child</Link>
          </div>
        ) : childrenWithBalance.map(child => (
          <div key={child._id} style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:'var(--maroon-pale)', border:'1px solid rgba(155,24,38,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
              {child.gender==='female'?'👧':'👦'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, color:'var(--text)', fontSize:14 }}>{child.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>
                {child.grade} {child.gradeTeacher ? `· ${child.gradeTeacher}` : ''}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              {child.remaining > 0 ? (
                <>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--orange)' }}>ZMW {child.remaining.toFixed(2)}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>outstanding</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--green)' }}>✓ Paid</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>up to date</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Announcements */}
      <div className="card" style={{ marginBottom:14 }}>
        <div className="card-header">
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>📢 Announcements</h3>
          <Link to="/parent/announcements" style={{ fontSize:12.5, color:'var(--gold)', fontWeight:600 }}>View all →</Link>
        </div>
        {announcements.length===0 ? (
          <div style={{ padding:'22px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
            <div style={{ fontSize:30, marginBottom:6 }}>📭</div>No announcements
          </div>
        ) : announcements.slice(0,3).map(a => (
          <div key={a._id} style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', borderLeft:`3px solid ${priorityColor[a.priority]||'var(--blue)'}` }}>
            <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text)', marginBottom:2 }}>
              {a.title}
            </div>
            <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>
              {new Date(a.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming calendar events */}
      {upcomingEvents.length > 0 && (
        <div className="card" style={{ marginBottom:14 }}>
          <div className="card-header">
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>📅 School Schedule</h3>
          </div>
          {upcomingEvents.map(ev => (
            <div key={ev._id} style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{calStatusEmoji[ev.status]||'📅'}</span>
              <div>
                <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text)' }}>{ev.title}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>
                  {new Date(ev.date).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
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
          <Link to="/parent/payments" style={{ fontSize:12.5, color:'var(--gold)', fontWeight:600 }}>View all →</Link>
        </div>
        {payments.length===0 ? (
          <div style={{ padding:'22px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
            <div style={{ fontSize:30, marginBottom:6 }}>💳</div>No payments yet
          </div>
        ) : payments.slice(0,4).map(pay => (
          <div key={pay._id} style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text)' }}>{pay.child?.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>
                ZMW {pay.amount} · {new Date(pay.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
              </div>
            </div>
            <span className={`badge ${pay.status==='approved'?'badge-success':pay.status==='rejected'?'badge-danger':'badge-warning'}`}>
              {pay.status==='approved'?'✓ Paid':pay.status==='rejected'?'✗ Rejected':'⏳ Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
