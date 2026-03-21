import { useState, useEffect } from 'react';
import { useT } from '../../hooks/useT';
import api from '../../utils/api';
import { format } from 'date-fns';

export default function ParentResults() {
  const { t } = useT();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [results, setResults] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(true);

  useEffect(() => {
    api.get('/children').then((r) => {
      setChildren(r.data.children);
      setChildrenLoading(false);
    });
  }, []);

  const loadResults = async (childId) => {
    setLoading(true);
    try {
      const r = await api.get(`/results/child/${childId}`);
      setResults(r.data.results);
      setHasAccess(r.data.hasAccess);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectChild = (child) => {
    setSelectedChild(child);
    loadResults(child._id);
  };

  if (childrenLoading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="animate-in">
      <div className="mb-24">
        <h2 style={{ fontSize: 24, color: 'var(--maroon-dark)' }}>{t('testResults')}</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>View your children's academic results</p>
      </div>

      {children.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">👧</div>
          <h4>{t('noChildren')}</h4>
        </div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
          {/* Child selector */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header"><h3>Select Child</h3></div>
            <div style={{ padding: 8 }}>
              {children.map((c) => (
                <button key={c._id} onClick={() => selectChild(c)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 8, border: 'none',
                  background: selectedChild?._id === c._id ? 'var(--maroon-pale)' : 'transparent',
                  borderLeft: selectedChild?._id === c._id ? '3px solid var(--maroon)' : '3px solid transparent',
                  cursor: 'pointer', marginBottom: 2, transition: 'all 0.15s',
                  textAlign: 'left',
                }}>
                  <span style={{ fontSize: 22 }}>👦</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{c.grade}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Results panel */}
          <div>
            {!selectedChild ? (
              <div className="card"><div className="empty-state">
                <div className="empty-icon">📋</div>
                <h4>Select a child to view results</h4>
              </div></div>
            ) : loading ? (
              <div className="card"><div className="page-loader"><div className="spinner" /></div></div>
            ) : (
              <>
                {!hasAccess && (
                  <div className="alert alert-danger mb-16" style={{ fontSize: 14 }}>
                    🔒 {t('resultsLocked')}
                    <br /><a href="/parent/payments" style={{ color: 'var(--red)', fontWeight: 600 }}>
                      Pay now →
                    </a>
                  </div>
                )}

                {results.length === 0 ? (
                  <div className="card"><div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h4>{t('noResults')}</h4>
                  </div></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {results.map((r) => (
                      <div className="card" key={r._id}>
                        <div className="card-header">
                          <div>
                            <h3 style={{ fontSize: 16, fontFamily: 'var(--font-body)' }}>📋 {r.title}</h3>
                            <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                              Term {r.term} · {r.year} · Uploaded {format(new Date(r.createdAt), 'dd MMM yyyy')}
                            </p>
                          </div>
                          {r.isLocked ? (
                            <span className="badge badge-danger">🔒 Locked</span>
                          ) : (
                            <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm">
                              ⬇️ {t('downloadResult')}
                            </a>
                          )}
                        </div>

                        {r.subjects?.length > 0 && !r.isLocked && (
                          <div className="card-body">
                            <table>
                              <thead><tr>
                                <th>{t('subject')}</th><th>{t('score')}</th>
                                <th>{t('gradeLabel')}</th><th>{t('remarks')}</th>
                              </tr></thead>
                              <tbody>
                                {r.subjects.map((s, i) => (
                                  <tr key={i}>
                                    <td>{s.name}</td>
                                    <td><strong>{s.score}</strong></td>
                                    <td><span className={`badge ${s.score >= 80 ? 'badge-success' : s.score >= 50 ? 'badge-info' : 'badge-danger'}`}>{s.grade}</span></td>
                                    <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>{s.remarks}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {r.isLocked && (
                          <div className="card-body" style={{ textAlign: 'center', padding: '20px' }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
                            <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>{t('resultsLocked')}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 220px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
