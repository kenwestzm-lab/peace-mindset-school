import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

export default function AdminChat() {
  const { user } = useStore();
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null); // selected parent
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'chat' — mobile nav
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const msgsBox = useRef(null);
  const mr = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const fileRef = useRef(null);

  const scrollBottom = () => setTimeout(() => msgsBox.current && (msgsBox.current.scrollTop = msgsBox.current.scrollHeight), 50);

  const loadConvs = async () => {
    try {
      const r = await api.get('/chat/admin/conversations');
      setConvs(r.data.conversations || []);
    } catch {} finally { setLoadingConvs(false); }
  };

  useEffect(() => {
    loadConvs();
    const s = getSocket();
    if (s) {
      s.on('new_message', (msg) => {
        setMessages(p => p.find(m=>m._id===msg._id) ? p : [...p, msg]);
        loadConvs();
        scrollBottom();
      });
      s.on('user_online', ({ userId, online }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          online ? next.add(userId) : next.delete(userId);
          return next;
        });
      });
      s.on('online_users', ({ userIds }) => {
        setOnlineUsers(new Set(userIds));
      });
    }
    return () => { s?.off('new_message'); s?.off('user_online'); s?.off('online_users'); };
  }, []);

  useEffect(() => { scrollBottom(); }, [messages]);

  const openChat = async (parent) => {
    setActive(parent);
    setView('chat');
    setLoadingMsgs(true);
    try {
      const r = await api.get(`/chat/${parent._id}`);
      setMessages(r.data.messages || []);
    } catch {} finally { setLoadingMsgs(false); }
  };

  const send = async (payload) => {
    if (!active) return;
    const s = getSocket();
    try {
      if (s?.connected) {
        s.emit('send_message', { senderId:user._id, senderRole:'admin', parentId:active._id, ...payload });
      } else {
        const r = await api.post('/chat', { parentId:active._id, ...payload });
        setMessages(p => [...p, r.data.message]);
      }
      scrollBottom();
    } catch { toast.error('Failed'); }
  };

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
    const f = e.target.files[0]; if (!f||!active) return;
    const img = f.type.startsWith('image/'); const vid = f.type.startsWith('video/');
    if (f.size > (vid?15:5)*1024*1024) { toast.error('File too large'); return; }
    const rd = new FileReader();
    rd.onload = () => send({ content:img?'📷 Photo':'🎥 Video', messageType:img?'image':'video', mediaData:rd.result, mediaMimeType:f.type });
    rd.readAsDataURL(f);
    e.target.value='';
  };

  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const typeIcon = t => t==='voice'?'🎤':t==='image'?'📷':t==='video'?'🎥':'';

  // ── CONVERSATION LIST ──────────────────────────────────────────────────────
  const ConvList = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, color:'var(--text)' }}>💬 Messages</h3>
        <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
          {convs.length} conversations · {onlineUsers.size} online
        </p>
      </div>
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
        {loadingConvs ? (
          <div style={{ display:'flex', justifyContent:'center', padding:24 }}><div className="spinner spinner-dark" /></div>
        ) : convs.length===0 ? (
          <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--text-muted)' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>💬</div>
            <div style={{ fontSize:14, fontWeight:600 }}>No messages yet</div>
            <div style={{ fontSize:12, marginTop:4 }}>Parents will appear here when they message</div>
          </div>
        ) : convs.map(conv => {
          const isOnline = onlineUsers.has(conv._id?.toString()) || onlineUsers.has(conv.parent?._id?.toString());
          return (
            <div key={conv._id} onClick={()=>openChat(conv.parent)}
              style={{
                padding:'13px 16px', cursor:'pointer',
                borderBottom:'1px solid var(--border)',
                transition:'background 0.12s',
                background:active?._id===conv.parent?._id?'rgba(155,24,38,0.1)':'transparent',
                borderLeft:`3px solid ${active?._id===conv.parent?._id?'var(--maroon-light)':'transparent'}`,
              }}
              onMouseEnter={e=>{ if(active?._id!==conv.parent?._id) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
              onMouseLeave={e=>{ if(active?._id!==conv.parent?._id) e.currentTarget.style.background=active?._id===conv.parent?._id?'rgba(155,24,38,0.1)':'transparent'; }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                {/* Avatar + online dot */}
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{
                    width:42, height:42, borderRadius:'50%',
                    background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:16, fontWeight:700, color:'#fff',
                  }}>
                    {conv.parent?.name?.[0]?.toUpperCase()||'?'}
                  </div>
                  <span style={{
                    position:'absolute', bottom:1, right:1,
                    width:12, height:12, borderRadius:'50%',
                    background:isOnline?'#4ADE80':'var(--border)',
                    border:'2px solid var(--bg-card)',
                  }} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontWeight:600, fontSize:14, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {conv.parent?.name||'Unknown'}
                    </span>
                    {conv.unreadCount>0 && (
                      <span style={{ background:'var(--maroon)', color:'#fff', borderRadius:999, fontSize:10, fontWeight:700, padding:'2px 7px', flexShrink:0, marginLeft:6 }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>
                    <span style={{ color:isOnline?'#4ADE80':'var(--border-bright)', fontSize:10 }}>{isOnline?'● Online':'○ Offline'}</span>
                    {conv.lastMessage && <span style={{ marginLeft:6 }}>{typeIcon(conv.lastMessageType)} {conv.lastMessage.substring(0,28)}{conv.lastMessage.length>28?'...':''}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── CHAT VIEW ──────────────────────────────────────────────────────────────
  const ChatView = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header with back */}
      <div style={{
        padding:'11px 14px', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:11, flexShrink:0,
        background:'var(--bg-card)',
        boxShadow:'0 2px 10px rgba(0,0,0,0.3)',
      }}>
        <button onClick={()=>setView('list')} style={{
          background:'none', border:'none', color:'var(--text-muted)', fontSize:22,
          cursor:'pointer', padding:'2px 6px', marginLeft:-4, flexShrink:0,
        }}>‹</button>
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{
            width:38, height:38, borderRadius:'50%',
            background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:15, fontWeight:700, color:'#fff',
          }}>{active?.name?.[0]?.toUpperCase()}</div>
          <span style={{
            position:'absolute', bottom:0, right:0, width:11, height:11,
            borderRadius:'50%', border:'2px solid var(--bg-card)',
            background:onlineUsers.has(active?._id?.toString())?'#4ADE80':'var(--border)',
          }} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:14.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {active?.name}
          </div>
          <div style={{ fontSize:11.5, marginTop:1, color:onlineUsers.has(active?._id?.toString())?'#4ADE80':'var(--text-muted)' }}>
            {onlineUsers.has(active?._id?.toString()) ? '● Online now' : '○ Offline'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={msgsBox} style={{
        flex:1, overflowY:'auto', padding:'12px 12px',
        WebkitOverflowScrolling:'touch', display:'flex', flexDirection:'column', gap:8,
      }}>
        {loadingMsgs ? (
          <div style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center' }}>
            <div className="spinner spinner-dark" />
          </div>
        ) : messages.length===0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', textAlign:'center', padding:20 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>💬</div>
            <div style={{ fontSize:14 }}>No messages yet. Start the conversation!</div>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender?._id===user._id||msg.sender===user._id;
          const time = new Date(msg.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
          return (
            <div key={msg._id} style={{ display:'flex', flexDirection:isMe?'row-reverse':'row', gap:7, alignItems:'flex-end' }}>
              <div style={{
                width:26, height:26, borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:700, color:'#fff',
              }}>{isMe?user?.name?.[0]?.toUpperCase():msg.sender?.name?.[0]?.toUpperCase()||'P'}</div>
              <div style={{ maxWidth:'78%', display:'flex', flexDirection:'column', alignItems:isMe?'flex-end':'flex-start' }}>
                <div style={{
                  padding:msg.messageType==='text'?'10px 13px':'8px',
                  borderRadius:16,
                  borderBottomRightRadius:isMe?3:16, borderBottomLeftRadius:isMe?16:3,
                  background:isMe?'linear-gradient(135deg,var(--maroon),var(--maroon-light))':'rgba(255,255,255,0.07)',
                  border:isMe?'none':'1px solid rgba(255,255,255,0.08)',
                  boxShadow:isMe?'0 2px 12px rgba(155,24,38,0.3)':'none',
                }}>
                  {msg.messageType==='text' && <p style={{ fontSize:14, color:isMe?'#fff':'var(--text)', lineHeight:1.55, margin:0, wordBreak:'break-word' }}>{msg.content}</p>}
                  {msg.messageType==='voice' && msg.mediaData && (
                    <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:160 }}>
                      <span>🎤</span>
                      <audio controls src={msg.mediaData} style={{ flex:1, height:30, maxWidth:180 }} />
                    </div>
                  )}
                  {msg.messageType==='image' && msg.mediaData && (
                    <img src={msg.mediaData} alt="Photo" style={{ maxWidth:210, maxHeight:210, borderRadius:10, display:'block', cursor:'pointer', objectFit:'cover' }}
                      onClick={()=>window.open(msg.mediaData,'_blank')} />
                  )}
                  {msg.messageType==='video' && msg.mediaData && (
                    <video controls src={msg.mediaData} style={{ maxWidth:210, maxHeight:160, borderRadius:10, display:'block' }} />
                  )}
                </div>
                <span style={{ fontSize:10, color:'var(--text-muted)', marginTop:2, padding:'0 3px' }}>{time}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recording bar */}
      {recording && (
        <div style={{ margin:'0 12px 6px', padding:'8px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:11, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#EF4444', animation:'pulse 1s infinite' }} />
          <span style={{ fontSize:13, color:'#FC8181', fontWeight:600, flex:1 }}>Recording... {fmt(recordSec)}</span>
          <button onClick={stopRec} style={{ padding:'5px 12px', borderRadius:8, background:'#EF4444', border:'none', color:'#fff', fontSize:12, cursor:'pointer' }}>⬛ Send</button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'9px 12px 14px', background:'var(--bg-card)', borderTop:'1px solid var(--border)', flexShrink:0, boxShadow:'0 -2px 16px rgba(0,0,0,0.25)' }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }} />
        <div style={{ display:'flex', alignItems:'flex-end', gap:7 }}>
          <button onClick={()=>fileRef.current?.click()} style={{ width:40, height:40, borderRadius:11, background:'var(--bg-elevated)', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--gold)';e.currentTarget.style.color='var(--gold)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text-muted)';}}>📎</button>
          <button
            onMouseDown={startRec} onMouseUp={stopRec}
            onTouchStart={e=>{e.preventDefault();startRec();}} onTouchEnd={e=>{e.preventDefault();stopRec();}}
            style={{ width:40, height:40, borderRadius:11, background:recording?'#EF4444':'var(--bg-elevated)', border:`1px solid ${recording?'#EF4444':'var(--border)'}`, color:recording?'#fff':'var(--text-muted)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>🎤</button>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();} }}
            placeholder={`Reply to ${active?.name?.split(' ')[0]}...`}
            rows={1} style={{ flex:1, padding:'10px 13px', background:'var(--bg-elevated)', border:'1.5px solid var(--border)', borderRadius:13, resize:'none', outline:'none', color:'var(--text)', fontFamily:'var(--font-body)', fontSize:'16px', maxHeight:100, lineHeight:1.5, transition:'border-color 0.15s' }}
            onFocus={e=>e.target.style.borderColor='var(--maroon-light)'}
            onBlur={e=>e.target.style.borderColor='var(--border)'}
          />
          <button onClick={sendText} disabled={!input.trim()} style={{ width:40, height:40, borderRadius:11, background:input.trim()?'linear-gradient(135deg,var(--maroon),var(--maroon-light))':'var(--bg-elevated)', border:`1px solid ${input.trim()?'transparent':'var(--border)'}`, color:input.trim()?'#fff':'var(--text-muted)', fontSize:17, cursor:input.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:input.trim()?'0 0 10px rgba(155,24,38,0.3)':'none', transition:'all 0.15s' }}>➤</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      position:'fixed',
      top:'var(--header-height)',
      left:0, right:0, bottom:0,
      background:'var(--bg-card)',
      display:'flex',
      overflow:'hidden',
    }}>
      {/* Desktop: side by side | Mobile: one at a time */}
      <div className="chat-convs" style={{
        width:300, flexShrink:0,
        borderRight:'1px solid var(--border)',
        overflow:'hidden',
        display:'flex', flexDirection:'column',
      }}>
        <ConvList />
      </div>
      <div className="chat-main" style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {view==='chat' && active ? <ChatView /> : (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', textAlign:'center', padding:20 }}>
            <div style={{ fontSize:56, marginBottom:14 }}>💬</div>
            <div style={{ fontSize:17, fontWeight:600, marginBottom:6 }}>Select a conversation</div>
            <div style={{ fontSize:13 }}>Choose a parent from the left to start messaging</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @media (max-width: 768px) {
          .chat-convs { width: 100% !important; display: ${view==='list'?'flex':'none'} !important; }
          .chat-main { display: ${view==='chat'?'flex':'none'} !important; width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
