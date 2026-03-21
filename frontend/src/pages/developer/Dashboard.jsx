import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const fmt = (n) => `ZMW ${Number(n || 0).toFixed(2)}`;

export default function DeveloperDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ amount: '', provider: 'Airtel Money', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [liveBalance, setLiveBalance] = useState(null);

  const load = async () => {
    try {
      const [d, w] = await Promise.all([
        api.get('/developer/dashboard'),
        api.get('/developer/withdrawals'),
      ]);
      setData(d.data);
      setLiveBalance(d.data.earnings.available);
      setWithdrawals(w.data.withdrawals);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    if (socket) {
      socket.emit('join_developer');
      socket.on('earnings_update', (p) => {
        if (p?.newBalance !== undefined) setLiveBalance(p.newBalance);
        load();
      });
      socket.on('withdrawal_update', () => load());
    }
    return () => {
      const s = getSocket();
      if (s) { s.off('earnings_update'); s.off('withdrawal_update'); }
    };
  }, []);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/developer/withdraw', {
        amount: Number(form.amount),
        mobileMoneyProvider: form.provider,
        phoneNumber: form.phone,
      });

      if (res.data.autoSent) {
        toast.success(res.data.message, { duration: 6000, icon: '✅' });
      } else {
        toast(res.data.message, { duration: 8000, icon: '⚠️' });
        if (res.data.setupRequired) {
          toast(`To enable auto-payouts: add ${res.data.setupRequired === 'MTN MoMo' ? 'MTN_SUBSCRIPTION_KEY, MTN_API_USER, MTN_API_KEY' : 'AIRTEL_CLIENT_ID, AIRTEL_CLIENT_SECRET'} to your .env file`, { duration: 10000, icon: '🔧' });
        }
      }

      setModal(false);
      setForm({ amount: '', provider: 'Airtel Money', phone: '' });
      if (res.data.newBalance !== undefined) setLiveBalance(res.data.newBalance);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Withdrawal failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const markDone = async (id) => {
    const ref = prompt('Enter mobile money transaction reference (or press OK to skip):');
    try {
      await api.put(`/developer/withdrawals/${id}/complete`, { reference: ref || 'manual' });
      toast.success('Marked as completed ✅');
      load();
    } catch { toast.error('Failed.'); }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark" />
    </div>
  );

  const { earnings, platform, monthlyEarnings, payoutConfig } = data;
  const balance = liveBalance ?? earnings.available;
  const maxMonthly = Math.max(...(monthlyEarnings.map(m => m.total)), 1);
  const apiReady = form.provider === 'MTN MoMo' ? payoutConfig?.mtnConfigured : payoutConfig?.airtelConfigured;

  return (
    <div>

      {/* Hero card */}
      <div style={{
        background: 'linear-gradient(135deg, var(--maroon-dark) 0%, var(--maroon) 65%, #A52030 100%)',
        borderRadius: 20, padding: '24px 22px', marginBottom: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-50, right:-50, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-30, left:-30, width:140, height:140, borderRadius:'50%', background:'rgba(201,168,76,0.06)', pointerEvents:'none' }} />

        <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6 }}>
          Available Balance
        </div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:42, fontWeight:700, color:'#FFF', lineHeight:1, marginBottom:8, transition:'all 0.4s ease' }}>
          {fmt(balance)}
        </div>
        <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.5)', marginBottom:20 }}>
          Total earned: <span style={{ color:'var(--gold-light)', fontWeight:600 }}>{fmt(earnings.total)}</span>
          {'  ·  '}
          Withdrawn: <span style={{ color:'rgba(255,255,255,0.7)', fontWeight:600 }}>{fmt(earnings.withdrawn)}</span>
        </div>

        <button
          className="btn btn-gold"
          onClick={() => setModal(true)}
          disabled={balance < 1}
          style={{ fontSize:15, padding:'12px 28px', fontWeight:700 }}
        >
          💸 Withdraw Now
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { icon:'👪', label:'Parents', value: platform.totalParents },
          { icon:'🧒', label:'Students', value: platform.totalChildren },
          { icon:'✅', label:'Payments', value: platform.totalPayments },
        ].map((s,i) => (
          <div key={i} style={{
            background:'var(--white)', borderRadius:14,
            padding:'16px 10px', textAlign:'center',
            border:'1px solid var(--gray-200)',
            boxShadow:'var(--shadow-sm)',
          }}>
            <div style={{ fontSize:26 }}>{s.icon}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:'var(--maroon-dark)', marginTop:4 }}>{s.value}</div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly earnings */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header">
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--maroon-dark)' }}>📈 Monthly Earnings</h3>
        </div>
        <div className="card-body">
          {monthlyEarnings.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:'var(--gray-400)', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
              Earnings appear when payments are approved
            </div>
          ) : monthlyEarnings.map((m, i) => {
            const pct = (m.total / maxMonthly) * 100;
            const monthName = new Date(m._id.year, m._id.month - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:42, fontSize:11, color:'var(--gray-400)', textAlign:'right', flexShrink:0 }}>{monthName}</div>
                <div style={{ flex:1, height:18, background:'var(--gray-100)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg, var(--maroon), var(--gold-bright))', borderRadius:4, transition:'width 0.6s ease' }} />
                </div>
                <div style={{ width:72, fontSize:12, fontWeight:700, color:'var(--maroon)', textAlign:'right', flexShrink:0 }}>{fmt(m.total)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Withdrawal history */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--maroon-dark)' }}>💸 Withdrawal History</h3>
        </div>
        <div>
          {withdrawals.length === 0 ? (
            <div style={{ textAlign:'center', padding:'30px 20px', color:'var(--gray-400)', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🏦</div>No withdrawals yet
            </div>
          ) : withdrawals.map(w => (
            <div key={w._id} style={{
              padding:'14px 18px', borderBottom:'1px solid var(--gray-100)',
              display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10,
            }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--maroon-dark)' }}>{fmt(w.amount)}</div>
                <div style={{ fontSize:12, color:'var(--gray-500)', marginTop:2 }}>{w.mobileMoneyProvider} · {w.phoneNumber}</div>
                <div style={{ fontSize:11, color:'var(--gray-300)', marginTop:1 }}>
                  {new Date(w.processedAt || w.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                </div>
                {w.notes && w.status !== 'completed' && (
                  <div style={{ fontSize:11, color:'var(--orange)', marginTop:4, lineHeight:1.4 }}>{w.notes}</div>
                )}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <span className={`badge ${w.status==='completed' ? 'badge-success' : w.status==='failed' ? 'badge-danger' : 'badge-warning'}`}>
                  {w.status === 'completed' ? '✓ Sent' : w.status === 'failed' ? '✗ Failed' : '⏳ Pending'}
                </span>
                {(w.status === 'pending' || w.status === 'processing') && (
                  <button className="btn btn-sm btn-outline" style={{ marginTop:6, fontSize:11, display:'block' }}
                    onClick={() => markDone(w._id)}>
                    Mark Done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Withdrawal modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:440 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--maroon-dark)' }}>💸 Withdraw Earnings</h3>
                <p style={{ fontSize:12.5, color:'var(--gray-400)', marginTop:2 }}>
                  {apiReady ? '🟢 Auto-payout enabled — money sent to your phone instantly' : '🔴 Manual mode — configure API for auto-payouts'}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)} style={{ fontSize:18 }}>✕</button>
            </div>

            <form onSubmit={handleWithdraw}>
              <div className="modal-body">
                {/* Balance */}
                <div style={{
                  background:'linear-gradient(135deg, var(--maroon-dark), var(--maroon))',
                  borderRadius:14, padding:'16px 18px', marginBottom:18,
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                  <div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>Available</div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'#fff', marginTop:2 }}>{fmt(balance)}</div>
                  </div>
                  <span style={{ fontSize:34 }}>💰</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (ZMW) *</label>
                  <input type="number" className="form-input"
                    value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                    min={1} max={balance} step="0.01"
                    placeholder={`Max: ${fmt(balance)}`} required
                    style={{ fontSize:16, fontWeight:600 }}
                  />
                  <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                    {[10, 20, 50, 100].filter(v => v <= balance).concat(balance > 100 ? [balance] : []).map((v,i) => (
                      <button key={i} type="button"
                        onClick={() => setForm({...form, amount: Number(v).toFixed(2)})}
                        style={{
                          padding:'4px 12px', borderRadius:6,
                          border:`1.5px solid var(--maroon)`,
                          background: Number(form.amount) === Number(v) ? 'var(--maroon)' : 'transparent',
                          color: Number(form.amount) === Number(v) ? 'white' : 'var(--maroon)',
                          fontSize:12, fontWeight:600, cursor:'pointer',
                        }}>
                        {v === balance ? 'All' : `ZMW ${v}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Money *</label>
                  <select className="form-input" value={form.provider}
                    onChange={e => setForm({...form, provider: e.target.value})}>
                    <option value="Airtel Money">📱 Airtel Money</option>
                    <option value="MTN MoMo">📱 MTN MoMo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Your Phone Number *</label>
                  <input type="tel" className="form-input"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    placeholder="097XXXXXXX or 076XXXXXXX"
                    required style={{ fontSize:15 }}
                  />
                </div>

                {!apiReady && (
                  <div style={{ background:'var(--orange-light)', borderRadius:10, padding:'12px 14px', fontSize:12.5, color:'var(--orange)', border:'1px solid rgba(196,120,32,0.2)', lineHeight:1.6 }}>
                    ⚠️ <strong>Auto-payout not configured.</strong> Balance will be deducted. Add{' '}
                    {form.provider === 'MTN MoMo'
                      ? <code>MTN_SUBSCRIPTION_KEY, MTN_API_USER, MTN_API_KEY</code>
                      : <code>AIRTEL_CLIENT_ID, AIRTEL_CLIENT_SECRET</code>
                    } to your .env file to enable automatic transfers.
                  </div>
                )}

                {apiReady && (
                  <div style={{ background:'var(--green-light)', borderRadius:10, padding:'12px 14px', fontSize:12.5, color:'var(--green)', border:'1px solid rgba(26,107,66,0.2)' }}>
                    ✅ Money will be sent to your phone automatically via {form.provider}.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !form.amount || Number(form.amount) < 1}>
                  {submitting
                    ? <><span className="spinner" /> Sending...</>
                    : `💸 Withdraw ${form.amount ? fmt(form.amount) : ''}`
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
