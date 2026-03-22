import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

export default function ParentChat() {
  const { user, setUnreadMessages } = useStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [sending, setSending] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const msgsEnd = useRef(null);
  const msgsBox = useRef(null);
  const inputRef = useRef(null);
  const mr = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const fileRef = useRef(null);

  const scrollBottom = () => {
    setTimeout(() => msgsBox.current && (msgsBox.current.scrollTop = msgsBox.current.scrollHeight), 50);
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/chat/${user._id}`);
        setMessages(r.data.messages || []);
        setUnreadMessages(0);
      } catch {}
      finally { setLoading(false); }
    })();
    const s = getSocket();
    if (s) {
      s.on('new_message', (msg) => {
        setMessages(p => p.find(m=>m._id===msg._id) ? p : [...p, msg]);
        setUnreadMessages(0);
        scrollBottom();
      });
      s.on('user_online', ({ userId, online }) => {
        // admin presence - we detect if admin room has members
      });
    }
    return () => { s?.off('new_message'); s?.off('user_online'); };
  }, []);

  useEffect(() => { scrollBottom(); }, [messages]);

  const send = useCallback(async (payload) => {
    if (sending) return;
    setSending(true);
    const s = getSocket();
    try {
      if (s?.connected) {
        s.emit('send_message', { senderId:user._id, senderRole:'parent', parentId:user._id, ...payload });
      } else {
        const r = await api.post('/chat', { parentId:user._id, ...payload });
        setMessages(p => [...p, r.data.message]);
      }
      scrollBottom();
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  }, [user._id, sending]);

  const sendText = () => {
    if (!input.trim()) return;
    send({ content:input.trim(), messageType:'text' });
    setInput('');
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      mr.current = new MediaRecorder(stream, { mimeType:'audio/webm' });
      chunks.current = [];
      mr.current.ondataavailable = e => chunks.current.push(e.data);
      mr.current.onstop = () => {
        const blob = new Blob(chunks.current, { type:'audio/webm' });
        const rd = new FileReader();
        rd.onload = () => send({ content:'🎤 Voice message', messageType:'voice', mediaData:rd.result, mediaMimeType:'audio/webm', duration:recordSec });
        rd.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop());
        setRecordSec(0);
      };
      mr.current.start();
      setRecording(true);
      timer.current = setInterval(() => setRecordSec(n=>n+1), 1000);
    } catch { toast.error('Microphone not available'); }
  };

  const stopRec = () => {
    if (mr.current?.state==='recording') {
      mr.current.stop(); clearInterval(timer.current);
      setRecording(false);
    }
  };

  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const img = f.type.startsWith('image/');
    const vid = f.type.startsWith('video/');
    if (f.size > (vid?15:5)*1024*1024) { toast.error(`Max ${vid?'15MB':'5MB'}`); return; }
    const rd = new FileReader();
    rd.onload = () => send({ content:img?'📷 Photo':'🎥 Video', messageType:img?'image':'video', mediaData:rd.result, mediaMimeType:f.type });
    rd.readAsDataURL(f);
    e.target.value='';
  };

  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark" />
    </div>
  );

  return (
    <div style={{
      position:'fixed',
      top:'var(--header-height)',
      left:0, right:0, bottom:0,
      display:'flex', flexDirection:'column',
      background:'var(--bg)',
    }}>
      {/* Header */}
      <div style={{
        padding:'12px 16px',
        background:'var(--bg-card)',
        borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:12,
        flexShrink:0,
        boxShadow:'0 2px 12px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width:40, height:40, borderRadius:'50%',
          background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:18, flexShrink:0, boxShadow:'0 0 10px rgba(155,24,38,0.35)',
          position:'relative',
        }}>
          🏫
          <span style={{
            position:'absolute', bottom:0, right:0, width:11, height:11,
            borderRadius:'50%', background:'#4ADE80',
            border:'2px solid var(--bg-card)',
          }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text)' }}>Peace Mindset Admin</div>
          <div style={{ fontSize:11.5, color:'#4ADE80', marginTop:1 }}>● School Administration</div>
        </div>
        <div style={{ fontSize:11, color:'var(--text-muted)', background:'var(--bg-elevated)', padding:'4px 10px', borderRadius:999, border:'1px solid var(--border)' }}>
          🔒 Secure
        </div>
      </div>

      {/* Messages */}
      <div ref={msgsBox} style={{
        flex:1, overflowY:'auto', padding:'12px 12px 0',
        WebkitOverflowScrolling:'touch',
        display:'flex', flexDirection:'column', gap:8,
      }}>
        {messages.length===0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', textAlign:'center', padding:'40px 20px' }}>
            <div style={{ fontSize:56, marginBottom:14 }}>💬</div>
            <div style={{ fontSize:17, fontWeight:600, marginBottom:6 }}>No messages yet</div>
            <div style={{ fontSize:13, lineHeight:1.6, color:'var(--border-bright)' }}>
              Send a message to the school.<br/>
              🎤 Voice · 📷 Photos · 🎥 Videos supported
            </div>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender?._id===user._id || msg.sender===user._id;
          const time = new Date(msg.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
          return (
            <div key={msg._id} style={{ display:'flex', flexDirection:isMe?'row-reverse':'row', gap:8, alignItems:'flex-end' }}>
              <div style={{
                width:28, height:28, borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:700, color:'#fff',
              }}>{isMe ? user?.name?.[0]?.toUpperCase() : 'A'}</div>
              <div style={{ maxWidth:'78%', display:'flex', flexDirection:'column', alignItems:isMe?'flex-end':'flex-start' }}>
                <div style={{
                  padding:msg.messageType==='text'?'10px 14px':'8px',
                  borderRadius:18,
                  borderBottomRightRadius:isMe?4:18,
                  borderBottomLeftRadius:isMe?18:4,
                  background:isMe?'linear-gradient(135deg,var(--maroon),var(--maroon-light))':'rgba(255,255,255,0.07)',
                  border:isMe?'none':'1px solid rgba(255,255,255,0.08)',
                  boxShadow:isMe?'0 2px 14px rgba(155,24,38,0.3)':'none',
                }}>
                  {msg.messageType==='text' && (
                    <p style={{ fontSize:14.5, color:isMe?'#fff':'var(--text)', lineHeight:1.55, margin:0, wordBreak:'break-word' }}>{msg.content}</p>
                  )}
                  {msg.messageType==='voice' && msg.mediaData && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:180, maxWidth:260 }}>
                      <span style={{ fontSize:20 }}>🎤</span>
                      <audio controls src={msg.mediaData} style={{ flex:1, height:34 }} />
                      {msg.duration && <span style={{ fontSize:11, color:isMe?'rgba(255,255,255,0.65)':'var(--text-muted)', flexShrink:0 }}>{fmt(msg.duration)}</span>}
                    </div>
                  )}
                  {msg.messageType==='image' && msg.mediaData && (
                    <img src={msg.mediaData} alt="Photo"
                      style={{ maxWidth:230, maxHeight:230, borderRadius:12, display:'block', cursor:'pointer', objectFit:'cover' }}
                      onClick={()=>window.open(msg.mediaData,'_blank')}
                    />
                  )}
                  {msg.messageType==='video' && msg.mediaData && (
                    <video controls src={msg.mediaData} style={{ maxWidth:230, maxHeight:180, borderRadius:12, display:'block' }} />
                  )}
                </div>
                <span style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:3, paddingLeft:4, paddingRight:4 }}>{time}</span>
              </div>
            </div>
          );
        })}
        <div ref={msgsEnd} style={{ height:8 }} />
      </div>

      {/* Recording bar */}
      {recording && (
        <div style={{
          margin:'8px 12px 0', padding:'9px 14px',
          background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
          borderRadius:12, display:'flex', alignItems:'center', gap:10,
          flexShrink:0,
        }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:'#EF4444', animation:'pulse 1s infinite', flexShrink:0 }} />
          <span style={{ fontSize:13, color:'#FC8181', fontWeight:600, flex:1 }}>Recording... {fmt(recordSec)}</span>
          <button onClick={stopRec} style={{ padding:'5px 14px', borderRadius:8, background:'#EF4444', border:'none', color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer' }}>
            ⬛ Send
          </button>
        </div>
      )}

      {/* Input bar - pinned to bottom */}
      <div style={{
        padding:'10px 12px 16px',
        background:'var(--bg-card)',
        borderTop:'1px solid var(--border)',
        flexShrink:0,
        boxShadow:'0 -2px 20px rgba(0,0,0,0.3)',
      }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }} />

        <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
          {/* Attach */}
          <button onClick={()=>fileRef.current?.click()} style={{
            width:42, height:42, borderRadius:12, flexShrink:0,
            background:'var(--bg-elevated)', border:'1px solid var(--border)',
            color:'var(--text-muted)', fontSize:19, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 0.15s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.color='var(--gold)';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-muted)';}}
          >📎</button>

          {/* Voice */}
          <button
            onMouseDown={startRec} onMouseUp={stopRec}
            onTouchStart={e=>{e.preventDefault();startRec();}}
            onTouchEnd={e=>{e.preventDefault();stopRec();}}
            style={{
              width:42, height:42, borderRadius:12, flexShrink:0,
              background:recording?'#EF4444':'var(--bg-elevated)',
              border:`1px solid ${recording?'#EF4444':'var(--border)'}`,
              color:recording?'#fff':'var(--text-muted)',
              fontSize:19, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:recording?'0 0 14px rgba(239,68,68,0.5)':'none',
              transition:'all 0.15s',
            }}
          >🎤</button>

          {/* Text */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();} }}
            placeholder="Type a message..."
            rows={1}
            style={{
              flex:1, padding:'11px 14px',
              background:'var(--bg-elevated)',
              border:'1.5px solid var(--border)',
              borderRadius:14, resize:'none', outline:'none',
              color:'var(--text)', fontFamily:'var(--font-body)',
              fontSize:'16px', lineHeight:1.5, maxHeight:110,
              transition:'border-color 0.15s',
            }}
            onFocus={e=>e.target.style.borderColor='var(--maroon-light)'}
            onBlur={e=>e.target.style.borderColor='var(--border)'}
          />

          {/* Send */}
          <button onClick={sendText} disabled={!input.trim()||sending} style={{
            width:42, height:42, borderRadius:12, flexShrink:0,
            background:input.trim()?'linear-gradient(135deg,var(--maroon),var(--maroon-light))':'var(--bg-elevated)',
            border:`1px solid ${input.trim()?'transparent':'var(--border)'}`,
            color:input.trim()?'#fff':'var(--text-muted)',
            fontSize:18, cursor:input.trim()?'pointer':'default',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:input.trim()?'0 0 12px rgba(155,24,38,0.35)':'none',
            transition:'all 0.18s',
          }}>
            {sending ? <span className="spinner" style={{width:16,height:16}} /> : '➤'}
          </button>
        </div>

        <div style={{ textAlign:'center', marginTop:6, fontSize:10.5, color:'rgba(255,255,255,0.18)' }}>
          Hold 🎤 to record · 📎 for photos & videos
        </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @media (max-width: 768px) {
          /* Override page-content padding for chat full-screen */
        }
      `}</style>
    </div>
  );
}
