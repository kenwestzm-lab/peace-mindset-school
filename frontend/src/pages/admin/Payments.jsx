import React, { useState, useEffect, useCallback } from 'react';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getSocket } from '../../utils/socket';

/* ─── helpers ─────────────────────────────────────────────────── */
const ZMW = (n) => `ZMW ${Number(n || 0).toFixed(2)}`;
const fmtDate = (d) => { try { return format(new Date(d), 'dd MMM yyyy'); } catch { return '—'; } };
const typeLabel = (t) => ({
  school_fee_termly: 'Termly', school_fee_monthly: 'Monthly',
  school_fee_2terms: '2 Terms', test_fee: 'Test Fee', event_fee: 'Event Fee',
}[t] || t?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || '—');

/* ─── color tokens ─────────────────────────────────────────────── */
const C = {
  gold:       '#F5C518',
  goldDark:   '#C9A000',
  goldLight:  'rgba(245,197,24,0.13)',
  goldBorder: 'rgba(245,197,24,0.35)',
  green:  '#4ADE80', greenBg:  'rgba(74,222,128,0.12)',
  red:    '#F87171', redBg:    'rgba(248,113,113,0.12)',
  amber:  '#FBBF24', amberBg:  'rgba(251,191,36,0.12)',
  purple: '#A78BFA', purpleBg: 'rgba(167,139,250,0.12)',
  blue:   '#60A5FA', blueBg:   'rgba(96,165,250,0.12)',
  muted:  '#8696A0',
  surface: '#1A2433',
  border:  'rgba(255,255,255,0.07)',
};

/* ─── CATEGORY CONFIG ─────────────────────────────────────────── */
const CATS = [
  {
    key: 'school',
    label: 'School Fees',
    icon: '🏫',
    types: ['school_fee_termly', 'school_fee_monthly', 'school_fee_2terms'],
    color: C.blue, bg: C.blueBg,
    desc: 'Termly · Monthly · 2-Term payments',
  },
  {
    key: 'test',
    label: 'Test Fees',
    icon: '📝',
    types: ['test_fee'],
    color: C.purple, bg: C.purpleBg,
    desc: 'Exam & test result access fees',
  },
  {
    key: 'event',
    label: 'Event Fees',
    icon: '🎉',
    types: ['event_fee'],
    color: C.green, bg: C.greenBg,
    desc: 'School event & activity fees',
  },
];

/* ─── STATUS BADGE ────────────────────────────────────────────── */
const StatusBadge = ({ status, expiresAt, isExpired }) => {
  const expired = isExpired || (expiresAt && new Date() > new Date(expiresAt));
  const cfg = status === 'approved'
    ? expired
      ? { color: C.muted,  bg: 'rgba(134,150,160,0.12)', label: '⌛ Expired' }
      : { color: C.green,  bg: C.greenBg,                label: '✅ Approved' }
    : status === 'rejected'
    ? { color: C.red,    bg: C.redBg,   label: '✕ Rejected' }
    : { color: C.amber,  bg: C.amberBg, label: '⏳ Pending' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30`,
      whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  );
};

/* ─── PROOF BUTTON ────────────────────────────────────────────── */
const ProofBtn = ({ url, data, mime }) => {
  const [open, setOpen] = React.useState(false);
  const src = url || (data && data.startsWith('http') ? data : data ? data : null);
  if (!src) return <span style={{color:'#9CA3AF',fontSize:11}}>No proof</span>;
  return (
    <>
      <button onClick={()=>setOpen(true)} style={{padding:'4px 10px',background:'rgba(37,211,102,0.1)',border:'1px solid rgba(37,211,102,0.3)',borderRadius:8,color:'#25D366',cursor:'pointer',fontSize:11,fontWeight:600}}>
        👁 View
      </button>
      {open && (
        <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#1F2C34',borderRadius:16,padding:16,maxWidth:500,width:'100%'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
              <span style={{fontWeight:700,color:'#E9EDEF'}}>Payment Proof</span>
              <button onClick={()=>setOpen(false)} style={{background:'none',border:'none',color:'#8696A0',fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <img src={src} alt="Payment proof" style={{width:'100%',borderRadius:10,maxHeight:'70vh',objectFit:'contain'}}
              onError={e=>{e.target.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><text y="50" fill="%23888">Image unavailable</text></svg>';}}/>
            <a href={src} target="_blank" rel="noreferrer" style={{display:'block',marginTop:10,textAlign:'center',color:'#25D366',fontSize:13}}>Open in full screen ↗</a>
          </div>
        </div>
      )}
    </>
  );
}
const ActionBtns = ({ p, processing, onApprove, onReject }) => {
  if (p.status !== 'pending') return null;
  const busy = processing === p._id;
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      <button
        onClick={() => onApprove(p._id)} disabled={busy}
        style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
          background: busy ? '#1F2C34' : C.greenBg, color: C.green,
          border: `1px solid ${C.green}40`, opacity: busy ? 0.6 : 1,
        }}>
        {busy ? '…' : '✓ Approve'}
      </button>
      <button
        onClick={() => onReject(p._id)} disabled={busy}
        style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
          background: C.redBg, color: C.red, border: `1px solid ${C.red}40`,
        }}>
        ✕ Reject
      </button>
    </div>
  );
};

/* ─── TABLE COMPONENT ─────────────────────────────────────────── */
const PayTable = ({ catKey, payments, processing, onApprove, onReject }) => {
  const th = { padding: '10px 12px', fontSize: 11, fontWeight: 700, color: C.muted, textAlign: 'left',
    borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.2)' };
  const td = { padding: '11px 12px', fontSize: 13, borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' };

  if (!payments.length) return (
    <div style={{ padding: '48px 20px', textAlign: 'center', color: C.muted }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>
        {catKey === 'school' ? '🏫' : catKey === 'test' ? '📝' : '🎉'}
      </div>
      <div style={{ fontSize: 14 }}>No payments in this category yet</div>
    </div>
  );

  /* ── SCHOOL FEES TABLE ── */
  if (catKey === 'school') return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
        <thead><tr>
          {['Student','Grade','Parent','Type','Term','Amount Paid','Balance','Provider','Ref','Proof','Date','Status','Actions']
            .map(h => <th key={h} style={th}>{h}</th>)}
        </tr></thead>
        <tbody>
          {payments.map(p => {
            const bal = p.remainingBalance || 0;
            const paid = p.paidAmount || p.amount || 0;
            return (
              <tr key={p._id} style={{ transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.child?.profilePic
                      ? <img src={p.child.profilePic} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                      : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1565C0,#0D47A1)', display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:700 }}>{p.child?.name?.[0]?.toUpperCase()||'?'}</div>}
                    <strong style={{ fontSize: 13 }}>{p.child?.name || '—'}</strong>
                  </div>
                </td>
                <td style={td}><span style={{ background:'rgba(96,165,250,0.15)',color:C.blue,padding:'2px 8px',borderRadius:999,fontSize:11,fontWeight:700 }}>{p.child?.grade||'—'}</span></td>
                <td style={td}>
                  <div style={{ fontSize: 12 }}>{p.parent?.name||'—'}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{p.parent?.phone||''}</div>
                </td>
                <td style={td}><span style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>{typeLabel(p.paymentType)}</span></td>
                <td style={td}>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {p.termYear ? `${p.termYear}` : ''}
                    {p.termNumber ? ` T${p.termNumber}` : ''}
                    {p.termNumber2 ? `+T${p.termNumber2}` : ''}
                    {p.month ? ` Mo.${p.month}` : ''}
                    {!p.termYear && !p.month ? '—' : ''}
                  </div>
                  {p.expiresAt && <div style={{ fontSize: 10, color: new Date() > new Date(p.expiresAt) ? C.red : C.green }}>
                    {new Date() > new Date(p.expiresAt) ? '⌛ Exp ' : '✅ Until '}{fmtDate(p.expiresAt)}
                  </div>}
                </td>
                <td style={td}><strong style={{ color: C.green }}>{ZMW(paid)}</strong></td>
                <td style={td}>
                  {bal > 0
                    ? <strong style={{ color: C.amber }}>{ZMW(bal)}</strong>
                    : <span style={{ color: C.muted, fontSize: 12 }}>—</span>}
                </td>
                <td style={td}><span style={{ fontSize: 12 }}>{p.mobileMoneyProvider||'—'}</span></td>
                <td style={td}>
                  {p.mobileMoneyRef
                    ? <code style={{ background:'rgba(255,255,255,0.06)',padding:'2px 6px',borderRadius:4,fontSize:11 }}>{p.mobileMoneyRef}</code>
                    : <span style={{ color: C.muted, fontSize: 11 }}>—</span>}
                </td>
                <td style={td}><ProofBtn url={p.proofUrl} data={p.proofImageData} mime={p.proofImageMime} /></td>
                <td style={td}><span style={{ fontSize: 12, color: C.muted }}>{fmtDate(p.createdAt)}</span></td>
                <td style={td}>
                  <StatusBadge status={p.status} expiresAt={p.expiresAt} isExpired={p.isExpired} />
                  {p.status === 'rejected' && p.rejectionReason &&
                    <div style={{ fontSize: 10, color: C.red, marginTop: 3, maxWidth: 120 }}>{p.rejectionReason}</div>}
                </td>
                <td style={td}><ActionBtns p={p} processing={processing} onApprove={onApprove} onReject={onReject} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  /* ── TEST FEES TABLE ── */
  if (catKey === 'test') return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
        <thead><tr>
          {['Student','Grade','Parent','Amount','Provider','Ref','Proof','Submitted','Approved','Accessed','Expires','Status','Actions']
            .map(h => <th key={h} style={th}>{h}</th>)}
        </tr></thead>
        <tbody>
          {payments.map(p => (
            <tr key={p._id}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {p.child?.profilePic
                    ? <img src={p.child.profilePic} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                    : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6D28D9,#4C1D95)', display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:700 }}>{p.child?.name?.[0]?.toUpperCase()||'?'}</div>}
                  <strong style={{ fontSize: 13 }}>{p.child?.name||'—'}</strong>
                </div>
              </td>
              <td style={td}><span style={{ background:'rgba(167,139,250,0.15)',color:C.purple,padding:'2px 8px',borderRadius:999,fontSize:11,fontWeight:700 }}>{p.child?.grade||'—'}</span></td>
              <td style={td}>
                <div style={{ fontSize: 12 }}>{p.parent?.name||'—'}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{p.parent?.phone||''}</div>
              </td>
              <td style={td}><strong style={{ color: C.purple }}>{ZMW(p.paidAmount||p.amount)}</strong></td>
              <td style={td}><span style={{ fontSize: 12 }}>{p.mobileMoneyProvider||'—'}</span></td>
              <td style={td}>
                {p.mobileMoneyRef
                  ? <code style={{ background:'rgba(255,255,255,0.06)',padding:'2px 6px',borderRadius:4,fontSize:11 }}>{p.mobileMoneyRef}</code>
                  : <span style={{ color:C.muted,fontSize:11 }}>—</span>}
              </td>
              <td style={td}><ProofBtn url={p.proofUrl} data={p.proofImageData} mime={p.proofImageMime} /></td>
              <td style={td}><span style={{ fontSize: 12, color: C.muted }}>{fmtDate(p.createdAt)}</span></td>
              <td style={td}><span style={{ fontSize: 12, color: C.muted }}>{p.approvedAt ? fmtDate(p.approvedAt) : '—'}</span></td>
              <td style={td}>
                {p.testResultAccessed
                  ? <span style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>👁 {p.testResultAccessedAt ? fmtDate(p.testResultAccessedAt) : 'Yes'}</span>
                  : <span style={{ fontSize: 11, color: C.muted }}>Not yet</span>}
              </td>
              <td style={td}>
                {p.expiresAt
                  ? <span style={{ fontSize: 11, color: new Date() > new Date(p.expiresAt) ? C.red : C.green }}>
                      {new Date() > new Date(p.expiresAt) ? '⌛ ' : '✅ '}{fmtDate(p.expiresAt)}
                    </span>
                  : <span style={{ color: C.muted, fontSize: 11 }}>—</span>}
              </td>
              <td style={td}>
                <StatusBadge status={p.status} expiresAt={p.expiresAt} isExpired={p.isExpired} />
                {p.status === 'rejected' && p.rejectionReason &&
                  <div style={{ fontSize: 10, color: C.red, marginTop: 3 }}>{p.rejectionReason}</div>}
              </td>
              <td style={td}><ActionBtns p={p} processing={processing} onApprove={onApprove} onReject={onReject} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  /* ── EVENT FEES TABLE ── */
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
        <thead><tr>
          {['Student','Grade','Parent','Amount','Provider','Ref','Proof','Date','Status','Actions']
            .map(h => <th key={h} style={th}>{h}</th>)}
        </tr></thead>
        <tbody>
          {payments.map(p => (
            <tr key={p._id}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {p.child?.profilePic
                    ? <img src={p.child.profilePic} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                    : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#065F46,#047857)', display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:700 }}>{p.child?.name?.[0]?.toUpperCase()||'?'}</div>}
                  <strong style={{ fontSize: 13 }}>{p.child?.name||'—'}</strong>
                </div>
              </td>
              <td style={td}><span style={{ background:'rgba(74,222,128,0.15)',color:C.green,padding:'2px 8px',borderRadius:999,fontSize:11,fontWeight:700 }}>{p.child?.grade||'—'}</span></td>
              <td style={td}>
                <div style={{ fontSize: 12 }}>{p.parent?.name||'—'}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{p.parent?.phone||''}</div>
              </td>
              <td style={td}><strong style={{ color: C.green }}>{ZMW(p.paidAmount||p.amount)}</strong></td>
              <td style={td}><span style={{ fontSize: 12 }}>{p.mobileMoneyProvider||'—'}</span></td>
              <td style={td}>
                {p.mobileMoneyRef
                  ? <code style={{ background:'rgba(255,255,255,0.06)',padding:'2px 6px',borderRadius:4,fontSize:11 }}>{p.mobileMoneyRef}</code>
                  : <span style={{ color:C.muted,fontSize:11 }}>—</span>}
              </td>
              <td style={td}><ProofBtn url={p.proofUrl} data={p.proofImageData} mime={p.proofImageMime} /></td>
              <td style={td}><span style={{ fontSize: 12, color: C.muted }}>{fmtDate(p.createdAt)}</span></td>
              <td style={td}>
                <StatusBadge status={p.status} expiresAt={p.expiresAt} isExpired={p.isExpired} />
                {p.status === 'rejected' && p.rejectionReason &&
                  <div style={{ fontSize: 10, color: C.red, marginTop: 3 }}>{p.rejectionReason}</div>}
              </td>
              <td style={td}><ActionBtns p={p} processing={processing} onApprove={onApprove} onReject={onReject} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                 */
/* ═══════════════════════════════════════════════════════════════ */
export default function AdminPayments() {
  const { t } = useT();
  const [allPayments, setAllPayments]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeCat, setActiveCat]       = useState('school');
  const [statusFilter, setStatusFilter] = useState('all');
  const [termFilter, setTermFilter] = useState({ year: new Date().getFullYear(), term: null }); // null = all terms
  const [currentTerm, setCurrentTerm] = useState(null);
  const [rejectModal, setRejectModal]   = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing]     = useState(null);
  const [feesModal, setFeesModal]       = useState(false);
  const [fees, setFees]                 = useState({ schoolFeeMonthly: 150, schoolFeeTermly: 450, testFeeLower: 30, testFeeUpper: 40 });
  const [savingFees, setSavingFees]     = useState(false);

  /* ── Load all payments ── */
  const load = useCallback(async () => {
    try {
      const [r, f] = await Promise.all([
        api.get(`/payments/admin/all?limit=500${termFilter.term ? `&termYear=${termFilter.year}&termNumber=${termFilter.term}` : ''}`),
        api.get('/payments/fees'),
      ]);
      setAllPayments(r.data.payments || []);
      if (f.data.fees) setFees(f.data.fees);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    if (socket) {
      socket.on('new_payment', load);
      socket.on('payment_approved', load);
      socket.on('payment_rejected', load);
    }
    return () => {
      const s = getSocket();
      if (s) { s.off('new_payment', load); s.off('payment_approved', load); s.off('payment_rejected', load); }
    };
  }, [load, termFilter]);

  /* ── Derived data ── */
  const cat = CATS.find(c => c.key === activeCat);
  const catPayments = allPayments.filter(p => cat.types.includes(p.paymentType));
  const filtered = statusFilter === 'all' ? catPayments : catPayments.filter(p => p.status === statusFilter);

  const stats = CATS.reduce((acc, c) => {
    const ps = allPayments.filter(p => c.types.includes(p.paymentType));
    acc[c.key] = {
      total:    ps.length,
      pending:  ps.filter(p => p.status === 'pending').length,
      approved: ps.filter(p => p.status === 'approved').length,
      revenue:  ps.filter(p => p.status === 'approved' && !p.isExpired && (!p.expiresAt || new Date(p.expiresAt) > new Date())).reduce((s, p) => s + (p.paidAmount || p.amount || 0), 0),
    };
    return acc;
  }, {});

  const totalPending = allPayments.filter(p => p.status === 'pending').length;
  const totalRevenue = allPayments.filter(p => p.status === 'approved' && !p.isExpired && (!p.expiresAt || new Date(p.expiresAt) > new Date())).reduce((s, p) => s + (p.paidAmount || p.amount || 0), 0);
  const allTimeRevenue = allPayments.filter(p => p.status === 'approved').reduce((s, p) => s + (p.paidAmount || p.amount || 0), 0);

  /* ── Actions ── */
  const approve = async (id) => {
    setProcessing(id);
    try {
      await api.put(`/payments/${id}/approve`);
      toast.success('Payment approved!');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setProcessing(null); }
  };

  const reject = async () => {
    if (!rejectReason.trim()) { toast.error('Please enter a reason'); return; }
    setProcessing(rejectModal);
    try {
      await api.put(`/payments/${rejectModal}/reject`, { reason: rejectReason });
      toast.success('Payment rejected.');
      setRejectModal(null); setRejectReason('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setProcessing(null); }
  };

  const saveFees = async () => {
    setSavingFees(true);
    try {
      await api.put('/payments/fees', fees);
      toast.success('Fee settings updated!');
      setFeesModal(false);
    } catch { toast.error('Failed to save fees.'); }
    finally { setSavingFees(false); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="animate-in" style={{ paddingBottom: 40 }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.gold, marginBottom: 4 }}>
            💳 Payment Management
          </h2>
          <p style={{ color: C.muted, fontSize: 13 }}>
            {totalPending > 0 && <span style={{ color: C.amber, fontWeight: 700 }}>⚠️ {totalPending} pending approval · </span>}
            Active Revenue: <strong style={{ color: C.green }}>{ZMW(totalRevenue)}</strong>
            <span style={{color:C.muted,fontWeight:400}}> · All Time: {ZMW(allTimeRevenue)}</span>
          </p>
        </div>
        <button onClick={() => setFeesModal(true)} style={{
          padding: '9px 18px', borderRadius: 10, border: `1px solid ${C.goldBorder}`,
          background: C.goldLight, color: C.gold, fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}>⚙️ Fee Settings</button>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 28 }}>
        {CATS.map(c => {
          const s = stats[c.key];
          const isActive = activeCat === c.key;
          return (
            <div key={c.key} style={{
              background: isActive ? c.bg : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${isActive ? c.color + '50' : C.border}`,
              borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
              transition: 'all 0.2s', boxShadow: isActive ? `0 0 20px ${c.color}20` : 'none',
            }} onClick={() => { setActiveCat(c.key); setStatusFilter('all'); }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isActive ? c.color : '#E2E8F0', marginBottom: 8 }}>{c.label}</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{ZMW(s.revenue)}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>Revenue</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.pending > 0 ? C.amber : C.muted }}>{s.pending}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>Pending</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>{s.approved}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>Approved</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── GOLD CATEGORY BUTTONS ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {CATS.map(c => {
          const isActive = activeCat === c.key;
          const s = stats[c.key];
          return (
            <button key={c.key} onClick={() => { setActiveCat(c.key); setStatusFilter('all'); }} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 13,
              border: `2px solid ${isActive ? C.gold : C.goldBorder}`,
              background: isActive
                ? `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`
                : C.goldLight,
              color: isActive ? '#0D1117' : C.gold,
              boxShadow: isActive ? `0 4px 20px rgba(245,197,24,0.35)` : 'none',
              transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              {c.label}
              {s.pending > 0 && (
                <span style={{
                  background: isActive ? 'rgba(0,0,0,0.2)' : C.amber,
                  color: isActive ? '#0D1117' : '#0D1117',
                  borderRadius: 999, fontSize: 10, fontWeight: 800, padding: '1px 7px', minWidth: 18, textAlign: 'center',
                }}>{s.pending}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── ACTIVE CATEGORY PANEL ── */}
      <div style={{
        background: C.surface, borderRadius: 16,
        border: `1.5px solid ${cat.color}30`,
        boxShadow: `0 0 30px ${cat.color}10`,
        overflow: 'hidden',
      }}>
        {/* Panel header */}
        <div style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10,
          borderBottom: `1px solid ${C.border}`,
          background: `linear-gradient(135deg, ${cat.color}10, transparent)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, background: cat.bg, border: `1px solid ${cat.color}30`,
            }}>{cat.icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: cat.color }}>{cat.label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{cat.desc} · {filtered.length} records</div>
            </div>
          </div>

          {/* Status filter pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${statusFilter === f ? cat.color : C.border}`,
                background: statusFilter === f ? cat.bg : 'transparent',
                color: statusFilter === f ? cat.color : C.muted,
                transition: 'all 0.15s',
              }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && stats[activeCat].pending > 0 && (
                  <span style={{ marginLeft: 4, background: C.amber, color:'#0D1117', borderRadius:999, fontSize:9, padding:'1px 5px', fontWeight:800 }}>
                    {stats[activeCat].pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <PayTable
          catKey={activeCat}
          payments={filtered}
          processing={processing}
          onApprove={approve}
          onReject={(id) => { setRejectModal(id); setRejectReason(''); }}
        />
      </div>

      {/* ── REJECT MODAL ── */}
      {rejectModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }} onClick={() => setRejectModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1A2433', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420,
            border: `1px solid ${C.red}30`, boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: C.red, fontWeight: 800, fontSize: 18 }}>✕ Reject Payment</h3>
              <button onClick={() => setRejectModal(null)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: C.muted, fontWeight: 700, display: 'block', marginBottom: 8 }}>REJECTION REASON *</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Transaction ID not found, incorrect amount..."
                rows={3}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: '10px 14px', color: '#E2E8F0', fontSize: 13, resize: 'vertical',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal(null)} style={{
                padding: '9px 18px', borderRadius: 10, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.muted, fontWeight: 700, cursor: 'pointer', fontSize: 13,
              }}>Cancel</button>
              <button onClick={reject} disabled={processing === rejectModal || !rejectReason.trim()} style={{
                padding: '9px 18px', borderRadius: 10, border: 'none',
                background: processing === rejectModal ? '#2A3444' : C.red,
                color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 13,
                opacity: !rejectReason.trim() ? 0.5 : 1,
              }}>
                {processing === rejectModal ? 'Rejecting…' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FEE SETTINGS MODAL ── */}
      {feesModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }} onClick={() => setFeesModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1A2433', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460,
            border: `1px solid ${C.goldBorder}`, boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: C.gold, fontWeight: 800, fontSize: 18 }}>⚙️ Fee Settings</h3>
              <button onClick={() => setFeesModal(false)} style={{ background:'none',border:'none',color:C.muted,fontSize:20,cursor:'pointer' }}>✕</button>
            </div>
            {[
              { key: 'schoolFeeMonthly', label: '🏫 Monthly School Fee (ZMW)' },
              { key: 'schoolFeeTermly',  label: '🏫 Termly School Fee (ZMW)' },
              { key: 'testFeeLower',     label: '📝 Test Fee — Lower Grades (ZMW)' },
              { key: 'testFeeUpper',     label: '📝 Test Fee — Upper Grades (ZMW)' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 700, display:'block', marginBottom: 6 }}>{f.label}</label>
                <input
                  type="number" value={fees[f.key]} min={0}
                  onChange={e => setFees({ ...fees, [f.key]: Number(e.target.value) })}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                    borderRadius: 10, padding: '10px 14px', color: '#E2E8F0', fontSize: 14, boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => setFeesModal(false)} style={{
                padding:'9px 18px',borderRadius:10,border:`1px solid ${C.border}`,
                background:'transparent',color:C.muted,fontWeight:700,cursor:'pointer',fontSize:13,
              }}>Cancel</button>
              <button onClick={saveFees} disabled={savingFees} style={{
                padding:'9px 20px',borderRadius:10,border:`2px solid ${C.gold}`,
                background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,
                color:'#0D1117',fontWeight:800,cursor:'pointer',fontSize:13,
              }}>
                {savingFees ? 'Saving…' : '💾 Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
