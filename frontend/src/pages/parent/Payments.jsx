import { useState, useEffect } from 'react';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { getSocket } from '../../utils/socket';

const GRADES = ['Baby Class','Reception','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
const LOWER_GRADES = ['Baby Class','Reception','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5'];

export default function ParentPayments() {
  const { t } = useT();
  const [payments, setPayments] = useState([]);
  const [children, setChildren] = useState([]);
  const [fees, setFees] = useState({ schoolFeeMonthly: 150, schoolFeeTermly: 450, testFeeLower: 30, testFeeUpper: 40 });
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    childId: '', paymentType: 'school_fee_monthly',
    mobileMoneyProvider: 'Airtel Money', transactionId: '', eventId: '',
  });
  const [proofFile, setProofFile] = useState(null);

  const load = async () => {
    try {
      const [p, c, f, e] = await Promise.all([
        api.get('/payments'), api.get('/children'),
        api.get('/payments/fees'), api.get('/events'),
      ]);
      setPayments(p.data.payments);
      setChildren(c.data.children);
      if (f.data.fees) setFees(f.data.fees);
      setEvents(e.data.events.filter((ev) => ev.paymentRequired));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    if (socket) {
      socket.on('payment_approved', () => load());
      socket.on('payment_rejected', () => load());
    }
    return () => {
      if (socket) {
        socket.off('payment_approved');
        socket.off('payment_rejected');
      }
    };
  }, []);

  const getAmount = () => {
    const child = children.find((c) => c._id === form.childId);
    if (form.paymentType === 'school_fee_monthly') return fees.schoolFeeMonthly;
    if (form.paymentType === 'school_fee_term') return fees.schoolFeeTermly;
    if (form.paymentType === 'test_fee' && child) {
      return LOWER_GRADES.includes(child.grade) ? fees.testFeeLower : fees.testFeeUpper;
    }
    if (form.paymentType === 'event_fee') {
      const ev = events.find((e) => e._id === form.eventId);
      return ev?.paymentAmount || 0;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.childId) { toast.error('Please select a child.'); return; }
    if (!form.transactionId.trim()) { toast.error('Transaction ID is required.'); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (proofFile) fd.append('proof', proofFile);

      await api.post('/payments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('paymentSubmitted'));
      setShowForm(false);
      setForm({ childId: '', paymentType: 'school_fee_monthly', mobileMoneyProvider: 'Airtel Money', transactionId: '', eventId: '' });
      setProofFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('payments')}</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>{t('paymentHistory')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + {t('makePayment')}
        </button>
      </div>

      {/* Payment instructions card */}
      <div style={{
        background: 'var(--gold-pale)', border: '1px solid var(--gold)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 24,
      }}>
        <h4 style={{ color: 'var(--maroon-dark)', marginBottom: 12, fontSize: 15 }}>
          📱 {t('paymentInstructions')}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{
            background: 'var(--white)', borderRadius: 10, padding: '14px 18px',
            border: '1px solid var(--gold)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 4 }}>Airtel Money</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--maroon)' }}>0977200127</div>
          </div>
          <div style={{
            background: 'var(--white)', borderRadius: 10, padding: '14px 18px',
            border: '1px solid var(--gold)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 4 }}>MTN MoMo</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--maroon)' }}>0960774535</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 12 }}>
          {t('enterTransactionId')}
        </p>
      </div>

      {/* Payments table */}
      <div className="card">
        <div className="card-header"><h3>💳 {t('paymentHistory')}</h3></div>
        <div className="table-wrapper">
          {payments.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">💳</div><h4>No payments yet.</h4></div>
          ) : (
            <table>
              <thead><tr>
                <th>Child</th><th>Type</th><th>Amount</th><th>Provider</th>
                <th>Transaction ID</th><th>Date</th><th>Status</th>
              </tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td><strong>{p.child?.name}</strong><br/><span className="text-xs text-muted">{p.child?.grade}</span></td>
                    <td>{p.paymentType.replace(/_/g, ' ')}</td>
                    <td><strong>ZMW {p.amount}</strong></td>
                    <td>{p.mobileMoneyProvider}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.transactionId}</td>
                    <td>{format(new Date(p.createdAt), 'dd MMM yyyy')}</td>
                    <td>
                      <span className={`badge ${p.status === 'approved' ? 'badge-success' : p.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                        {t(p.status)}
                      </span>
                      {p.status === 'rejected' && p.rejectionReason && (
                        <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>
                          {p.rejectionReason}
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

      {/* Payment modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💳 {t('makePayment')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('childName')}</label>
                  <select className="form-select" value={form.childId} onChange={(e) => setForm({ ...form, childId: e.target.value })} required>
                    <option value="">— Select child —</option>
                    {children.map((c) => <option key={c._id} value={c._id}>{c.name} ({c.grade})</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('paymentType')}</label>
                  <select className="form-select" value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}>
                    <option value="school_fee_monthly">{t('schoolFeeMonthly')}</option>
                    <option value="school_fee_term">{t('schoolFeeTermly')}</option>
                    <option value="test_fee">{t('testFee')}</option>
                    {events.length > 0 && <option value="event_fee">{t('eventFee')}</option>}
                  </select>
                </div>

                {form.paymentType === 'event_fee' && (
                  <div className="form-group">
                    <label className="form-label">Event</label>
                    <select className="form-select" value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })} required>
                      <option value="">— Select event —</option>
                      {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title} (ZMW {ev.paymentAmount})</option>)}
                    </select>
                  </div>
                )}

                {/* Amount preview */}
                {(form.childId || form.paymentType !== 'test_fee') && getAmount() > 0 && (
                  <div style={{
                    background: 'var(--green-light)', borderRadius: 10, padding: '14px 18px',
                    marginBottom: 16, border: '1px solid var(--green)',
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Amount to Pay</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>ZMW {getAmount()}</div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">{t('provider')}</label>
                  <select className="form-select" value={form.mobileMoneyProvider} onChange={(e) => setForm({ ...form, mobileMoneyProvider: e.target.value })}>
                    <option value="Airtel Money">Airtel Money (0977200127)</option>
                    <option value="MTN MoMo">MTN MoMo (0960774535)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('transactionId')} *</label>
                  <input type="text" className="form-input" value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} placeholder="e.g. AIR2024112345" required />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('proofUpload')}</label>
                  <input type="file" className="form-input" accept="image/*,.pdf" onChange={(e) => setProofFile(e.target.files[0])} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{t('cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? t('loading') : t('submitPayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
