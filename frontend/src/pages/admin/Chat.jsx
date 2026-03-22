import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

export default function AdminChat() {
  const { user } = useStore();
  const [conversations, setConversations] = useState([]);
  const [activeParent, setActiveParent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showConvs, setShowConvs] = useState(true); // mobile: show list or chat
  const messagesRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recordTimer = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  };

  const loadConversations = async () => {
    try {
      const r = await api.get('/chat/admin/conversations');
      setConversations(r.data.conversations);
    } catch {} finally { setLoadingConvs(false); }
  };

  useEffect(() => {
    loadConversations();
    const socket = getSocket();
    if (socket) {
      socket.on('new_message', (msg) => {
        setMessages(prev => prev.find(m=>m._id===msg._id) ? prev : [...prev, msg]);
        loadConversations();
        setTimeout(scrollToBottom, 100);
      });
    }
    return () => getSocket()?.off('new_message');
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const openConversation = async (parent) => {
    setActiveParent(parent);
    setShowConvs(false); // mobile: switch to chat view
    setLoadingMsgs(true);
    try {
      const r = await api.get(`/chat/${parent._id}`);
      setMessages(r.data.messages);
    } catch {} finally { setLoadingMsgs(false); }
  };

  const sendMessage = async (payload) => {
    if (!activeParent) return;
    const socket = getSocket();
    try {
      if (socket?.connected) {
        socket.emit('send_message', { senderId:user._id, senderRole:'admin', parentId:activeParent._id, ...payload });
      } else {
        const r = await api.post('/chat', { parentId:activeParent._id, ...payload });
        setMessages(prev => [...prev, r.data.message]);
      }
      setTimeout(scrollToBottom, 100);
    } catch { toast.error('Failed to send'); }
  };

  const sendText = () => {
    if (!input.trim() || !activeParent) return;
    sendMessage({ content:input.trim(), messageType:'text' });
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType:'audio/webm' });
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = e => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type:'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => sendMessage({ content:'🎤 Voice message', messageType:'voice', mediaData:reader.result, mediaMimeType:'audio/webm', duration:recordingTime });
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop());
        setRecordingTime(0);
      };
      mediaRecorder.current.start();
      setRecording(true);
      recordTimer.current = setInterval(() => setRecordingTime(t=>t+1), 1000);
    } catch { toast.error('Microphone not available'); }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state==='recording') {
      mediaRecorder.current.stop();
      clearInterval(recordTimer.current);
      setRecording(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file || !activeParent) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (file.size > (isVideo?15:5)*1024*1024) { toast.error('File too large'); return; }
    const reader = new FileReader();
    reader.onload = () => sendMessage({ content:isImage?'📷 Photo':'🎥 Video', messageType:isImage?'image':'video', mediaData:reader.result, mediaMimeType:file.type });
    reader.readAsDataURL(file);
    e.target.value='';
  };

  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  const msgTypeIcon = (type) => type==='voice'?'🎤':type==='image'?'📷':type==='video'?'🎥':'';

  const ChatArea = () => (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, height:'100%' }}>
      {/* Chat header */}
      <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        {/* Back button - mobile only */}
        <button onClick={()=>setShowConvs(true)} className="show-mobile-btn" style={{
          background:'none', border:'none', color:'var(--text-muted)', fontSize:20,
          cursor:'pointer', padding:'2px 6px', marginLeft:-4, display:'none',
        }}>←</button>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', flexShrink:0 }}>
          {activeParent?.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:14.5, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{activeParent?.name}</div>
          <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>{activeParent?.email}</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesRef} style={{ flex:1, overflowY:'auto', padding:'14px 10px', display:'flex', flexDirection:'column', WebkitOverflowScrolling:'touch' }}>
        {loadingMsgs ? (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', flex:1 }}><div className="spinner spinner-dark" /></div>
        ) : messages.length===0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:8 }}>💬</div>
            <div style={{ fontSize:14 }}>No messages yet</div>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender?._id===user._id || msg.sender===user._id;
          const time = new Date(msg.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
          return (
            <div key={msg._id} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start', gap:8, marginBottom:10 }}>
              {!isMe && (
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#fff', fontWeight:700, flexShrink:0, alignSelf:'flex-end' }}>
                  {msg.sender?.name?.[0]?.toUpperCase()||'P'}
                </div>
              )}
              <div style={{ maxWidth:'75%' }}>
                <div style={{
                  padding:msg.messageType==='text'?'9px 13px':'7px 9px',
                  borderRadius:14,
                  borderBottomRightRadius:isMe?3:14, borderBottomLeftRadius:isMe?14:3,
                  background:isMe?'linear-gradient(135deg,var(--maroon),var(--maroon-light))':'rgba(255,255,255,0.06)',
                  border:isMe?'none':'1px solid rgba(255,255,255,0.08)',
                  boxShadow:isMe?'0 2px 10px rgba(155,24,38,0.25)':'none',
                }}>
                  {msg.messageType==='text' && <p style={{ fontSize:13.5, color:isMe?'#fff':'var(--text)', lineHeight:1.5, margin:0, wordBreak:'break-word' }}>{msg.content}</p>}
                  {msg.messageType==='voice' && msg.mediaData && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:150 }}>
                      <span>🎤</span>
                      <audio controls src={msg.mediaData} style={{ height:28, flex:1, maxWidth:160 }} />
                    </div>
                  )}
                  {msg.messageType==='image' && msg.mediaData && (
                    <img src={msg.mediaData} alt="Photo" style={{ maxWidth:180, maxHeight:180, borderRadius:8, display:'block', cursor:'pointer' }}
                      onClick={()=>window.open(msg.mediaData,'_blank')} />
                  )}
                  {msg.messageType==='video' && msg.mediaData && (
                    <video controls src={msg.mediaData} style={{ maxWidth:180, maxHeight:140, borderRadius:8, display:'block' }} />
                  )}
                </div>
                <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:2, textAlign:isMe?'right':'left' }}>{time}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{ padding:'10px 12px 12px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
        {recording && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', marginBottom:8, background:'rgba(239,68,68,0.1)', borderRadius:9, border:'1px solid rgba(239,68,68,0.25)' }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#EF4444', animation:'pulse 1s infinite' }} />
            <span style={{ fontSize:12.5, color:'#FC8181', fontWeight:600, flex:1 }}>Recording... {fmt(recordingTime)}</span>
            <button onClick={stopRecording} style={{ padding:'4px 10px', borderRadius:7, background:'#EF4444', border:'none', color:'#fff', fontSize:11.5, cursor:'pointer' }}>Stop</button>
          </div>
        )}
        <div style={{ display:'flex', alignItems:'flex-end', gap:7 }}>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }} />
          <button onClick={()=>fileInputRef.current?.click()} style={{ width:38, height:38, borderRadius:9, background:'var(--bg-elevated)', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:17, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>📎</button>
          <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={e=>{e.preventDefault();startRecording();}} onTouchEnd={e=>{e.preventDefault();stopRecording();}}
            style={{ width:38, height:38, borderRadius:9, background:recording?'#EF4444':'var(--bg-elevated)', border:`1px solid ${recording?'#EF4444':'var(--border)'}`, color:recording?'#fff':'var(--text-muted)', fontSize:17, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>🎤</button>
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Reply to parent..."
            rows={1} style={{ flex:1, padding:'9px 12px', background:'var(--bg-elevated)', border:'1.5px solid var(--border)', borderRadius:10, resize:'none', color:'var(--text)', fontFamily:'var(--font-body)', fontSize:'16px', maxHeight:90, lineHeight:1.5, outline:'none', transition:'border-color 0.15s' }}
            onFocus={e=>e.target.style.borderColor='var(--maroon-light)'}
            onBlur={e=>e.target.style.borderColor='var(--border)'}
          />
          <button onClick={sendText} disabled={!input.trim()}
            style={{ width:38, height:38, borderRadius:9, background:input.trim()?'linear-gradient(135deg,var(--maroon),var(--maroon-light))':'var(--bg-elevated)', border:`1px solid ${input.trim()?'var(--maroon)':'var(--border)'}`, color:input.trim()?'#fff':'var(--text-muted)', fontSize:16, cursor:input.trim()?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>➤</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height:'calc(100dvh - var(--header-height) - 28px)', display:'flex', gap:14 }}>
      {/* Conversations list */}
      <div className={`conv-list${showConvs?'':' conv-hidden'}`} style={{
        width:290, flexShrink:0, background:'var(--bg-card)',
        borderRadius:16, border:'1px solid var(--border)',
        display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>💬 Messages</h3>
          <p style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:2 }}>{conversations.length} conversations</p>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {loadingConvs ? (
            <div style={{ display:'flex', justifyContent:'center', padding:20 }}><div className="spinner spinner-dark" /></div>
          ) : conversations.length===0 ? (
            <div style={{ padding:'30px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>💬</div>No messages yet
            </div>
          ) : conversations.map(conv => (
            <div key={conv._id} onClick={()=>openConversation(conv.parent)}
              style={{
                padding:'12px 16px', cursor:'pointer', transition:'all 0.12s',
                borderBottom:'1px solid var(--border)',
                background:activeParent?._id===conv.parent?._id?'rgba(155,24,38,0.12)':'transparent',
                borderLeft:`3px solid ${activeParent?._id===conv.parent?._id?'var(--maroon-light)':'transparent'}`,
              }}
              onMouseEnter={e=>{ if(activeParent?._id!==conv.parent?._id) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
              onMouseLeave={e=>{ if(activeParent?._id!==conv.parent?._id) e.currentTarget.style.background='transparent'; }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
                  {conv.parent?.name?.[0]?.toUpperCase()||'?'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{conv.parent?.name||'Unknown'}</span>
                    {conv.unreadCount>0 && (
                      <span style={{ background:'var(--maroon)', color:'#fff', borderRadius:999, fontSize:10, fontWeight:700, padding:'1px 6px', flexShrink:0, marginLeft:4 }}>{conv.unreadCount}</span>
                    )}
                  </div>
                  <div style={{ fontSize:11.5, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                    {msgTypeIcon(conv.lastMessageType)} {conv.lastMessage?.substring(0,32)}{conv.lastMessage?.length>32?'...':''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className={`chat-area${!showConvs?'':' chat-hidden'}`} style={{
        flex:1, display:'flex', flexDirection:'column',
        background:'var(--bg-card)', borderRadius:16,
        border:'1px solid var(--border)', overflow:'hidden', minWidth:0,
      }}>
        {!activeParent ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', textAlign:'center', padding:20 }}>
            <div style={{ fontSize:52, marginBottom:12 }}>💬</div>
            <div style={{ fontSize:16, fontWeight:600 }}>Select a conversation</div>
            <div style={{ fontSize:13, marginTop:4 }}>Choose a parent from the left to reply</div>
          </div>
        ) : <ChatArea />}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @media (max-width: 768px) {
          .conv-list { width: 100% !important; border-radius: 16px !important; }
          .conv-hidden { display: none !important; }
          .chat-area { width: 100% !important; border-radius: 16px !important; position: absolute; inset: var(--header-height) 0 0 0; margin: 14px; width: calc(100% - 28px) !important; }
          .chat-hidden { display: none !important; }
          .show-mobile-btn { display: flex !important; }
          div[style*="gap: 14px"] { position: relative; }
        }
      `}</style>
    </div>
  );
}
