import { useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function Disbursements() {
  const [tab, setTab] = useState('send');
  const [form, setForm] = useState({ amount: '', phone: '', name: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [paymentId, setPaymentId] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundResult, setRefundResult] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post('/disbursement/send', form);
      setResult(data);
      toast.success('💸 Money sent via MoMo!');
      setForm({ amount: '', phone: '', name: '', reason: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Disbursement failed');
    } finally { setLoading(false); }
  };

  const handleRefund = async (e) => {
    e.preventDefault();
    setRefundLoading(true); setRefundResult(null);
    try {
      const { data } = await api.post(`/payments/${paymentId}/refund`);
      setRefundResult(data);
      toast.success('✅ Refund sent via MoMo!');
      setPaymentId('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Refund failed');
    } finally { setRefundLoading(false); }
  };

  return (
    <div className="page-content">
      <h2 style={{ marginBottom: 4 }}>💸 Disbursements</h2>
      <p style={{ color: 'var(--gray-400)', marginBottom: 20, fontSize: 13 }}>
        Send money directly to MoMo numbers
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['send', 'refund'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t ? 'var(--maroon)' : 'var(--gray-100)',
            color: tab === t ? '#fff' : 'var(--gray-600)',
            fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
          }}>{t === 'send' ? '📤 Send Payment' : '↩️ Refund Payment'}</button>
        ))}
      </div>

      {tab === 'send' && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', maxWidth: 480 }}>
          <h3 style={{ marginBottom: 16, fontSize: 16 }}>Send Money via MTN MoMo</h3>
          <form onSubmit={handleSend}>
            <div className="form-group">
              <label className="form-label">Phone Number (MoMo)</label>
              <input className="form-input" placeholder="096XXXXXXX" value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (ZMW)</label>
              <input className="form-input" type="number" placeholder="0.00" value={form.amount}
                onChange={e => setForm({...form, amount: e.target.value})} required min="1" />
            </div>
            <div className="form-group">
              <label className="form-label">Recipient Name</label>
              <input className="form-input" placeholder="Full name" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Reason / Note</label>
              <input className="form-input" placeholder="e.g. Salary, Refund..." value={form.reason}
                onChange={e => setForm({...form, reason: e.target.value})} />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? '⏳ Sending...' : '💸 Send Money'}
            </button>
          </form>
          {result && (
            <div style={{ marginTop: 16, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
              <p style={{ color: '#16a34a', fontWeight: 600, margin: 0 }}>✅ Transfer Successful!</p>
              <p style={{ fontSize: 12, color: '#166534', margin: '4px 0 0', wordBreak: 'break-all' }}>
                Transfer ID: {result.transferId}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'refund' && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', maxWidth: 480 }}>
          <h3 style={{ marginBottom: 8, fontSize: 16 }}>Refund an Approved Payment</h3>
          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 16 }}>
            Enter the Payment ID to automatically refund the parent via MoMo
          </p>
          <form onSubmit={handleRefund}>
            <div className="form-group">
              <label className="form-label">Payment ID</label>
              <input className="form-input" placeholder="Paste payment _id here" value={paymentId}
                onChange={e => setPaymentId(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={refundLoading}>
              {refundLoading ? '⏳ Processing...' : '↩️ Send Refund'}
            </button>
          </form>
          {refundResult && (
            <div style={{ marginTop: 16, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
              <p style={{ color: '#16a34a', fontWeight: 600, margin: 0 }}>✅ Refund Sent!</p>
              <p style={{ fontSize: 12, color: '#166534', margin: '4px 0 0', wordBreak: 'break-all' }}>
                Transfer ID: {refundResult.transferId}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
