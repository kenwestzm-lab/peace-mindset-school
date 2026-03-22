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
  const bottomRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recordTimer = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior:'smooth' });

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
      });
    }
    return () => getSocket()?.off('new_message');
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const openConversation = async (parent) => {
    setActiveParent(parent);
    setLoadingMsgs(true);
    try {
      const r = await api.get(`/chat/${parent._id}`);
      setMessages(r.data.messages);
    } catch {} finally { setLoadingMsgs(false); }
  };

  const sendMessage = async (payload) => {
    const socket = getSocket();
    try {
      if (socket?.connected) {
        socket.emit('send_message', {
          senderId: user._id, senderRole:'admin',
          parentId: activeParent._id, ...payload,
        });
      } else {
        const r = await api.post('/chat', { parentId: activeParent._id, ...payload });
        setMessages(prev => [...prev, r.data.message]);
      }
    } catch { toast.error('Failed to send'); }
  };

  const sendBroadcast = async () => {
    if (!input.trim()) return;
    try {
      const r = await api.post("/chat/broadcast", { content: input.trim(), messageType: "text" });
      toast.success(`Sent to ${r.data.count} parents!`);
      setInput("");
    } catch { toast.error("Broadcast failed"); }
  };


    const sendText = () => {
    if (!input.trim() || !activeParent) return;
    sendMessage({ content: input.trim(), messageType:'text' });
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
    const maxSize = isVideo ? 15*1024*1024 : 5*1024*1024;
    if (file.size > maxSize) { toast.error(`Too large. Max ${isVideo?'15MB':'5MB'}`); return; }
    const reader = new FileReader();
    reader.onload = () => sendMessage({ content: isImage?'📷 Photo':'🎥 Video', messageType:isImage?'image':'video', mediaData:reader.result, mediaMimeType:file.type });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  const msgTypeIcon = (type) => type==='voice'?'🎤':type==='image'?'📷':type==='video'?'🎥':'';

  return (
    <div style={{ height:'calc(100dvh - var(--header-height) - 32px)', display:'flex', gap:16 }}>
      {/* Conversations list */}
      <div style={{
        width:300, flexShrink:0, background:'var(--bg-card)',
        borderRadius:16, border:'1px solid var(--border)',
        display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--text)' }}>💬 Messages</h3>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{conversations.length} conversations</p>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {loadingConvs ? (
            <div style={{ display:'flex', justifyContent:'center', padding:20 }}><div className="spinner spinner-dark" /></div>
          ) : conversations.length===0 ? (
            <div style={{ padding:'30px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>💬</div>No messages yet
            </div>
          ) : conversations.map(conv => (
            <div key={conv._id} onClick={() => openConversation(conv.parent)}
              style={{
                padding:'13px 18px', cursor:'pointer', transition:'all 0.12s',
                borderBottom:'1px solid var(--border)',
                background: activeParent?._id===conv._id?.toString() ? 'var(--maroon-pale)' : 'transparent',
                borderLeft: activeParent?._id===conv._id?.toString() ? '3px solid var(--maroon-light)' : '3px solid transparent',
              }}
              onMouseEnter={e=>{ if(activeParent?._id!==conv._id?.toString()) e.currentTarget.style.background='var(--bg-elevated)'; }}
              onMouseLeave={e=>{ if(activeParent?._id!==conv._id?.toString()) e.currentTarget.style.background='transparent'; }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:36, height:36, borderRadius:'50%', flexShrink:0,
                  background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:700, color:'#fff',
                }}>
                  {conv.parent?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13.5, color:'var(--text)', display:'flex', justifyContent:'space-between' }}>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{conv.parent?.name || 'Unknown'}</span>
                    {conv.unreadCount>0 && (
                      <span style={{ background:'var(--maroon)', color:'#fff', borderRadius:999, fontSize:10, fontWeight:700, padding:'2px 6px', flexShrink:0, marginLeft:4 }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:1 }}>
                    {msgTypeIcon(conv.lastMessageType)} {conv.lastMessage?.substring(0,35)}{conv.lastMessage?.length>35?'...':''}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden', minWidth:0 }}>
        {!activeParent ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
            <div style={{ fontSize:52, marginBottom:12 }}>💬</div>
            <div style={{ fontSize:16, fontWeight:600 }}>Select a conversation</div>
            <div style={{ fontSize:13, marginTop:4 }}>Choose a parent from the left</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff' }}>
                {activeParent.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:15, color:'var(--text)' }}>{activeParent.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{activeParent.email}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
              {loadingMsgs ? (
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', flex:1 }}><div className="spinner spinner-dark" /></div>
              ) : messages.length===0 ? (
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>💬</div>
                  <div style={{ fontSize:14 }}>No messages yet. Start the conversation!</div>
                </div>
              ) : messages.map(msg => {
                const isMe = msg.sender?._id===user._id || msg.sender===user._id;
                const time = new Date(msg.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
                return (
                  <div key={msg._id} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start', gap:8 }}>
                    {!isMe && (
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#fff', fontWeight:700, flexShrink:0, alignSelf:'flex-end' }}>
                        {msg.sender?.name?.[0]?.toUpperCase()||'P'}
                      </div>
                    )}
                    <div style={{ maxWidth:'70%' }}>
                      <div style={{
                        padding: msg.messageType==='text'?'10px 14px':'8px 10px',
                        borderRadius:14,
                        borderBottomRightRadius:isMe?4:14,
                        borderBottomLeftRadius:isMe?14:4,
                        background:isMe?'linear-gradient(135deg,var(--maroon),var(--maroon-light))':'var(--bg-elevated)',
                        border:isMe?'none':'1px solid var(--border)',
                        boxShadow:isMe?'0 0 10px var(--maroon-glow)':'none',
                      }}>
                        {msg.messageType==='text' && <p style={{ fontSize:14, color:isMe?'#fff':'var(--text)', lineHeight:1.5, margin:0 }}>{msg.content}</p>}
                        {msg.messageType==='voice' && msg.mediaData && (
                          <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:160 }}>
                            <span style={{ fontSize:18 }}>🎤</span>
                            <audio controls src={msg.mediaData} style={{ height:30, flex:1 }} />
                            {msg.duration && <span style={{ fontSize:11, color:isMe?'rgba(255,255,255,0.7)':'var(--text-muted)' }}>{fmt(msg.duration)}</span>}
                          </div>
                        )}
                        {msg.messageType==='image' && msg.mediaData && (
                          <img src={msg.mediaData} alt="Photo" style={{ maxWidth:200, maxHeight:200, borderRadius:8, display:'block', cursor:'pointer' }}
                            onClick={()=>window.open(msg.mediaData,'_blank')} />
                        )}
                        {msg.messageType==='video' && msg.mediaData && (
                          <video controls src={msg.mediaData} style={{ maxWidth:200, maxHeight:160, borderRadius:8, display:'block' }} />
                        )}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, textAlign:isMe?'right':'left' }}>{time}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)' }}>
              {recording && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', marginBottom:8, background:'var(--red-bg)', borderRadius:10, border:'1px solid var(--red-border)' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--red)', animation:'pulse 1s infinite' }} />
                  <span style={{ fontSize:13, color:'var(--red)', fontWeight:600 }}>Recording... {fmt(recordingTime)}</span>
                  <button onClick={stopRecording} className="btn btn-danger btn-sm" style={{ marginLeft:'auto' }}>⬛ Stop & Send</button>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }} />
                <button onClick={()=>fileInputRef.current?.click()} style={{ width:38, height:38, borderRadius:8, background:'var(--bg-elevated)', border:'1px solid var(--border)', color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, cursor:'pointer', flexShrink:0 }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--gold)'; e.currentTarget.style.color='var(--gold)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)'; }}>📎</button>
                <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
                  style={{ width:38, height:38, borderRadius:8, background:recording?'var(--red)':'var(--bg-elevated)', border:`1px solid ${recording?'var(--red)':'var(--border)'}`, color:recording?'#fff':'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, cursor:'pointer', flexShrink:0 }}>🎤</button>
                <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
                  placeholder="Reply to parent..." rows={1}
                  style={{ flex:1, padding:'9px 13px', background:'var(--bg-elevated)', border:'1.5px solid var(--border)', borderRadius:10, resize:'none', color:'var(--text)', fontFamily:'var(--font-body)', fontSize:'16px', maxHeight:100, lineHeight:1.5, transition:'border-color 0.15s' }}
                  onFocus={e=>e.target.style.borderColor='var(--maroon-light)'}
                  onBlur={e=>e.target.style.borderColor='var(--border)'}
                />
                <button onClick={sendText} disabled={!input.trim()}
                  style={{ width:38, height:38, borderRadius:8, flexShrink:0, background:input.trim()?'linear-gradient(135deg,var(--maroon),var(--maroon-light))':'var(--bg-elevated)', border:`1px solid ${input.trim()?'var(--maroon)':'var(--border)'}`, color:input.trim()?'#fff':'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, cursor:input.trim()?'pointer':'not-allowed', transition:'all 0.15s' }}>➤</button>
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
