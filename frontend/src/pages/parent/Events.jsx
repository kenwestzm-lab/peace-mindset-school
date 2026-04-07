import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-ZM',{day:'numeric',month:'long',year:'numeric'}) : '';
const isPast  = d => d && new Date(d) < new Date();
const fmtCountdown = d => {
  if (!d) return '';
  const diff = new Date(d) - Date.now();
  if (diff <= 0) return '⏰ Expired';
  const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000);
  if (h > 48) return '';
  return h > 0 ? `⏳ ${h}h ${m}m left` : `⏳ ${m}m left`;
};

// ── Event Payment Form ───────────────────────────────────────────────────
function EventPayForm({ event, children, onSubmit, onClose, t }) {
  const [childId,   setChildId]   = useState('');
  const [provider,  setProvider]  = useState('Airtel Money');
  const [phone,     setPhone]     = useState('');
  const [txRef,     setTxRef]     = useState('');
  const [proof,     setProof]     = useState(null);
  const [submitting,setSubmitting]= useState(false);

  const handleProof = e => {
    const f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Image only for proof'); return; }
    if (f.size > 5*1024*1024) { toast.error('Max 5MB'); return; }
    const rd = new FileReader();
    rd.onload = () => setProof({ data: rd.result, mime: f.type });
    rd.readAsDataURL(f);
  };

  const submit = async () => {
    if (!childId) { toast.error('Select a child'); return; }
    if (!phone)   { toast.error('Enter your phone number'); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        childId, eventId: event._id, paymentType: 'event_fee',
        amount: event.paymentAmount, termYear: new Date().getFullYear(), termNumber: 1,
        mobileMoneyProvider: provider, phoneNumber: phone, mobileMoneyRef: txRef,
        proofImageData: proof?.data, proofImageMime: proof?.mime,
      });
      onClose();
    } catch (e) { toast.error(e.response?.data?.error || 'Submission failed'); }
    finally { setSubmitting(false); }
  };

  const inp = { padding:'11px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)',
                borderRadius:12, color:'var(--text)', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:500,display:'flex',alignItems:'flex-end'}}>
      <div style={{background:'var(--bg-card)',borderRadius:'20px 20px 0 0',padding:20,width:'100%',maxHeight:'92vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{color:'var(--text)',fontWeight:700,fontSize:18}}>💳 {t('payForEvent')}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text-muted)',fontSize:22,cursor:'pointer'}}>✕</button>
        </div>

        {/* Event summary */}
        <div style={{background:'rgba(155,24,38,0.06)',border:'1px solid rgba(155,24,38,0.15)',borderRadius:12,padding:'14px 16px'}}>
          <div style={{fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:2}}>{event.title}</div>
          <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:6}}>📅 {fmtDate(event.eventDate)}</div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--gold)'}}>ZMW {Number(event.paymentAmount).toFixed(2)}</div>
        </div>

        <div>
          <label style={{fontSize:12,color:'var(--text-muted)',marginBottom:4,display:'block'}}>Select Child *</label>
          <select value={childId} onChange={e=>setChildId(e.target.value)} style={inp}>
            <option value="">— Select child —</option>
            {children.map(c=><option key={c._id} value={c._id}>{c.name} (Grade {c.grade})</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:12,color:'var(--text-muted)',marginBottom:4,display:'block'}}>Mobile Money Provider *</label>
          <select value={provider} onChange={e=>setProvider(e.target.value)} style={inp}>
            <option>Airtel Money</option><option>MTN MoMo</option><option>Zamtel Kwacha</option><option>Bank Transfer</option><option>Cash</option>
          </select>
        </div>
        <div>
          <label style={{fontSize:12,color:'var(--text-muted)',marginBottom:4,display:'block'}}>Your Phone Number *</label>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. 0976123456" style={inp}/>
        </div>
        <div>
          <label style={{fontSize:12,color:'var(--text-muted)',marginBottom:4,display:'block'}}>Transaction Reference (optional)</label>
          <input value={txRef} onChange={e=>setTxRef(e.target.value)} placeholder="Mobile money transaction ID" style={inp}/>
        </div>
        <div>
          <label style={{fontSize:12,color:'var(--text-muted)',marginBottom:6,display:'block'}}>📸 Proof of Payment (optional)</label>
          {proof
            ? <div style={{position:'relative'}}>
                <img src={proof.data} style={{width:'100%',maxHeight:160,objectFit:'cover',borderRadius:10}} alt="proof"/>
                <button onClick={()=>setProof(null)} style={{position:'absolute',top:6,right:6,background:'rgba(239,68,68,0.8)',border:'none',color:'#fff',borderRadius:'50%',width:26,height:26,cursor:'pointer',fontSize:12}}>✕</button>
              </div>
            : <label style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:'var(--bg-elevated)',border:'1.5px dashed var(--border)',borderRadius:12,cursor:'pointer'}}>
                <input type="file" accept="image/*" onChange={handleProof} style={{display:'none'}}/>
                <span style={{fontSize:20}}>📎</span>
                <span style={{fontSize:13,color:'var(--text-muted)'}}>Attach payment screenshot</span>
              </label>
          }
        </div>
        <button
          onClick={submit}
          disabled={submitting||!childId||!phone}
          style={{padding:14,background:(!childId||!phone)?'var(--bg-elevated)':'linear-gradient(135deg,var(--maroon),var(--maroon-light))',border:'none',borderRadius:14,color:(!childId||!phone)?'var(--text-muted)':'#fff',cursor:(!childId||!phone)?'default':'pointer',fontWeight:700,fontSize:15}}
        >
          {submitting ? 'Submitting...' : '✓ Submit Event Payment'}
        </button>
        <p style={{fontSize:11,color:'var(--text-muted)',textAlign:'center'}}>Payment will be activated after admin approval</p>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────
export default function ParentEvents() {
  const { user }          = useStore();
  const { t, language }   = useT();
  const [events,   setEvents]      = useState([]);
  const [children, setChildren]    = useState([]);
  const [paidMap,  setPaidMap]     = useState({});   // eventId -> status
  const [pendMap,  setPendMap]     = useState({});   // eventId -> true (pending)
  const [loading,  setLoading]     = useState(true);
  const [payingEv, setPayingEv]    = useState(null);

  const load = async () => {
    try {
      const [evR, chR, pyR] = await Promise.all([
        api.get('/events'),
        api.get('/children'),
        api.get('/payments/my'),
      ]);
      setEvents(evR.data.events || []);
      setChildren(chR.data.children || []);

      const paid = {}, pend = {};
      (pyR.data.payments || []).forEach(p => {
        if (p.paymentType === 'event_fee' && p.eventId) {
          const eid = p.eventId._id || p.eventId;
          if (p.status === 'approved') paid[eid] = 'approved';
          else if (p.status === 'pending' && !paid[eid]) pend[eid] = true;
        }
      });
      setPaidMap(paid);
      setPendMap(pend);
    } catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const s = getSocket(); if (!s) return;
    const onNew  = ({ event }) => setEvents(p => [event, ...p]);
    const onUpd  = ({ event }) => setEvents(p => p.map(e => e._id === event._id ? event : e));
    const onAppr = () => load();
    s.on('new_event', onNew);
    s.on('event_updated', onUpd);
    s.on('payment_approved', onAppr);
    s.on('fees_updated', load);
    return () => { s.off('new_event',onNew); s.off('event_updated',onUpd); s.off('payment_approved',onAppr); s.off('fees_updated',load); };
  }, []);

  const submitPayment = async data => {
    await api.post('/payments', data);
    toast.success('Payment submitted! Awaiting admin approval.');
    load();
  };

  const getTitle = ev => language === 'fr' && ev.titleFr ? ev.titleFr : ev.title;
  const getDesc  = ev => language === 'fr' && ev.descriptionFr ? ev.descriptionFr : ev.description;

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <div className="spinner spinner-dark"/>
    </div>
  );

  const upcoming = events.filter(e => !isPast(e.eventDate));
  const past     = events.filter(e =>  isPast(e.eventDate));

  return (
    <div style={{padding:'16px 14px 80px',maxWidth:580,margin:'0 auto'}}>
      {payingEv && (
        <EventPayForm
          event={payingEv}
          children={children}
          onSubmit={submitPayment}
          onClose={() => setPayingEv(null)}
          t={t}
        />
      )}

      <h2 style={{fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:18}}>
        📅 {t('upcomingEvents')}
      </h2>

      {events.length === 0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-muted)'}}>
          <div style={{fontSize:52,marginBottom:12}}>📅</div>
          <div style={{fontSize:16,fontWeight:600,color:'var(--text)',marginBottom:6}}>{t('noEvents')}</div>
          <div style={{fontSize:13}}>Check back soon for upcoming school events</div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:24}}>
              {upcoming.map(ev => {
                const eid    = ev._id;
                const status = paidMap[eid];
                const pend   = pendMap[eid];
                return (
                  <div key={eid} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:16,padding:'16px 18px',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <h3 style={{fontSize:16,fontWeight:700,color:'var(--text)',margin:0,flex:1,paddingRight:10}}>{getTitle(ev)}</h3>
                      {ev.paymentRequired
                        ? <span style={{background:'rgba(186,117,23,0.1)',color:'var(--gold)',border:'1px solid rgba(186,117,23,0.25)',borderRadius:20,padding:'3px 12px',fontSize:13,fontWeight:700,whiteSpace:'nowrap'}}>
                            ZMW {Number(ev.paymentAmount).toFixed(2)}
                          </span>
                        : <span style={{background:'rgba(22,163,74,0.1)',color:'#16a34a',border:'1px solid rgba(22,163,74,0.25)',borderRadius:20,padding:'3px 12px',fontSize:13,fontWeight:700}}>
                            🎉 FREE
                          </span>
                      }
                    </div>
                    <p style={{fontSize:14,color:'var(--text-muted)',margin:'0 0 12px',lineHeight:1.55}}>{getDesc(ev)}</p>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                      <span style={{fontSize:13,color:'var(--maroon)',fontWeight:600}}>📅 {fmtDate(ev.eventDate)}</span>
                      <div>
                        {ev.paymentRequired ? (
                          status === 'approved'
                            ? <span style={{fontSize:12,color:'#16a34a',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>✅ {language==='fr'?'Paiement approuvé':'Payment Approved'}</span>
                            : pend
                            ? <span style={{fontSize:12,color:'var(--gold)',fontWeight:600}}>⏳ {language==='fr'?"En attente d'approbation":'Pending Approval'}</span>
                            : <button
                                onClick={() => setPayingEv(ev)}
                                style={{padding:'8px 20px',background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))',border:'none',borderRadius:20,color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',boxShadow:'0 2px 6px rgba(155,24,38,0.3)'}}
                              >
                                💳 {t('payForEvent')}
                              </button>
                        ) : (
                          <span style={{fontSize:13,color:'#16a34a',fontWeight:600}}>🎉 {language==='fr'?'Gratuit — inscrivez-vous':'Free — attend for free'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {past.length > 0 && (
            <>
              <div style={{fontSize:12,color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Past Events</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {past.map(ev => (
                  <div key={ev._id} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,padding:'14px 16px',opacity:0.55}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:15,fontWeight:600,color:'var(--text)',marginBottom:3}}>{getTitle(ev)}</div>
                        <div style={{fontSize:13,color:'var(--text-muted)'}}>{fmtDate(ev.eventDate)}</div>
                      </div>
                      <span style={{fontSize:12,color:'var(--text-muted)',background:'var(--bg-elevated)',padding:'2px 8px',borderRadius:8}}>Past</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
