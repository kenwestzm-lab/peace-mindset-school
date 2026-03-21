import { useState, useEffect } from 'react';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

const fmt = (n) => `ZMW ${Number(n || 0).toFixed(2)}`;

export default function DeveloperDashboard() {
  const { t } = useT();
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
      socket.on('earnings_update', (payload) => {
        if (payload?.newBalance !== undefined) setLiveBalance(payload.newBalance);
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
      toast.success(res.data.message);
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

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark" />
    </div>
  );

  const { earnings, platform, monthlyEarnings } = data;
  const balance = liveBalance ?? earnings.available;
  const maxMonthly = Math.max(...(monthlyEarnings.map(m => m.total)), 1);

  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>

      {/* Hero balance card */}
      <div style={{
        background:'linear-gradient(135deg, var(--maroon-dark) 0%, var(--maroon) 60%, #8B1525 100%)',
        borderRadius:20, padding:'28px 28px 24px',
        marginBottom:24, position:'relative', overflow:'hidden',
      }}>
        {/* decorative circle */}
        <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
              Available Balance
            </div>
            <div style={{
              fontFamily:'var(--font-display)',
              fontSize:44, fontWeight:700, color:'#FFFFFF', lineHeight:1,
              marginBottom:6,
              transition:'all 0.3s ease',
            }}>
              {fmt(balance)}
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>
              Total earned: <strong style={{ color:'var(--gold-light)' }}>{fmt(earnings.total)}</strong>
              &nbsp;·&nbsp;
              Withdrawn: <strong style={{ color:'rgba(255,255,255,0.7)' }}>{fmt(earnings.withdrawn)}</strong>
            </div>
          </div>

          <button
            className="btn btn-gold btn-lg"
            onClick={() => setModal(true)}
            disabled={balance < 1}
            style={{ flexShrink:0, alignSelf:'flex-start' }}
          >
            💸 Withdraw Now
          </button>
        </div>
      </div>

      {/* Platform stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        {[
          { icon:'👪', label:'Parents', value: platform.totalParents },
          { icon:'🧒', label:'Children', value: platform.totalChildren },
          { icon:'✅', label:'Payments Approved', value: platform.totalPayments },
        ].map((s,i) => (
          <div key={i} className="stat-card" style={{ textAlign:'center', padding:'18px 12px' }}>
            <div style={{ fontSize:28, marginBottom:6 }}>{s.icon}</div>
            <div className="stat-value" style={{ fontSize:26 }}>{s.value}</div>
            <div className="stat-label" style={{ marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* Monthly earnings chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--maroon-dark)' }}>📈 Monthly Earnings</h3>
          </div>
          <div className="card-body">
            {monthlyEarnings.length === 0 ? (
              <div className="empty-state" style={{ padding:'30px 0' }}>
                <div style={{ fontSize:36 }}>📊</div>
                <p style={{ marginTop:8, color:'var(--gray-400)', fontSize:13 }}>Earnings appear when payments are approved</p>
              </div>
            ) : monthlyEarnings.map((m, i) => {
              const pct = (m.total / maxMonthly) * 100;
              const monthName = new Date(m._id.year, m._id.month - 1)
                .toLocaleString('default', { month: 'short', year: '2-digit' });
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:44, fontSize:11.5, color:'var(--gray-400)', textAlign:'right', flexShrink:0 }}>{monthName}</div>
                  <div style={{ flex:1, height:20, background:'var(--gray-100)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{
                      width:`${pct}%`, height:'100%',
                      background:'linear-gradient(90deg, var(--maroon), var(--gold-bright))',
                      borderRadius:4, minWidth: pct > 0 ? 6 : 0,
                      transition:'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ width:68, fontSize:11.5, fontWeight:700, color:'var(--maroon)', textAlign:'right', flexShrink:0 }}>
                    {fmt(m.total)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent withdrawals */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--maroon-dark)' }}>💸 Withdrawal History</h3>
          </div>
          <div>
            {withdrawals.length === 0 ? (
              <div className="empty-state" style={{ padding:'30px 20px' }}>
                <div style={{ fontSize:36 }}>🏦</div>
                <p style={{ marginTop:8, color:'var(--gray-400)', fontSize:13 }}>No withdrawals yet</p>
              </div>
            ) : withdrawals.slice(0,8).map(w => (
              <div key={w._id} style={{
                padding:'13px 20px',
                borderBottom:'1px solid var(--gray-100)',
                display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--maroon-dark)' }}>
                    {fmt(w.amount)}
                  </div>
                  <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>
                    {w.mobileMoneyProvider} · {w.phoneNumber}
                  </div>
                  <div style={{ fontSize:11, color:'var(--gray-300)', marginTop:1 }}>
                    {w.processedAt ? new Date(w.processedAt).toLocaleDateString('en-GB') : new Date(w.createdAt).toLocaleDateString('en-GB')}
                  </div>
                </div>
                <span className={`badge ${w.status === 'completed' ? 'badge-success' : w.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>
                  {w.status === 'completed' ? '✓ Paid' : w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Withdrawal modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:420 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--maroon-dark)' }}>
                  💸 Withdraw Earnings
                </h3>
                <p style={{ fontSize:13, color:'var(--gray-400)', marginTop:2 }}>Funds transferred via mobile money</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)} style={{ fontSize:18 }}>✕</button>
            </div>

            <form onSubmit={handleWithdraw}>
              <div className="modal-body">
                {/* Balance display */}
                <div style={{
                  background:'linear-gradient(135deg, var(--maroon-dark), var(--maroon))',
                  borderRadius:14, padding:'16px 20px', marginBottom:20,
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                      Available to Withdraw
                    </div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, color:'#fff', marginTop:2 }}>
                      {fmt(balance)}
                    </div>
                  </div>
                  <div style={{ fontSize:36 }}>💰</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (ZMW) *</label>
                  <input
                    type="number" className="form-input"
                    value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                    min={1} max={balance} step="0.01"
                    placeholder={`Max: ${fmt(balance)}`}
                    required
                    style={{ fontSize:16, fontWeight:600 }}
                  />
                  {/* Quick amount buttons */}
                  <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                    {[10, 20, 50, balance].filter(v => v > 0 && v <= balance).map(v => (
                      <button key={v} type="button"
                        onClick={() => setForm({...form, amount: v.toFixed(2)})}
                        style={{
                          padding:'4px 12px', borderRadius:6, border:'1.5px solid var(--maroon)',
                          background: Number(form.amount) === v ? 'var(--maroon)' : 'transparent',
                          color: Number(form.amount) === v ? 'white' : 'var(--maroon)',
                          fontSize:12, fontWeight:600, cursor:'pointer',
                        }}>
                        {v === balance ? 'Max' : `ZMW ${v}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Money Provider *</label>
                  <select className="form-input"
                    value={form.provider}
                    onChange={e => setForm({...form, provider: e.target.value})}>
                    <option value="Airtel Money">📱 Airtel Money</option>
                    <option value="MTN MoMo">📱 MTN MoMo</option>
                    <option value="Zamtel Kwacha">📱 Zamtel Kwacha</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input type="tel" className="form-input"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    placeholder="097XXXXXXX or 076XXXXXXX"
                    required
                    style={{ fontSize:15 }}
                  />
                </div>

                <div style={{
                  background:'var(--green-light)', borderRadius:10,
                  padding:'12px 16px', fontSize:13, color:'var(--green)',
                  border:'1px solid rgba(26,107,66,0.2)',
                  display:'flex', gap:10, alignItems:'flex-start',
                }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>✅</span>
                  <span>Your balance will be deducted immediately and the withdrawal is recorded as completed.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !form.amount || Number(form.amount) < 1}>
                  {submitting ? <><span className="spinner" /> Processing...</> : `💸 Withdraw ${form.amount ? fmt(form.amount) : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          div[style*="repeat(3,1fr)"] { grid-template-columns: 1fr 1fr !important; }
          div[style*="1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
