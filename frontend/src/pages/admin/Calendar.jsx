import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  open:    { label:'School Open',   color:'var(--green)',  bg:'var(--green-bg)',  border:'var(--green-border)',  emoji:'🟢' },
  closed:  { label:'School Closed', color:'var(--red)',    bg:'var(--red-bg)',    border:'var(--red-border)',    emoji:'🔴' },
  holiday: { label:'Holiday',       color:'var(--gold)',   bg:'var(--gold-pale)', border:'rgba(212,168,67,0.3)', emoji:'🎉' },
  event:   { label:'Special Event', color:'var(--blue)',   bg:'var(--blue-bg)',   border:'var(--blue-border)',   emoji:'⭐' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function AdminCalendar() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState({ month: today.getMonth(), year: today.getFullYear() });
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [form, setForm] = useState({ status:'closed', title:'', description:'' });
  const [saving, setSaving] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const loadEvents = async () => {
    try {
      const r = await api.get(`/calendar?month=${currentDate.month+1}&year=${currentDate.year}`);
      const map = {};
      r.data.events.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        map[key] = e;
      });
      setEvents(map);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadUpcoming = async () => {
    try {
      const r = await api.get('/calendar/upcoming');
      setUpcomingEvents(r.data.events);
    } catch {}
  };

  useEffect(() => { loadEvents(); loadUpcoming(); }, [currentDate]);

  const getDaysInMonth = (month, year) => new Date(year, month+1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const handleDayClick = (day) => {
    const d = new Date(currentDate.year, currentDate.month, day);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    setSelectedDate({ day, date: d, key, existing: events[key] || null });
    if (events[key]) {
      setForm({ status: events[key].status, title: events[key].title, description: events[key].description || '' });
    } else {
      setForm({ status:'closed', title:'', description:'' });
    }
    setModal(true);
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Please enter a title');
    setSaving(true);
    try {
      const dateStr = selectedDate.date.toISOString().split('T')[0];
      await api.post('/calendar', { date: dateStr, ...form });
      toast.success('Calendar updated! All parents notified 📢');
      setModal(false);
      loadEvents();
      loadUpcoming();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const deleteEvent = async () => {
    if (!selectedDate?.existing) return;
    try {
      await api.delete(`/calendar/${selectedDate.existing._id}`);
      toast.success('Event removed');
      setModal(false);
      loadEvents();
      loadUpcoming();
    } catch { toast.error('Failed to delete'); }
  };

  const sendReminders = async () => {
    try {
      const r = await api.post('/admin/send-reminders');
      toast.success(r.data.message);
    } catch (err) { toast.error('Failed to send reminders'); }
  };

  const daysInMonth = getDaysInMonth(currentDate.month, currentDate.year);
  const firstDay = getFirstDayOfMonth(currentDate.month, currentDate.year);

  const prevMonth = () => {
    setCurrentDate(prev => prev.month===0
      ? { month:11, year:prev.year-1 }
      : { month:prev.month-1, year:prev.year }
    );
  };
  const nextMonth = () => {
    setCurrentDate(prev => prev.month===11
      ? { month:0, year:prev.year+1 }
      : { month:prev.month+1, year:prev.year }
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📅 School Calendar</h2>
          <p className="page-subtitle">Schedule school open/close days — parents notified in real-time</p>
        </div>
        <button className="btn btn-gold" onClick={sendReminders}>
          🔔 Send Payment Reminders
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:20, alignItems:'start' }}>
        {/* Calendar */}
        <div className="card">
          {/* Month nav */}
          <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>← Prev</button>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--text)', fontWeight:700 }}>
              {MONTHS[currentDate.month]} {currentDate.year}
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Next →</button>
          </div>

          <div style={{ padding:16 }}>
            {/* Day labels */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', padding:'4px 0' }}>{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
              {/* Empty cells */}
              {Array.from({ length:firstDay }).map((_,i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Day cells */}
              {Array.from({ length:daysInMonth }).map((_,i) => {
                const day = i+1;
                const d = new Date(currentDate.year, currentDate.month, day);
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                const event = events[key];
                const isToday = d.toDateString()===today.toDateString();
                const isSunday = d.getDay()===0;
                const cfg = event ? STATUS_CONFIG[event.status] : null;

                return (
                  <button key={day} onClick={() => handleDayClick(day)} style={{
                    aspectRatio:'1', borderRadius:10,
                    background: cfg ? cfg.bg : isToday ? 'var(--maroon-pale)' : isSunday ? 'rgba(239,68,68,0.05)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${isToday ? 'var(--maroon-light)' : cfg ? cfg.border : 'var(--border)'}`,
                    cursor:'pointer', display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center', gap:2,
                    transition:'all 0.15s',
                    boxShadow: isToday ? '0 0 10px var(--maroon-glow)' : 'none',
                  }}
                  onMouseEnter={e=>{ e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.zIndex='2'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.4)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.zIndex=''; e.currentTarget.style.boxShadow=isToday?'0 0 10px var(--maroon-glow)':'none'; }}
                  >
                    {event && <span style={{ fontSize:10 }}>{cfg.emoji}</span>}
                    <span style={{
                      fontSize:13, fontWeight:isToday?700:400,
                      color: cfg ? cfg.color : isToday ? 'var(--maroon-light)' : isSunday ? 'var(--red)' : 'var(--text)',
                    }}>{day}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ padding:'12px 22px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:14, flexWrap:'wrap' }}>
            {Object.entries(STATUS_CONFIG).map(([key,cfg]) => (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
                <span>{cfg.emoji}</span>
                <span>{cfg.label}</span>
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
              <div style={{ width:12, height:12, borderRadius:3, background:'var(--maroon-pale)', border:'1.5px solid var(--maroon-light)' }} />
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Upcoming events */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>📋 Upcoming Events</h3>
          </div>
          {upcomingEvents.length === 0 ? (
            <div style={{ padding:'30px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
              No upcoming events
            </div>
          ) : upcomingEvents.map(ev => {
            const cfg = STATUS_CONFIG[ev.status];
            const d = new Date(ev.date);
            return (
              <div key={ev._id} style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', borderLeft:`3px solid ${cfg.color}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span>{cfg.emoji}</span>
                  <span style={{ fontSize:13.5, fontWeight:600, color:'var(--text)' }}>{ev.title}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                  {d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })}
                </div>
                {ev.description && <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:3 }}>{ev.description}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modal && selectedDate && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:420 }}>
            <div style={{ height:2, background:'linear-gradient(90deg, var(--maroon), var(--gold))', opacity:0.8 }} />
            <div className="modal-header">
              <div>
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, color:'var(--text)' }}>
                  {selectedDate.date.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}
                </h3>
                <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  {selectedDate.existing ? 'Edit event' : 'Add event to this day'}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setModal(false)} style={{ fontSize:18 }}>✕</button>
            </div>

            <form onSubmit={saveEvent}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {Object.entries(STATUS_CONFIG).map(([key,cfg]) => (
                      <button key={key} type="button" onClick={()=>setForm({...form,status:key})} style={{
                        padding:'10px 12px', borderRadius:10, cursor:'pointer',
                        background: form.status===key ? cfg.bg : 'var(--bg-elevated)',
                        border:`1.5px solid ${form.status===key ? cfg.color : 'var(--border)'}`,
                        color: form.status===key ? cfg.color : 'var(--text-muted)',
                        fontSize:12.5, fontWeight:600, display:'flex', alignItems:'center', gap:6,
                        transition:'all 0.15s',
                      }}>
                        <span>{cfg.emoji}</span> {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={form.title}
                    onChange={e=>setForm({...form,title:e.target.value})}
                    placeholder={form.status==='closed'?'School Closed - Teacher Training':form.status==='holiday'?'Independence Day Holiday':'Title...'}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description <span style={{ fontWeight:400, textTransform:'none', fontSize:10 }}>(optional)</span></label>
                  <textarea className="form-input" value={form.description}
                    onChange={e=>setForm({...form,description:e.target.value})}
                    placeholder="Additional details for parents..."
                    rows={2}
                  />
                </div>

                <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--blue-bg)', border:'1px solid var(--blue-border)', fontSize:12.5, color:'var(--blue)' }}>
                  📢 All parents will be notified immediately via the app.
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent:'space-between' }}>
                {selectedDate.existing && (
                  <button type="button" className="btn btn-danger" onClick={deleteEvent}>🗑 Remove</button>
                )}
                <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
                  <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner"/> Saving...</> : '💾 Save & Notify'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="1fr 300px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
