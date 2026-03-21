import { useState, useEffect } from 'react';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getSocket } from '../../utils/socket';

export default function AdminPayments() {
  const { t } = useT();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(null);
  const [feesModal, setFeesModal] = useState(false);
  const [fees, setFees] = useState({ schoolFeeMonthly: 150, schoolFeeTermly: 450, testFeeLower: 30, testFeeUpper: 40 });
  const [savingFees, setSavingFees] = useState(false);

  const load = async () => {
    try {
      const [r, f] = await Promise.all([
        api.get(`/payments/register${filter !== 'all' ? `?status=${filter}` : ''}`),
        api.get('/payments/fees'),
      ]);
      setPayments(r.data.payments);
      if (f.data.fees) setFees(f.data.fees);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    if (socket) socket.on('new_payment', () => load());
    return () => getSocket()?.off('new_payment');
  }, [filter]);

  const approve = async (id) => {
    setProcessing(id);
    try {
      await api.put(`/payments/${id}/approve`);
      toast.success('Payment approved!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve.');
    } finally {
      setProcessing(null);
    }
  };

  const reject = async () => {
    setProcessing(rejectModal);
    try {
      await api.put(`/payments/${rejectModal}/reject`, { reason: rejectReason });
      toast.success('Payment rejected.');
      setRejectModal(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject.');
    } finally {
      setProcessing(null);
    }
  };

  const saveFees = async () => {
    setSavingFees(true);
    try {
      await api.put('/payments/fees', fees);
      toast.success('Fee settings updated!');
      setFeesModal(false);
    } catch (err) {
      toast.error('Failed to save fees.');
    } finally {
      setSavingFees(false);
    }
  };

  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('paymentRegister')}</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            {pendingCount > 0 && <span style={{ color: 'var(--orange)', fontWeight: 700 }}>⚠️ {pendingCount} pending </span>}
            {t('managePayments')}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => setFeesModal(true)}>
          ⚙️ {t('feeSettings')}
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
            {f === 'all' ? t('all') : t(f)}
            {f === 'pending' && pendingCount > 0 && (
              <span style={{
                background: 'var(--red)', color: 'white',
                borderRadius: 999, fontSize: 10, padding: '1px 6px', marginLeft: 4,
              }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrapper">
          {payments.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">💳</div><h4>No payments found.</h4></div>
          ) : (
            <table>
              <thead><tr>
                <th>Child / Grade</th><th>Parent</th><th>Type</th><th>Amount</th>
                <th>Provider</th><th>Transaction ID</th><th>Proof</th>
                <th>Date</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{p.child?.name}</strong><br/>
                      <span className="text-xs text-muted">{p.child?.grade}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{p.parent?.name}</div>
                      <div className="text-xs text-muted">{p.parent?.phone}</div>
                    </td>
                    <td style={{ fontSize: 12, textTransform: 'capitalize' }}>
                      {p.paymentType.replace(/_/g, ' ')}
                    </td>
                    <td><strong style={{ color: 'var(--maroon)' }}>ZMW {p.amount}</strong></td>
                    <td style={{ fontSize: 13 }}>{p.mobileMoneyProvider}</td>
                    <td>
                      <code style={{
                        background: 'var(--gray-100)', padding: '2px 8px',
                        borderRadius: 4, fontSize: 12,
                      }}>{p.transactionId}</code>
                    </td>
                    <td>
                      {p.proofUrl ? (
                        <a href={p.proofUrl} target="_blank" rel="noopener noreferrer"
                          className="btn btn-sm btn-ghost" style={{ fontSize: 12 }}>
                          👁️ View
                        </a>
                      ) : (
                        <span className="text-xs text-muted">None</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>{format(new Date(p.createdAt), 'dd MMM yyyy')}</td>
                    <td>
                      <div>
                        <span className={`badge ${p.status === 'approved' ? 'badge-success' : p.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                          {p.status}
                        </span>
                        {p.status === 'approved' && p.expiresAt && (
                          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                            Until {format(new Date(p.expiresAt), 'dd MMM yyyy')}
                          </div>
                        )}
                        {p.status === 'rejected' && p.rejectionReason && (
                          <div className="text-xs text-muted" style={{ marginTop: 2, color: 'var(--red)' }}>
                            {p.rejectionReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {p.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => approve(p._id)}
                            disabled={processing === p._id}
                            className="btn btn-sm btn-success"
                          >
                            {processing === p._id ? '...' : '✓ ' + t('approve')}
                          </button>
                          <button
                            onClick={() => setRejectModal(p._id)}
                            className="btn btn-sm btn-danger"
                          >
                            ✕ {t('reject')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>✕ {t('rejectPayment')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">{t('rejectionReason')}</label>
                <textarea className="form-textarea" value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Transaction ID not found, incorrect amount..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>{t('cancel')}</button>
              <button className="btn btn-danger" onClick={reject} disabled={processing === rejectModal}>
                {processing === rejectModal ? t('loading') : t('rejectPayment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fee Settings Modal */}
      {feesModal && (
        <div className="modal-overlay" onClick={() => setFeesModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ {t('feeSettings')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setFeesModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {[
                { key: 'schoolFeeMonthly', label: t('schoolFeeMonthlyLabel') },
                { key: 'schoolFeeTermly', label: t('schoolFeeTermlyLabel') },
                { key: 'testFeeLower', label: t('testFeeLowerLabel') },
                { key: 'testFeeUpper', label: t('testFeeUpperLabel') },
              ].map((f) => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input type="number" className="form-input" value={fees[f.key]}
                    onChange={(e) => setFees({ ...fees, [f.key]: Number(e.target.value) })}
                    min={0} />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setFeesModal(false)}>{t('cancel')}</button>
              <button className="btn btn-primary" onClick={saveFees} disabled={savingFees}>
                {savingFees ? t('loading') : t('updateFees')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
