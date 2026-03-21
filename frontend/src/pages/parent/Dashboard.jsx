import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import { format } from 'date-fns';

const StatusBadge = ({ status }) => {
  const map = {
    paid: { label: 'Paid', cls: 'badge-success' },
    unpaid: { label: 'Unpaid', cls: 'badge-danger' },
    expired: { label: 'Expired', cls: 'badge-warning' },
    partial: { label: 'Partial', cls: 'badge-info' },
  };
  const s = map[status] || map.unpaid;
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
};

export default function ParentDashboard() {
  const { user } = useStore();
  const { t } = useT();
  const [children, setChildren] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, a, e, p] = await Promise.all([
          api.get('/children'),
          api.get('/announcements'),
          api.get('/events'),
          api.get('/payments'),
        ]);
        setChildren(c.data.children);
        setAnnouncements(a.data.announcements);
        setEvents(e.data.events);
        setPayments(p.data.payments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const pendingPayments = payments.filter((p) => p.status === 'pending').length;

  const priorityColor = { urgent: 'var(--red)', important: 'var(--orange)', normal: 'var(--blue)' };

  return (
    <div className="animate-in">
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--maroon-dark), var(--maroon))',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        marginBottom: 28,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -20, top: -20,
          fontSize: 120, opacity: 0.08,
        }}>🕊️</div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24, color: 'var(--white)', marginBottom: 6,
        }}>
          {t('welcome')}, {user?.name?.split(' ')[0]}!
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
          Peace Mindset Private School — Better Education
        </p>
      </div>

      {/* Stats row */}
      <div className="grid-3 mb-24">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--maroon-pale)' }}>👨‍👩‍👧</div>
          <div className="stat-value">{children.length}</div>
          <div className="stat-label">{t('totalChildren')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--orange-light)' }}>⏳</div>
          <div className="stat-value">{pendingPayments}</div>
          <div className="stat-label">{t('pendingPayments')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--green-light)' }}>📢</div>
          <div className="stat-value">{announcements.length}</div>
          <div className="stat-label">{t('announcements')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Children */}
        <div className="card">
          <div className="card-header">
            <h3>👨‍👩‍👧 {t('myChildren')}</h3>
            <Link to="/parent/children" className="btn btn-secondary btn-sm">{t('view')} →</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {children.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="empty-icon">👧</div>
                <h4>{t('noChildren')}</h4>
              </div>
            ) : (
              children.map((child) => (
                <div key={child._id} style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--gray-100)',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--maroon-pale)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>👦</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--gray-700)', fontSize: 14 }}>
                      {child.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      {child.grade} · {child.gradeTeacher}
                    </div>
                  </div>
                  <StatusBadge status={child.paymentStatus} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Announcements */}
        <div className="card">
          <div className="card-header">
            <h3>📢 {t('announcements')}</h3>
            <Link to="/parent/announcements" className="btn btn-secondary btn-sm">{t('view')} →</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {announcements.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="empty-icon">📭</div>
                <h4>{t('noAnnouncements')}</h4>
              </div>
            ) : (
              announcements.slice(0, 4).map((a) => (
                <div key={a._id} style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--gray-100)',
                  borderLeft: `3px solid ${priorityColor[a.priority] || 'var(--blue)'}`,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-700)', marginBottom: 2 }}>
                    {user?.language === 'fr' && a.titleFr ? a.titleFr : a.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                    {format(new Date(a.createdAt), 'dd MMM yyyy')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card">
          <div className="card-header">
            <h3>🗓️ {t('upcomingEvents')}</h3>
            <Link to="/parent/events" className="btn btn-secondary btn-sm">{t('view')} →</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {events.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="empty-icon">📅</div>
                <h4>{t('noEvents')}</h4>
              </div>
            ) : (
              events.slice(0, 3).map((ev) => (
                <div key={ev._id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>
                        {user?.language === 'fr' && ev.titleFr ? ev.titleFr : ev.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        {format(new Date(ev.eventDate), 'dd MMM yyyy')}
                      </div>
                    </div>
                    {ev.paymentRequired && (
                      <span className="badge badge-maroon">ZMW {ev.paymentAmount}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card">
          <div className="card-header">
            <h3>💳 {t('paymentHistory')}</h3>
            <Link to="/parent/payments" className="btn btn-secondary btn-sm">{t('view')} →</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {payments.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <div className="empty-icon">💳</div>
                <h4>No payments yet.</h4>
              </div>
            ) : (
              payments.slice(0, 4).map((pay) => (
                <div key={pay._id} style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--gray-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{pay.child?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      ZMW {pay.amount} · {format(new Date(pay.createdAt), 'dd MMM')}
                    </div>
                  </div>
                  <span className={`badge ${
                    pay.status === 'approved' ? 'badge-success' :
                    pay.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {t(pay.status)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
