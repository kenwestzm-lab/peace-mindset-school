import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const TERM_NAMES = { 1:'First Term', 2:'Second Term', 3:'Third Term' };

export default function ParentResults() {
  const { user } = useStore();
  const [children, setChildren] = useState([]);
  const [results, setResults] = useState({});   // { childId: [results] }
  const [access, setAccess] = useState({});      // { childId: { testFeeAccess, schoolFeeAccess } }
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [viewing, setViewing] = useState(null);  // { url, title }

  const load = async () => {
    try {
      const cRes = await api.get('/children');
      const childList = cRes.data.children || [];
      setChildren(childList);

      // Load results and access for each child
      const allResults = {};
      const allAccess = {};
      await Promise.all(childList.map(async child => {
        try {
          const [rRes, aRes] = await Promise.all([
            api.get(`/results/child/${child._id}`),
            api.get(`/payments/child/${child._id}/access`).catch(() => ({ data: { testFeeAccess: {}, schoolFeeAccess: false } })),
          ]);
          allResults[child._id] = rRes.data.results || [];
          allAccess[child._id] = aRes.data;
        } catch {}
      }));
      setResults(allResults);
      setAccess(allAccess);
    } catch (err) { toast.error('Failed to load results'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Real download function - works with both Cloudinary URLs and base64
  const handleDownload = async (result) => {
    if (!result.fileUrl) { toast.error('No file available'); return; }
    setDownloading(result._id);
    try {
      // Mark as accessed (consumes test fee for new views)
      if (result.paymentId && !result.alreadyAccessed) {
        await api.post(`/payments/test-access/${result.paymentId}`).catch(() => {});
      }

      if (result.fileUrl.startsWith('http')) {
        // Cloudinary URL - fetch and download
        const response = await fetch(result.fileUrl);
        const blob = await response.blob();
        const ext = result.fileUrl.includes('.pdf') ? 'pdf' : 'jpg';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.title || 'result'}-Term${result.term}-${result.year}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('✅ Downloaded!');
      } else if (result.fileUrl.startsWith('data:')) {
        // Base64 - direct download
        const a = document.createElement('a');
        a.href = result.fileUrl;
        a.download = `${result.title || 'result'}-Term${result.term}-${result.year}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('✅ Downloaded!');
      }
    } catch (err) {
      toast.error('Download failed: ' + err.message);
    } finally { setDownloading(null); }
  };

  // View result in full screen
  const handleView = async (result) => {
    if (!result.fileUrl) { toast.error('No file available'); return; }
    // Mark as accessed
    if (result.paymentId && !result.alreadyAccessed) {
      await api.post(`/payments/test-access/${result.paymentId}`).catch(() => {});
    }
    // Open in new tab for PDFs, or show in overlay for images
    if (result.fileUrl.includes('.pdf') || result.fileUrl.includes('application/pdf')) {
      window.open(result.fileUrl, '_blank');
    } else {
      setViewing({ url: result.fileUrl, title: result.title });
    }
  };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}><div className="spinner spinner-dark"/></div>;

  return (
    <div style={{ padding:'20px 16px 80px', maxWidth:700, margin:'0 auto' }}>
      {/* Image viewer overlay */}
      {viewing && (
        <div onClick={()=>setViewing(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.96)', zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ position:'absolute', top:16, right:16, display:'flex', gap:10 }}>
            <button onClick={e=>{e.stopPropagation();handleDownload({fileUrl:viewing.url,title:viewing.title,term:'',year:''});}} style={{ padding:'8px 16px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', borderRadius:10, cursor:'pointer', fontSize:13 }}>⬇ Download</button>
            <button onClick={()=>setViewing(null)} style={{ padding:'8px 16px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', borderRadius:10, cursor:'pointer', fontSize:13 }}>✕ Close</button>
          </div>
          <img src={viewing.url} alt={viewing.title} style={{ maxWidth:'95vw', maxHeight:'85vh', objectFit:'contain' }} onClick={e=>e.stopPropagation()}/>
          <div style={{ color:'rgba(255,255,255,0.7)', fontSize:14, marginTop:12 }}>{viewing.title}</div>
        </div>
      )}

      <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:20 }}>📋 Test Results</h2>

      {children.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text)' }}>No children registered yet</div>
        </div>
      )}

      {children.map(child => {
        const childResults = results[child._id] || [];
        const childAccess = access[child._id] || {};

        return (
          <div key={child._id} style={{ marginBottom:20 }}>
            {/* Child header */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#D4A843,#F0C86A)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#000', flexShrink:0 }}>
                {child.profilePic ? <img src={child.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : child.name?.[0]}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{child.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{child.grade}</div>
              </div>
            </div>

            {childResults.length === 0 ? (
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'24px 20px', textAlign:'center', color:'var(--text-muted)' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
                <div style={{ fontSize:13 }}>No results uploaded yet</div>
              </div>
            ) : childResults.map(result => {
              const isLocked = result.isLocked && !result.alreadyAccessed && !result.paymentId;
              const isFree = result.alreadyAccessed && result.free;

              return (
                <div key={result._id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <span style={{ fontSize:32, flexShrink:0 }}>📋</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:4 }}>{result.title}</div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>
                        {TERM_NAMES[result.term] || `Term ${result.term}`} · {result.year}
                      </div>

                      {isLocked ? (
                        // Locked - needs test fee payment
                        <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'10px 12px' }}>
                          <div style={{ fontSize:13, color:'#FC8181', fontWeight:600, marginBottom:4 }}>🔒 Locked</div>
                          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>Pay the test results fee to unlock this result</div>
                          <a href="/parent/payments" style={{ display:'inline-block', padding:'8px 16px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', color:'#fff', borderRadius:8, textDecoration:'none', fontSize:12, fontWeight:600 }}>
                            💳 Pay Test Fee
                          </a>
                        </div>
                      ) : (
                        // Unlocked - show actions
                        <div>
                          {isFree && <div style={{ fontSize:11, color:'#4ADE80', marginBottom:8 }}>✅ Previously paid — free to view</div>}
                          {result.subjects?.length > 0 && (
                            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>
                              Subjects: {result.subjects.join(' · ')}
                            </div>
                          )}
                          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                            {result.fileUrl && (
                              <>
                                <button
                                  onClick={() => handleView(result)}
                                  style={{ padding:'8px 16px', background:'rgba(37,211,102,0.1)', border:'1px solid rgba(37,211,102,0.3)', borderRadius:10, color:'#25D366', cursor:'pointer', fontSize:13, fontWeight:600 }}
                                >
                                  👁 View
                                </button>
                                <button
                                  onClick={() => handleDownload(result)}
                                  disabled={downloading === result._id}
                                  style={{ padding:'8px 16px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:10, color:'#fff', cursor: downloading===result._id ? 'default':'pointer', fontSize:13, fontWeight:600, opacity: downloading===result._id ? 0.7 : 1 }}
                                >
                                  {downloading === result._id ? '⏳ Downloading...' : '⬇ Download'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
