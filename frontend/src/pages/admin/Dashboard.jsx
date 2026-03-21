import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import { format } from 'date-fns';
import { getSocket } from '../../utils/socket';

export default function AdminDashboard() {
  const { t } = useT();
  const [stats, setStats] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.get('/admin/dashboard');
      setStats(r.data.stats);
      setRecentPayments(r.data.recentPayments);
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
      socket.on('new_payment', () => load());
    }
    return () => getSocket()?.off('new_payment');
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const statCards = [
    { icon: '👪', label: t('totalParents'), value: stats?.totalParents || 0, bg: 'var(--blue-light)', color: 'var(--blue)' },
    { icon: '👧', label: t('totalChildren'), value: stats?.totalChildren || 0, bg: 'var(--maroon-pale)', color: 'var(--maroon)' },
    { icon: '⏳', label: t('pendingApprovals'), value: stats?.pendingPayments || 0, bg: 'var(--orange-light)', color: 'var(--orange)' },
    { icon: '💰', label: t('totalRevenue'), value: `ZMW ${(stats?.totalRevenue || 0).toLocaleString()}`, bg: 'var(--green-light)', color: 'var(--green)' },
  ];

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--maroon-dark), var(--maroon))',
        borderRadius: 'var(--radius-xl)', padding: '24px 30px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--white)', marginBottom: 4 }}>
            {t('adminDashboard')}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
            Peace Mindset Private School — Admin Panel
          </p>
        </div>
        <div style={{ fontSize: 48, opacity: 0.3 }}>🏫</div>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-24">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { to: '/admin/children', icon: '👧', label: t('manageChildren') },
          { to: '/admin/payments', icon: '💳', label: t('managePayments') },
          { to: '/admin/announcements', icon: '📢', label: t('announcements') },
          { to: '/admin/chat', icon: '💬', label: t('chat') },
        ].map((a) => (
          <Link key={a.to} to={a.to} style={{
            background: 'var(--white)', borderRadius: 'var(--radius-lg)',
            padding: '16px', textAlign: 'center',
            border: '1px solid var(--gray-100)',
            boxShadow: 'var(--shadow-xs)',
            textDecoration: 'none', transition: 'all 0.15s',
            display: 'block',
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-maroon)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-xs)'}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>{a.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>{a.label}</div>
          </Link>
        ))}
      </div>

      {/* Recent Payments */}
      <div className="card">
        <div className="card-header">
          <h3>💳 Recent Payments</h3>
          <Link to="/admin/payments" className="btn btn-secondary btn-sm">View All →</Link>
        </div>
        <div className="table-wrapper">
          {recentPayments.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">💳</div><h4>No payments yet.</h4></div>
          ) : (
            <table>
              <thead><tr>
                <th>Child</th><th>Parent</th><th>Type</th>
                <th>Amount</th><th>Date</th><th>Status</th><th>Action</th>
              </tr></thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p._id}>
                    <td><strong>{p.child?.name}</strong><br/><span className="text-xs text-muted">{p.child?.grade}</span></td>
                    <td>{p.parent?.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.paymentType.replace(/_/g, ' ')}</td>
                    <td><strong>ZMW {p.amount}</strong></td>
                    <td>{format(new Date(p.createdAt), 'dd MMM yyyy')}</td>
                    <td>
                      <span className={`badge ${p.status === 'approved' ? 'badge-success' : p.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.status === 'pending' && (
                        <Link to="/admin/payments" className="btn btn-sm btn-primary">Review</Link>
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
