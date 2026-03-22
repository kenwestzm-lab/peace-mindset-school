import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const TERM_NAMES = { 1: 'First Term', 2: 'Second Term', 3: 'Third Term' };
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatusBadge({ status, expired }) {
  if (expired) return <span style={badge('#555','#aaa')}>Expired</span>;
  if (status === 'approved') return <span style={badge('#0F6E56','#E1F5EE')}>✅ Approved</span>;
  if (status === 'rejected') return <span style={badge('#A32D2D','#FCEBEB')}>❌ Rejected</span>;
  return <span style={badge('#BA7517','#FAEEDA')}>⏳ Pending</span>;
}

const badge = (border, bg) => ({
  display:'inline-block', fontSize:11, fontWeight:600, padding:'2px 8px',
  borderRadius:999, background:bg, color:border, border:`1px solid ${border}20`,
});

function PayCard({ payment }) {
  const isExpired = payment.isExpired || (payment.expiresAt && new Date() > new Date(payment.expiresAt));
  const typeLabels = {
    school_fee_termly: `School Fee — Term ${payment.termNumber} ${payment.termYear}`,
    school_fee_monthly: `School Fee — Month ${MONTH_NAMES[(payment.month||1)-1]} ${payment.termYear}`,
    school_fee_2terms: `School Fee — Terms ${payment.termNumber}&${payment.termNumber2} ${payment.termYear}`,
    test_fee: `Test Fee — Term ${payment.termNumber} ${payment.termYear}`,
  };
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <div style={{ fontWeight:600, fontSize:14, color:'var(--text)', marginBottom:3 }}>{typeLabels[payment.paymentType]||payment.paymentType}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>👦 {payment.child?.name} · Grade {payment.child?.grade}</div>
        </div>
        <StatusBadge status={payment.status} expired={isExpired} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:15, fontWeight:700, color:'var(--gold)' }}>ZMW {payment.amount?.toFixed(2)}</span>
        {payment.expiresAt && !isExpired && payment.status === 'approved' && (
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>
            Expires {new Date(payment.expiresAt).toLocaleDateString('en-ZM',{day:'numeric',month:'short',year:'numeric'})}
          </span>
        )}
      </div>
      {payment.status === 'rejected' && payment.rejectionReason && (
        <div style={{ marginTop:8, fontSize:12, color:'#FC8181', background:'rgba(239,68,68,0.08)', padding:'6px 10px', borderRadius:8 }}>
          Reason: {payment.rejectionReason}
        </div>
      )}
      {payment.paymentType === 'test_fee' && payment.status === 'approved' && !isExpired && (
        <div style={{ marginTop:8, fontSize:12, color:payment.testResultAccessed?'#8696A0':'#25D366' }}>
          {payment.testResultAccessed ? '👁 Result already accessed (free to view again)' : '🔓 Test result unlocked — tap Results to view'}
        </div>
      )}
    </div>
  );
}

function PayForm({ children, calendar, onSubmit, onClose }) {
  const [step, setStep] = useState(1); // 1=select type, 2=select term, 3=confirm+upload
  const [type, setType] = useState('');
  const [childId, setChildId] = useState('');
  const [termYear, setTermYear] = useState(new Date().getFullYear());
  const [termNum, setTermNum] = useState(1);
  const [termNum2, setTermNum2] = useState(2);
  const [month, setMonth] = useState(new Date().getMonth()+1);
  const [provider, setProvider] = useState('Airtel Money');
  const [phone, setPhone] = useState('');
  const [ref, setRef] = useState('');
  const [proof, setProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fees = calendar?.fees || {};
  const currentTerm = calendar?.currentTerm;

  const typeOptions = [
    { value:'school_fee_termly', label:'📚 School Fee — Full Term', desc:`ZMW ${fees.termly || 450} per term`, amount: fees.termly || 450 },
    { value:'school_fee_monthly', label:'📅 School Fee — Monthly', desc:`ZMW ${fees.monthly || 150} per month`, amount: fees.monthly || 150 },
    { value:'school_fee_2terms', label:'📗 School Fee — 2 Terms (5% off)', desc:`ZMW ${fees.twoTerms?.toFixed(0) || 855} for 2 terms`, amount: fees.twoTerms || 855 },
    { value:'test_fee', label:'📝 Test Results Fee', desc:`ZMW ${fees.testFeeLower||30}–${fees.testFeeUpper||40}`, amount: fees.testFeeLower || 30 },
  ];

  const selectedType = typeOptions.find(t=>t.value===type);

  const handleProof = (e) => {
    const f = e.target.files[0]; if(!f) return;
    if(!f.type.startsWith('image/')) { toast.error('Image only for proof'); return; }
    if(f.size > 5*1024*1024) { toast.error('Max 5MB for proof'); return; }
    const rd = new FileReader();
    rd.onload = () => setProof({ data: rd.result, mime: f.type });
    rd.readAsDataURL(f);
  };

  const submit = async () => {
    if(!childId) { toast.error('Select a child'); return; }
    if(!type) { toast.error('Select payment type'); return; }
    if(!phone) { toast.error('Enter your mobile money number'); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        childId, paymentType: type,
        termYear, termNumber: termNum, termNumber2: termNum2,
        month, mobileMoneyProvider: provider,
        phoneNumber: phone, mobileMoneyRef: ref,
        proofImageData: proof?.data, proofImageMime: proof?.mime,
      });
      onClose();
    } catch(e) { toast.error(e.response?.data?.error || 'Submission failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:500, display:'flex', alignItems:'flex-end' }}>
      <div style={{ background:'var(--bg-card)', borderRadius:'20px 20px 0 0', padding:20, width:'100%', maxHeight:'92vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ color:'var(--text)', fontWeight:700, fontSize:18 }}>💳 Submit Payment</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:22, cursor:'pointer' }}>✕</button>
        </div>

        {/* Child selector */}
        <div>
          <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Select Child *</label>
          <select value={childId} onChange={e=>setChildId(e.target.value)} style={inputStyle}>
            <option value="">— Select child —</option>
            {children.map(c=><option key={c._id} value={c._id}>{c.name} (Grade {c.grade})</option>)}
          </select>
        </div>

        {/* Payment type */}
        <div>
          <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6, display:'block' }}>Payment Type *</label>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {typeOptions.map(opt=>(
              <label key={opt.value} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background: type===opt.value?'rgba(37,211,102,0.08)':'var(--bg-elevated)', border:`1px solid ${type===opt.value?'rgba(37,211,102,0.4)':'var(--border)'}`, borderRadius:12, cursor:'pointer' }}>
                <input type="radio" name="payType" value={opt.value} checked={type===opt.value} onChange={e=>setType(e.target.value)} style={{ accentColor:'#25D366' }}/>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{opt.label}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Term selector */}
        {type && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Year</label>
              <select value={termYear} onChange={e=>setTermYear(Number(e.target.value))} style={inputStyle}>
                {[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Term</label>
              <select value={termNum} onChange={e=>setTermNum(Number(e.target.value))} style={inputStyle}>
                <option value={1}>Term 1 (Jan–Apr)</option>
                <option value={2}>Term 2 (May–Aug)</option>
                <option value={3}>Term 3 (Sep–Dec)</option>
              </select>
            </div>
            {type === 'school_fee_2terms' && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Second Term</label>
                <select value={termNum2} onChange={e=>setTermNum2(Number(e.target.value))} style={inputStyle}>
                  <option value={2}>Term 2 (May–Aug)</option>
                  <option value={3}>Term 3 (Sep–Dec)</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Amount display */}
        {selectedType && (
          <div style={{ background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:12, padding:'12px 16px', textAlign:'center' }}>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>Amount to pay</div>
            <div style={{ fontSize:24, fontWeight:700, color:'var(--gold)' }}>ZMW {selectedType.amount?.toFixed(2)}</div>
          </div>
        )}

        {/* Mobile money details */}
        <div>
          <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Mobile Money Provider *</label>
          <select value={provider} onChange={e=>setProvider(e.target.value)} style={inputStyle}>
            <option>Airtel Money</option>
            <option>MTN MoMo</option>
            <option>Zamtel Kwacha</option>
            <option>Bank Transfer</option>
            <option>Cash</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Your Phone Number *</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. 0976123456" style={inputStyle}/>
        </div>
        <div>
          <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4, display:'block' }}>Transaction Reference (optional)</label>
          <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="Mobile money transaction ID" style={inputStyle}/>
        </div>

        {/* Proof of payment */}
        <div>
          <label style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6, display:'block' }}>📸 Proof of Payment (screenshot)</label>
          {proof ? (
            <div style={{ position:'relative' }}>
              <img src={proof.data} style={{ width:'100%', maxHeight:160, objectFit:'cover', borderRadius:10 }} alt="proof"/>
              <button onClick={()=>setProof(null)} style={{ position:'absolute', top:6, right:6, background:'rgba(239,68,68,0.8)', border:'none', color:'#fff', borderRadius:'50%', width:26, height:26, cursor:'pointer', fontSize:12 }}>✕</button>
            </div>
          ) : (
            <label style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'var(--bg-elevated)', border:'1.5px dashed var(--border)', borderRadius:12, cursor:'pointer' }}>
              <input type="file" accept="image/*" onChange={handleProof} style={{display:'none'}}/>
              <span style={{ fontSize:20 }}>📎</span>
              <span style={{ fontSize:13, color:'var(--text-muted)' }}>Tap to attach payment screenshot</span>
            </label>
          )}
        </div>

        <button onClick={submit} disabled={submitting||!childId||!type||!phone} style={{ padding:'14px', background: (!childId||!type||!phone)?'var(--bg-elevated)':'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:14, color: (!childId||!type||!phone)?'var(--text-muted)':'#fff', cursor: (!childId||!type||!phone)?'default':'pointer', fontWeight:700, fontSize:15 }}>
          {submitting ? 'Submitting...' : '✓ Submit Payment for Approval'}
        </button>
        <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>Payment will be activated after admin approval</p>
      </div>
    </div>
  );
}

const inputStyle = { padding:'11px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:12, color:'var(--text)', fontSize:14, outline:'none', width:'100%' };

export default function ParentPayments() {
  const { user } = useStore();
  const [payments, setPayments] = useState([]);
  const [children, setChildren] = useState([]);
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');

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
      s.on('payment_rejected', ({ reason }) => { load(); toast.error(`❌ Payment rejected: ${reason||''}`); });
      s.on('payment_expired', () => { load(); toast('⚠️ A payment has expired'); });
    }
    return () => { s?.off('payment_approved'); s?.off('payment_rejected'); s?.off('payment_expired'); };
  }, []);

  const submitPayment = async (data) => {
    await api.post('/payments', data);
    toast.success('Payment submitted! Awaiting admin approval.');
    load();
  };

  const current = calendar?.currentTerm;
  const filtered = filter==='all' ? payments : payments.filter(p=>p.status===filter);

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}><div className="spinner spinner-dark"/></div>;

  return (
    <div style={{ padding:'16px 14px 80px', maxWidth:580, margin:'0 auto' }}>
      {showForm && <PayForm children={children} calendar={calendar} onSubmit={submitPayment} onClose={()=>setShowForm(false)}/>}

      {/* Current term banner */}
      {current && (
        <div style={{ background:'linear-gradient(135deg,var(--maroon-dark),var(--maroon))', borderRadius:16, padding:'16px 18px', marginBottom:18, position:'relative', overflow:'hidden' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.08em' }}>Current Term</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#fff', marginBottom:4 }}>{current.name} {current.year}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>
            {new Date(current.openDate).toLocaleDateString('en-ZM',{day:'numeric',month:'long'})} – {new Date(current.closeDate).toLocaleDateString('en-ZM',{day:'numeric',month:'long',year:'numeric'})}
          </div>
          {current.daysUntilClose > 0 && current.daysUntilClose <= 14 && (
            <div style={{ marginTop:6, fontSize:12, color:'#FAEEDA', background:'rgba(186,117,23,0.3)', padding:'4px 10px', borderRadius:8, display:'inline-block' }}>
              ⚠️ Term ends in {current.daysUntilClose} days — renew before payments expire!
            </div>
          )}
        </div>
      )}

      {/* Fees summary */}
      {calendar?.fees && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
          {[
            { label:'Monthly', value:`ZMW ${calendar.fees.monthly}` },
            { label:'Per Term', value:`ZMW ${calendar.fees.termly}` },
            { label:'2 Terms (5% off)', value:`ZMW ${calendar.fees.twoTerms?.toFixed(0)}` },
            { label:'Test Fee', value:`ZMW ${calendar.fees.testFeeLower}–${calendar.fees.testFeeUpper}` },
          ].map(f=>(
            <div key={f.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'10px 12px' }}>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{f.label}</div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--gold)' }}>{f.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Submit payment button */}
      <button onClick={()=>setShowForm(true)} style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:14, color:'#fff', fontWeight:700, fontSize:15, cursor:'pointer', marginBottom:18 }}>
        + Submit New Payment
      </button>

      {/* Filter tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:14 }}>
        {[['all','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected']].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{ flex:1, padding:'9px 0', background:'none', border:'none', color:filter===k?'var(--maroon-light)':'var(--text-muted)', fontSize:12, fontWeight:filter===k?700:400, cursor:'pointer', borderBottom:filter===k?'2px solid var(--maroon-light)':'2px solid transparent', marginBottom:-1 }}>{l}</button>
        ))}
      </div>

      {/* Payment list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>💳</div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:6 }}>No payments yet</div>
          <div style={{ fontSize:13 }}>Tap "Submit New Payment" to get started</div>
        </div>
      ) : filtered.map(p=><PayCard key={p._id} payment={p}/>)}
    </div>
  );
}
