import { useState, useEffect } from 'react';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// ── Earnings Ledger ────────────────────────────────────────────────────────────
export function DeveloperEarnings() {
  const { t } = useT();
  const [earnings, setEarnings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/developer/earnings').then((r) => {
      setEarnings(r.data.earnings);
      setTotal(r.data.total);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="mb-24">
        <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('earningsLedger')}</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>{total} earnings records</p>
      </div>
      <div className="card">
        <div className="table-wrapper">
          {earnings.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">💰</div><h4>No earnings yet. Earnings appear when payments are approved.</h4></div>
          ) : (
            <table>
              <thead><tr>
                <th>Date</th><th>Description</th><th>Amount</th>
                <th>Source Payment</th><th>Status</th>
              </tr></thead>
              <tbody>
                {earnings.map((e) => (
                  <tr key={e._id}>
                    <td style={{ fontSize: 13 }}>{format(new Date(e.createdAt), 'dd MMM yyyy · HH:mm')}</td>
                    <td style={{ fontSize: 13 }}>{e.description || 'Platform fee'}</td>
                    <td><strong style={{ color: 'var(--green)' }}>ZMW {e.amount.toFixed(2)}</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      {e.payment ? (
                        <span>ZMW {e.payment.amount} · {e.payment.paymentType?.replace(/_/g, ' ')}</span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${e.status === 'available' ? 'badge-success' : 'badge-default'}`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Withdrawal History ─────────────────────────────────────────────────────────
export function DeveloperWithdrawals() {
  const { t } = useT();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/developer/withdrawals').then((r) => {
    setWithdrawals(r.data.withdrawals);
    setLoading(false);
  });

  useEffect(() => { load(); }, []);

  const markCompleted = async (id) => {
    const ref = prompt('Enter the mobile money transaction reference:');
    if (!ref) return;
    try {
      await api.put(`/developer/withdrawals/${id}/complete`, { reference: ref });
      toast.success('Marked as completed.');
      load();
    } catch (err) { toast.error('Failed.'); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const totals = {
    pending: withdrawals.filter((w) => ['pending', 'processing'].includes(w.status)).reduce((s, w) => s + w.amount, 0),
    completed: withdrawals.filter((w) => w.status === 'completed').reduce((s, w) => s + w.amount, 0),
  };

  return (
    <div className="animate-in">
      <div className="mb-24">
        <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('withdrawalHistory')}</h2>
      </div>

      <div className="grid-2 mb-24">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--orange-light)' }}>⏳</div>
          <div className="stat-value">ZMW {totals.pending.toFixed(2)}</div>
          <div className="stat-label">Pending / Processing</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--green-light)' }}>✅</div>
          <div className="stat-value">ZMW {totals.completed.toFixed(2)}</div>
          <div className="stat-label">Total Completed</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {withdrawals.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">💸</div><h4>No withdrawals yet.</h4></div>
          ) : (
            <table>
              <thead><tr>
                <th>Date</th><th>Amount</th><th>Provider</th><th>Phone</th>
                <th>Reference</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w._id}>
                    <td style={{ fontSize: 13 }}>{format(new Date(w.createdAt), 'dd MMM yyyy · HH:mm')}</td>
                    <td><strong style={{ color: 'var(--maroon)' }}>ZMW {w.amount.toFixed(2)}</strong></td>
                    <td style={{ fontSize: 13 }}>{w.mobileMoneyProvider}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{w.phoneNumber}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      {w.reference || '—'}
                    </td>
                    <td>
                      <span className={`badge ${
                        w.status === 'completed' ? 'badge-success' :
                        w.status === 'failed' ? 'badge-danger' :
                        w.status === 'processing' ? 'badge-info' : 'badge-warning'
                      }`}>{w.status}</span>
                    </td>
                    <td>
                      {w.status === 'processing' && (
                        <button className="btn btn-sm btn-success" onClick={() => markCompleted(w._id)}>
                          ✓ {t('markCompleted')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeveloperEarnings;
