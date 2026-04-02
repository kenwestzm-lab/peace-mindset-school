
import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

/* ── Helpers ────────────────────────────────────────────────────── */
const TERM_NAMES = { 1:'First Term', 2:'Second Term', 3:'Third Term' };
const fmtAmt = n => `ZMW ${Number(n||0).toFixed(2)}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-ZM',{day:'numeric',month:'short',year:'numeric'}) : '—';
const isExpiredNow = p => p.isExpired || (p.expiresAt && new Date() > new Date(p.expiresAt));

/* ── Payment status logic ───────────────────────────────────────── */
const getStatus = (p) => {
  if (p.status === 'rejected') return { label:'Rejected', color:'#FC8181', bg:'rgba(239,68,68,0.1)', border:'rgba(239,68,68,0.3)', icon:'❌' };
  if (p.status === 'pending')  return { label:'Pending Approval', color:'#F59E0B', bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.3)', icon:'⏳' };
  if (isExpiredNow(p))         return { label:'Expired', color:'#9CA3AF', bg:'rgba(156,163,175,0.1)', border:'rgba(156,163,175,0.3)', icon:'⌛' };
  if (p.remainingBalance > 0)  return { label:`Balance: ${fmtAmt(p.remainingBalance)}`, color:'#FB923C', bg:'rgba(251,146,60,0.1)', border:'rgba(251,146,60,0.3)', icon:'⚠️' };
  return { label:'Paid ✓', color:'#4ADE80', bg:'rgba(74,222,128,0.1)', border:'rgba(74,222,128,0.3)', icon:'✅' };
};

/* ── Status Badge ───────────────────────────────────────────────── */
function StatusBadge({ payment }) {
  const s = getStatus(payment);
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:800, background:s.bg, color:s.color, border:`1px solid ${s.border}`, whiteSpace:'nowrap' }}>
      {s.icon} {s.label}
    </span>
  );
}

/* ── Single Payment Card ────────────────────────────────────────── */
function PayCard({ payment, showChild=true }) {
  const s = getStatus(payment);
  const typeMap = {
    school_fee_termly:  { icon:'📚', label:'School Fee — Full Term' },
    school_fee_monthly: { icon:'📅', label:'School Fee — Monthly' },
    school_fee_2terms:  { icon:'📗', label:'School Fee — 2 Terms' },
    test_fee:           { icon:'📝', label:'Test Results Fee' },
    event_fee:          { icon:'🎉', label:'Event Fee' },
  };
  const typeInfo = typeMap[payment.paymentType] || { icon:'💳', label:payment.paymentType };

  return (
    <div style={{ background:'var(--bg-card)', border:`1.5px solid ${s.border}`, borderRadius:14, padding:'14px 16px', marginBottom:10, position:'relative', overflow:'hidden' }}>
      {/* Left color bar */}
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:s.color, borderRadius:'4px 0 0 4px' }}/>
      <div style={{ paddingLeft:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:3, display:'flex', alignItems:'center', gap:6 }}>
              <span>{typeInfo.icon}</span> {typeInfo.label}
              {payment.termNumber && <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:400 }}>· {TERM_NAMES[payment.termNumber]||`Term ${payment.termNumber}`} {payment.termYear}</span>}
            </div>
            {showChild && payment.child && (
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>👦 {payment.child.name} · Grade {payment.child.grade}</div>
            )}
          </div>
          <StatusBadge payment={payment}/>
        </div>

        {/* Amount row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
          <div>
            <span style={{ fontSize:18, fontWeight:900, color: s.color }}>{fmtAmt(payment.paidAmount||payment.amount)}</span>
            {payment.fullAmount && payment.fullAmount !== payment.amount && (
              <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:6 }}>of {fmtAmt(payment.fullAmount)}</span>
            )}
          </div>
          <div style={{ textAlign:'right', fontSize:11, color:'var(--text-muted)' }}>
            <div>via {payment.mobileMoneyProvider||'—'}</div>
            {payment.expiresAt && !isExpiredNow(payment) && payment.status==='approved' && (
              <div style={{ color:'var(--text-muted)' }}>Expires {fmtDate(payment.expiresAt)}</div>
            )}
            {isExpiredNow(payment) && <div style={{ color:'#FC8181', fontWeight:700 }}>Expired {fmtDate(payment.expiresAt)}</div>}
          </div>
        </div>

        {/* Remaining balance warning */}
        {payment.remainingBalance > 0 && payment.status !== 'rejected' && (
          <div style={{ marginTop:8, background:'rgba(251,146,60,0.08)', border:'1px solid rgba(251,146,60,0.25)', borderRadius:8, padding:'7px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'#FB923C', fontWeight:700 }}>⚠️ Remaining: {fmtAmt(payment.remainingBalance)}</span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>Reminder every 3 days</span>
          </div>
        )}

        {/* Rejection reason */}
        {payment.status === 'rejected' && payment.rejectionReason && (
          <div style={{ marginTop:8, background:'rgba(239,68,68,0.06)', borderRadius:8, padding:'6px 10px', fontSize:12, color:'#FC8181' }}>
            Reason: {payment.rejectionReason}
          </div>
        )}

        {/* Submitted date */}
        <div style={{ marginTop:6, fontSize:11, color:'var(--text-muted)' }}>Submitted {fmtDate(payment.createdAt)}</div>
      </div>
    </div>
  );
}

/* ── Fee Section ────────────────────────────────────────────────── */
function FeeSection({ title, icon, payments, color, emptyMsg }) {
  const [open, setOpen] = useState(true);
  if (payments.length === 0) return null;

  const hasPending = payments.some(p => p.status === 'pending');
  const hasBalance = payments.some(p => p.remainingBalance > 0);
  const allPaid    = payments.every(p => p.status === 'approved' && !isExpiredNow(p) && !p.remainingBalance);

  return (
    <div style={{ marginBottom:18 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--bg-card)', border:`1.5px solid ${color}30`, borderRadius:14, cursor:'pointer', marginBottom: open ? 8 : 0 }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:20 }}>{icon}</span>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>{title}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{payments.length} payment{payments.length!==1?'s':''}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {allPaid    && <span style={{ fontSize:11, fontWeight:800, color:'#4ADE80', background:'rgba(74,222,128,0.1)', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(74,222,128,0.3)' }}>✅ ALL PAID</span>}
          {hasPending && <span style={{ fontSize:11, fontWeight:800, color:'#F59E0B', background:'rgba(245,158,11,0.1)', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(245,158,11,0.3)' }}>⏳ PENDING</span>}
          {hasBalance && <span style={{ fontSize:11, fontWeight:800, color:'#FB923C', background:'rgba(251,146,60,0.1)', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(251,146,60,0.3)' }}>⚠️ BALANCE</span>}
          <span style={{ color:'var(--text-muted)', fontSize:16, transition:'transform .2s', transform: open ? 'rotate(180deg)' : '' }}>▼</span>
        </div>
      </button>
      {open && <div>{payments.map(p => <PayCard key={p._id} payment={p}/>)}</div>}
    </div>
  );
}

/* ── Submit Payment Form ────────────────────────────────────────── */
function PayForm({ children, calendar, onSubmit, onClose, t }) {
  const [type,    setType]    = useState('');
  const [childId, setChildId] = useState('');
  const [termYear,setTermYear]= useState(new Date().getFullYear());
  const [termNum, setTermNum] = useState(1);
  const [termNum2,setTermNum2]= useState(2);
  const [provider,setProvider]= useState('Airtel Money');
  const [phone,   setPhone]   = useState('');
  const [ref,     setRef]     = useState('');
  const [proof,   setProof]   = useState(null);
  const [amount,  setAmount]  = useState('');
  const [submitting,setSubmitting]=useState(false);

  const fees = calendar?.fees || {};
  const typeOptions = [
    { value:'school_fee_termly',  label:'📚 School Fee — Full Term',      desc:`ZMW ${fees.termly||450}`,    amt:fees.termly||450 },
    { value:'school_fee_monthly', label:'📅 School Fee — Monthly',        desc:`ZMW ${fees.monthly||150}`,   amt:fees.monthly||150 },
    { value:'school_fee_2terms',  label:'📗 School Fee — 2 Terms (5% off)',desc:`ZMW ${fees.twoTerms?.toFixed(0)||855}`, amt:fees.twoTerms||855 },
    { value:'test_fee',           label:'📝 Test Results Fee',             desc:`ZMW ${fees.testFeeLower||30}–${fees.testFeeUpper||40}`, amt:fees.testFeeLower||30 },
  ];
  const selectedType = typeOptions.find(o=>o.value===type);
  const payAmt = amount && +amount > 0 ? +amount : selectedType?.amt || 0;
  const remaining = selectedType ? Math.max(0, selectedType.amt - payAmt) : 0;

  const handleProof = e => {
    const f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Image only'); return; }
    if (f.size > 5*1024*1024) { toast.error('Max 5MB'); return; }
    const rd = new FileReader(); rd.onload = () => setProof({ data:rd.result, mime:f.type }); rd.readAsDataURL(f);
  };

  const submit = async () => {
    if (!childId) { toast.error('Select a child'); return; }
    if (!type)    { toast.error('Select payment type'); return; }
    if (!phone)   { toast.error('Enter your phone number'); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        childId, paymentType:type, termYear, termNumber:termNum, termNumber2:termNum2,
        mobileMoneyProvider:provider, phoneNumber:phone, mobileMoneyRef:ref,
        proofImageData:proof?.data, proofImageMime:proof?.mime,
        partialAmount: amount && +amount > 0 && +amount < (selectedType?.amt||0) ? +amount : undefined,
      });
      onClose();
    } catch(e) { toast.error(e.response?.data?.error||'Submission failed'); }
    finally { setSubmitting(false); }
  };

  const inp = { padding:'11px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:12, color:'var(--text)', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', zIndex:500, display:'flex', alignItems:'flex-end' }}>
      <div style={{ background:'var(--bg-card)', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxHeight:'94vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ color:'var(--text)', fontWeight:800, fontSize:18 }}>💳 Submit Payment</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:22, cursor:'pointer' }}>✕</button>
        </div>

        {/* Payment instructions */}
        <div style={{ background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:14, padding:'14px 16px' }}>
          <div style={{ fontSize:13, fontWeight:800, color:'var(--text)', marginBottom:10 }}>📱 Send Payment To:</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ background:'rgba(255,0,0,0.05)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#dc2626', marginBottom:3 }}>🔴 Airtel Money</div>
              <div style={{ fontSize:15, fontWeight:900, color:'var(--text)', letterSpacing:'0.04em' }}>0977 200 127</div>
              <button onClick={()=>{navigator.clipboard?.writeText('0977200127');toast.success('Copied!');}} style={{ marginTop:4, padding:'3px 10px', background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:6, color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>Copy</button>
            </div>
            <div style={{ background:'rgba(234,179,8,0.05)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:11, fontWeight:800, color:'#ca8a04', marginBottom:3 }}>🟡 MTN MoMo</div>
              <div style={{ fontSize:15, fontWeight:900, color:'var(--text)', letterSpacing:'0.04em' }}>0960 774 535</div>
              <button onClick={()=>{navigator.clipboard?.writeText('0960774535');toast.success('Copied!');}} style={{ marginTop:4, padding:'3px 10px', background:'rgba(234,179,8,0.1)', border:'1px solid rgba(234,179,8,0.2)', borderRadius:6, color:'#ca8a04', fontSize:11, fontWeight:700, cursor:'pointer' }}>Copy</button>
            </div>
          </div>
        </div>

        {/* Child */}
        <div><label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block', fontWeight:700 }}>Select Child *</label>
          <select value={childId} onChange={e=>setChildId(e.target.value)} style={inp}>
            <option value="">— Select child —</option>
            {children.map(c=><option key={c._id} value={c._id}>{c.name} (Grade {c.grade})</option>)}
          </select>
        </div>

        {/* Payment type */}
        <div><label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6, display:'block', fontWeight:700 }}>Payment Type *</label>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {typeOptions.map(opt=>(
              <label key={opt.value} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', background:type===opt.value?'rgba(37,211,102,0.08)':'var(--bg-elevated)', border:`1px solid ${type===opt.value?'rgba(37,211,102,0.4)':'var(--border)'}`, borderRadius:12, cursor:'pointer' }}>
                <input type="radio" name="payType" value={opt.value} checked={type===opt.value} onChange={e=>setType(e.target.value)} style={{ accentColor:'#25D366' }}/>
                <div><div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{opt.label}</div><div style={{ fontSize:12, color:'var(--text-muted)' }}>{opt.desc}</div></div>
              </label>
            ))}
          </div>
        </div>

        {/* Term */}
        {type && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block', fontWeight:700 }}>Year</label>
              <select value={termYear} onChange={e=>setTermYear(Number(e.target.value))} style={inp}>
                {[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block', fontWeight:700 }}>Term</label>
              <select value={termNum} onChange={e=>setTermNum(Number(e.target.value))} style={inp}>
                <option value={1}>Term 1 (Jan–Apr)</option>
                <option value={2}>Term 2 (May–Aug)</option>
                <option value={3}>Term 3 (Sep–Dec)</option>
              </select>
            </div>
          </div>
        )}

        {/* Amount */}
        {selectedType && (
          <div>
            <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block', fontWeight:700 }}>Amount You Are Paying (ZMW) *</label>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:13, fontWeight:700, color:'var(--gold)' }}>ZMW</span>
              <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder={`Full: ${selectedType.amt}`} type="number" min={1} style={{ ...inp, paddingLeft:54, fontWeight:700, fontSize:16 }}/>
            </div>
            {amount && +amount > 0 && +amount < selectedType.amt && (
              <div style={{ marginTop:6, background:'rgba(251,146,60,0.08)', border:'1px solid rgba(251,146,60,0.25)', borderRadius:8, padding:'8px 12px' }}>
                <div style={{ fontSize:13, color:'#FB923C', fontWeight:700 }}>⚠️ Partial payment — Remaining: ZMW {remaining.toFixed(2)}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>You will receive reminders every 3 days to complete payment.</div>
              </div>
            )}
            {(!amount || +amount >= selectedType.amt) && (
              <div style={{ marginTop:6, background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:8, padding:'8px 12px', textAlign:'center' }}>
                <span style={{ fontSize:13, color:'#4ADE80', fontWeight:700 }}>Full payment: ZMW {selectedType.amt.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Provider */}
        <div><label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block', fontWeight:700 }}>Mobile Money Provider *</label>
          <select value={provider} onChange={e=>setProvider(e.target.value)} style={inp}>
            <option>Airtel Money</option><option>MTN MoMo</option><option>Zamtel Kwacha</option><option>Bank Transfer</option><option>Cash</option>
          </select>
        </div>

        {/* Phone */}
        <div><label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block', fontWeight:700 }}>Your Phone Number *</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. 0977200127" style={inp}/>
        </div>

        {/* Reference */}
        <div><label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block', fontWeight:700 }}>Transaction Reference (optional)</label>
          <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="Mobile money transaction ID" style={inp}/>
        </div>

        {/* Proof */}
        <div><label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6, display:'block', fontWeight:700 }}>📸 Proof of Payment (screenshot)</label>
          {proof
            ? <div style={{ position:'relative' }}>
                <img src={proof.data} style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:10 }} alt="proof"/>
                <button onClick={()=>setProof(null)} style={{ position:'absolute', top:6, right:6, background:'rgba(239,68,68,0.8)', border:'none', color:'#fff', borderRadius:'50%', width:26, height:26, cursor:'pointer', fontSize:12 }}>✕</button>
              </div>
            : <label style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'var(--bg-elevated)', border:'1.5px dashed var(--border)', borderRadius:12, cursor:'pointer' }}>
                <input type="file" accept="image/*" onChange={handleProof} style={{ display:'none' }}/>
                <span style={{ fontSize:20 }}>📎</span><span style={{ fontSize:13, color:'var(--text-muted)' }}>Attach payment screenshot</span>
              </label>
          }
        </div>

        <button onClick={submit} disabled={submitting||!childId||!type||!phone}
          style={{ padding:14, background:(!childId||!type||!phone)?'var(--bg-elevated)':'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:14, color:(!childId||!type||!phone)?'var(--text-muted)':'#fff', fontWeight:800, fontSize:15, cursor:(!childId||!type||!phone)?'default':'pointer' }}>
          {submitting ? '⏳ Submitting...' : '✓ Submit Payment'}
        </button>
        <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', margin:0 }}>Payment activates after admin approval</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function ParentPayments() {
  const { user } = useStore();
  const { t } = useT();
  const [payments, setPayments] = useState([]);
  const [children, setChildren] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab,setActiveTab]= useState('all');

  const load = async () => {
    try {
      const [pRes, cRes, calRes] = await Promise.all([
        api.get('/payments/my'),
        api.get('/children'),
        api.get('/payments/calendar'),
      ]);
      setPayments(pRes.data.payments||[]);
      setChildren(cRes.data.children||[]);
      setCalendar(calRes.data);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const s = getSocket();
    if (s) {
      s.on('payment_approved', () => { load(); toast.success('✅ Payment approved!'); });
      s.on('payment_rejected', ({ reason }) => { load(); toast.error(`❌ Rejected: ${reason||''}`); });
      s.on('payment_expired',  () => { load(); toast('⚠️ A payment has expired'); });
      s.on('balance_reminder', ({ message }) => toast(message||'Balance reminder', { icon:'💳' }));
      s.on('balance_updated',  () => load());
    }
    return () => {
      s?.off('payment_approved'); s?.off('payment_rejected');
      s?.off('payment_expired');  s?.off('balance_reminder');
      s?.off('balance_updated');
    };
  }, []);

  const submitPayment = async (data) => {
    await api.post('/payments', data);
    toast.success('Payment submitted! Awaiting admin approval.');
    load();
  };

  // Separate payments by category
  const schoolFees = payments.filter(p => ['school_fee_termly','school_fee_monthly','school_fee_2terms'].includes(p.paymentType));
  const testFees   = payments.filter(p => p.paymentType === 'test_fee');
  const eventFees  = payments.filter(p => p.paymentType === 'event_fee');
  const pending    = payments.filter(p => p.status === 'pending');
  const approved   = payments.filter(p => p.status === 'approved' && !isExpiredNow(p));
  const expired    = payments.filter(p => isExpiredNow(p));

  const current = calendar?.currentTerm;

  // Summary stats
  const totalPaid     = payments.filter(p=>p.status==='approved').reduce((s,p)=>s+(p.paidAmount||p.amount||0),0);
  const totalBalance  = payments.reduce((s,p)=>s+(p.remainingBalance||0),0);
  const hasPendingAny = pending.length > 0;

  const tabs = [
    { k:'all',    l:'All',          count:payments.length },
    { k:'school', l:'📚 School',    count:schoolFees.length },
    { k:'test',   l:'📝 Test',      count:testFees.length },
    { k:'event',  l:'🎉 Events',    count:eventFees.length },
    { k:'pending',l:'⏳ Pending',   count:pending.length },
  ];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark"/>
    </div>
  );

  return (
    <div style={{ padding:'16px 14px 80px', maxWidth:600, margin:'0 auto' }}>
      {showForm && <PayForm children={children} calendar={calendar} onSubmit={submitPayment} onClose={()=>setShowForm(false)} t={t}/>}

      {/* Current term banner */}
      {current && (
        <div style={{ background:'linear-gradient(135deg,var(--maroon-dark),var(--maroon))', borderRadius:16, padding:'16px 18px', marginBottom:16, position:'relative', overflow:'hidden' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.08em' }}>Current Term</div>
          <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{current.name} {current.year}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', marginTop:2 }}>
            {new Date(current.openDate).toLocaleDateString('en-ZM',{day:'numeric',month:'long'})} – {new Date(current.closeDate).toLocaleDateString('en-ZM',{day:'numeric',month:'long',year:'numeric'})}
          </div>
          {current.daysUntilClose > 0 && current.daysUntilClose <= 14 && (
            <div style={{ marginTop:8, fontSize:12, color:'#FAEEDA', background:'rgba(186,117,23,0.3)', padding:'4px 12px', borderRadius:8, display:'inline-block' }}>
              ⚠️ Term ends in {current.daysUntilClose} days
            </div>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
        {[
          { label:'Total Paid',    value:fmtAmt(totalPaid),   color:'#4ADE80', icon:'✅' },
          { label:'Balance Owed',  value:fmtAmt(totalBalance),color:totalBalance>0?'#FB923C':'#4ADE80', icon:totalBalance>0?'⚠️':'✓' },
          { label:'Pending',       value:pending.length,       color:hasPendingAny?'#F59E0B':'#9CA3AF', icon:'⏳' },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'10px 12px', textAlign:'center' }}>
            <div style={{ fontSize:16 }}>{s.icon}</div>
            <div style={{ fontSize:14, fontWeight:800, color:s.color, marginTop:3 }}>{s.value}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, textTransform:'uppercase', letterSpacing:'0.04em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Fees info */}
      {calendar?.fees && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
          {[
            { label:'Monthly',       value:`ZMW ${calendar.fees.monthly}` },
            { label:'Per Term',      value:`ZMW ${calendar.fees.termly}` },
            { label:'2 Terms (5% off)',value:`ZMW ${calendar.fees.twoTerms?.toFixed(0)}` },
            { label:'Test Fee',      value:`ZMW ${calendar.fees.testFeeLower}–${calendar.fees.testFeeUpper}` },
          ].map(f=>(
            <div key={f.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'9px 12px' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>{f.label}</div>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--gold)' }}>{f.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Submit button */}
      <button onClick={()=>setShowForm(true)} style={{ width:'100%', padding:14, background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:14, color:'#fff', fontWeight:800, fontSize:15, cursor:'pointer', marginBottom:16, boxShadow:'0 4px 14px rgba(155,24,38,0.3)' }}>
        + Submit New Payment
      </button>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, overflowX:'auto', borderBottom:'1px solid var(--border)', marginBottom:16, scrollbarWidth:'none' }}>
        {tabs.map(tab=>(
          <button key={tab.k} onClick={()=>setActiveTab(tab.k)} style={{ padding:'9px 14px', background:'none', border:'none', color:activeTab===tab.k?'var(--maroon-light)':'var(--text-muted)', fontSize:12, fontWeight:activeTab===tab.k?800:400, cursor:'pointer', borderBottom:activeTab===tab.k?'2px solid var(--maroon-light)':'2px solid transparent', marginBottom:-1, whiteSpace:'nowrap', flexShrink:0, position:'relative' }}>
            {tab.l}
            {tab.count > 0 && <span style={{ marginLeft:4, fontSize:10, fontWeight:800, background:activeTab===tab.k?'var(--maroon-light)':'var(--border)', color:activeTab===tab.k?'#fff':'var(--text-muted)', padding:'1px 6px', borderRadius:20 }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Payment sections */}
      {payments.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:52, marginBottom:12 }}>💳</div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:6 }}>No payments yet</div>
          <div style={{ fontSize:13 }}>Tap "Submit New Payment" to get started</div>
        </div>
      ) : (
        <>
          {/* ALL tab */}
          {activeTab === 'all' && (
            <>
              {pending.length > 0 && (
                <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12, padding:'10px 14px', marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#F59E0B', marginBottom:8 }}>⏳ {pending.length} Awaiting Approval</div>
                  {pending.map(p=><PayCard key={p._id} payment={p}/>)}
                </div>
              )}
              <FeeSection title="School Fees" icon="📚" payments={schoolFees} color="#9B1826"/>
              <FeeSection title="Test Result Fees" icon="📝" payments={testFees} color="#2563eb"/>
              <FeeSection title="Event Fees" icon="🎉" payments={eventFees} color="#7c3aed"/>
              {expired.length > 0 && <FeeSection title="Expired Payments" icon="⌛" payments={expired} color="#9CA3AF"/>}
            </>
          )}
          {activeTab === 'school' && (
            schoolFees.length === 0
              ? <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}><div style={{ fontSize:40 }}>📚</div><div style={{ marginTop:8 }}>No school fee payments</div></div>
              : schoolFees.map(p=><PayCard key={p._id} payment={p}/>)
          )}
          {activeTab === 'test' && (
            testFees.length === 0
              ? <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}><div style={{ fontSize:40 }}>📝</div><div style={{ marginTop:8 }}>No test fee payments</div></div>
              : testFees.map(p=><PayCard key={p._id} payment={p}/>)
          )}
          {activeTab === 'event' && (
            eventFees.length === 0
              ? <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}><div style={{ fontSize:40 }}>🎉</div><div style={{ marginTop:8 }}>No event fee payments</div></div>
              : eventFees.map(p=><PayCard key={p._id} payment={p}/>)
          )}
          {activeTab === 'pending' && (
            pending.length === 0
              ? <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}><div style={{ fontSize:40 }}>✅</div><div style={{ marginTop:8 }}>No pending payments</div></div>
              : pending.map(p=><PayCard key={p._id} payment={p}/>)
          )}
        </>
      )}
    </div>
  );
}
