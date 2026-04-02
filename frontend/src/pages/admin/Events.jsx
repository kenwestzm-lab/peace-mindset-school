import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { useT } from '../../hooks/useT';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-ZM',{day:'numeric',month:'long',year:'numeric'}) : '';
const isPast  = d => d && new Date(d) < new Date();

const EMPTY = { title:'', titleFr:'', description:'', descriptionFr:'', eventDate:'', paymentRequired:false, paymentAmount:'' };

export default function AdminEvents() {
  const { t, language } = useT();
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);

  const load = async () => {
    try { const r = await api.get('/events'); setEvents(r.data.events || []); }
    catch { toast.error('Failed to load events'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const s = getSocket();
    if (!s) return;
    const onNew  = ({ event }) => setEvents(p => [event, ...p]);
    const onUpd  = ({ event }) => setEvents(p => p.map(e => e._id === event._id ? event : e));
    s.on('new_event', onNew);
    s.on('event_updated', onUpd);
    return () => { s.off('new_event', onNew); s.off('event_updated', onUpd); };
  }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit   = ev => {
    setEditing(ev);
    setForm({ title: ev.title||'', titleFr: ev.titleFr||'', description: ev.description||'',
              descriptionFr: ev.descriptionFr||'', eventDate: ev.eventDate ? ev.eventDate.substring(0,10) : '',
              paymentRequired: ev.paymentRequired||false, paymentAmount: ev.paymentAmount||'' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title || !form.description || !form.eventDate) { toast.error('Title, description and date required'); return; }
    if (form.paymentRequired && (!form.paymentAmount || +form.paymentAmount <= 0)) { toast.error('Enter payment amount'); return; }
    setSaving(true);
    try {
      const body = { ...form, paymentAmount: form.paymentRequired ? +form.paymentAmount : 0 };
      if (editing) { await api.put(`/events/${editing._id}`, body); toast.success('Event updated!'); }
      else         { await api.post('/events', body); toast.success('Event created! Parents notified in real time.'); }
      setShowForm(false); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const del = async id => {
    if (!window.confirm('Delete this event?')) return;
    try { await api.delete(`/events/${id}`); setEvents(p => p.filter(e => e._id !== id)); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const getTitle = ev => language === 'fr' && ev.titleFr ? ev.titleFr : ev.title;
  const getDesc  = ev => language === 'fr' && ev.descriptionFr ? ev.descriptionFr : ev.description;

  const inp = { padding:'11px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)',
                borderRadius:10, color:'var(--text)', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' };

  if (loading) return <div className="page-loader"><div className="spinner"/></div>;

  return (
    <div className="animate-in">
      <div className="flex-between mb-24">
        <div>
          <h2 style={{fontSize:24,color:'var(--maroon-dark)'}}>{t('upcomingEvents')}</h2>
          <p style={{color:'var(--gray-500)',fontSize:14}}>{events.length} event{events.length!==1?'s':''} total</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ {t('createEvent')}</button>
      </div>

      {events.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'60px 20px'}}>
          <div style={{fontSize:52,marginBottom:12}}>📅</div>
          <h3 style={{color:'var(--text)',marginBottom:8}}>{t('noEvents')}</h3>
          <button className="btn btn-primary" onClick={openCreate}>+ {t('createEvent')}</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {events.map(ev => (
            <div key={ev._id} className="card" style={{padding:18,opacity:isPast(ev.eventDate)?0.65:1}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:5}}>
                    <h3 style={{fontSize:16,fontWeight:700,color:'var(--text)',margin:0}}>{getTitle(ev)}</h3>
                    {ev.paymentRequired
                      ? <span style={{background:'rgba(186,117,23,0.12)',color:'var(--gold)',border:'1px solid rgba(186,117,23,0.3)',borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>
                          💳 ZMW {Number(ev.paymentAmount).toFixed(2)}
                        </span>
                      : <span style={{background:'rgba(22,163,74,0.1)',color:'#16a34a',border:'1px solid rgba(22,163,74,0.3)',borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700}}>
                          🎉 FREE
                        </span>
                    }
                    {isPast(ev.eventDate) && <span style={{fontSize:11,color:'var(--text-muted)',background:'var(--bg-elevated)',padding:'2px 8px',borderRadius:10}}>Past</span>}
                  </div>
                  {language==='fr' && ev.titleFr && ev.titleFr !== ev.title &&
                    <div style={{fontSize:12,color:'var(--text-muted)',fontStyle:'italic',marginBottom:4}}>🇫🇷 {ev.titleFr}</div>}
                  <p style={{fontSize:14,color:'var(--text-muted)',margin:'0 0 8px',lineHeight:1.5}}>{getDesc(ev)}</p>
                  <div style={{display:'flex',gap:16,fontSize:13,flexWrap:'wrap'}}>
                    <span style={{color:'var(--maroon)',fontWeight:600}}>📅 {fmtDate(ev.eventDate)}</span>
                    <span style={{color:'var(--gray-500)'}}>by {ev.createdBy?.name}</span>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(ev)}>✏️ {t('edit')}</button>
                  <button className="btn btn-danger btn-sm"    onClick={() => del(ev._id)}>🗑 {t('delete')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:520,maxHeight:'92vh',overflowY:'auto'}}>
            <div className="modal-header">
              <h3>{editing ? '✏️ Edit Event' : '+ ' + t('createEvent')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:14}}>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t('eventTitle')} (English) *</label>
                  <input style={inp} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Event title in English"/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t('eventTitle')} (Français)</label>
                  <input style={inp} value={form.titleFr} onChange={e=>setForm({...form,titleFr:e.target.value})} placeholder="Titre en français (optionnel)"/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t('eventDate')} *</label>
                  <input style={inp} type="date" value={form.eventDate} onChange={e=>setForm({...form,eventDate:e.target.value})}/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t('eventDescription')} (English) *</label>
                  <textarea style={{...inp,resize:'vertical',minHeight:70}} rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe the event..."/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">{t('eventDescription')} (Français)</label>
                  <textarea style={{...inp,resize:'vertical',minHeight:60}} rows={2} value={form.descriptionFr} onChange={e=>setForm({...form,descriptionFr:e.target.value})} placeholder="Description en français (optionnel)..."/>
                </div>
              </div>

              {/* Payment toggle */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 0',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)'}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>💳 {t('paymentRequired')}</div>
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{form.paymentRequired ? 'Parents will need to pay to attend' : 'Free event — no payment needed'}</div>
                </div>
                <div onClick={() => setForm(f=>({...f,paymentRequired:!f.paymentRequired}))}
                  style={{width:48,height:26,borderRadius:13,background:form.paymentRequired?'var(--maroon)':'var(--border)',position:'relative',cursor:'pointer',transition:'background .2s',flexShrink:0}}>
                  <div style={{position:'absolute',top:3,left:form.paymentRequired?24:3,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,0.25)'}}/>
                </div>
              </div>

              {form.paymentRequired ? (
                <div className="form-group">
                  <label className="form-label">{t('paymentAmount')} (ZMW) *</label>
                  <input style={inp} type="number" value={form.paymentAmount} onChange={e=>setForm({...form,paymentAmount:e.target.value})} placeholder="e.g. 50" min={1}/>
                </div>
              ) : (
                <div style={{background:'rgba(22,163,74,0.06)',border:'1px solid rgba(22,163,74,0.2)',borderRadius:10,padding:'12px 16px',textAlign:'center'}}>
                  <span style={{fontSize:13,color:'#16a34a',fontWeight:600}}>🎉 Free Event — parents pay nothing</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>{t('cancel')}</button>
              <button className="btn btn-primary"   onClick={save} disabled={saving}>{saving ? t('loading') : (editing ? t('save') : t('createEvent'))}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
