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
  const [recordingTime, setRecordingTime] = useState(0);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const recordTimer = useRef(null);
  const fileInputRef = useRef(null);
  const messagesRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get(`/chat/${user._id}`);
        setMessages(r.data.messages);
        setUnreadMessages(0);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();

    const socket = getSocket();
    if (socket) {
      socket.on('new_message', (msg) => {
        setMessages(prev => prev.find(m=>m._id===msg._id) ? prev : [...prev, msg]);
        setUnreadMessages(0);
      });
    }
    return () => getSocket()?.off('new_message');
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = useCallback(async (payload) => {
    if (sending) return;
    setSending(true);
    const socket = getSocket();
    try {
      if (socket?.connected) {
        socket.emit('send_message', { senderId:user._id, senderRole:'parent', parentId:user._id, ...payload });
      } else {
        const r = await api.post('/chat', { parentId:user._id, ...payload });
        setMessages(prev => [...prev, r.data.message]);
      }
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  }, [user._id, sending]);

  const sendText = () => {
    if (!input.trim()) return;
    sendMessage({ content:input.trim(), messageType:'text' });
    setInput('');
    setTimeout(scrollToBottom, 100);
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
        reader.onload = () => {
          sendMessage({ content:'🎤 Voice message', messageType:'voice', mediaData:reader.result, mediaMimeType:'audio/webm', duration:recordingTime });
        };
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
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 15*1024*1024 : 5*1024*1024;
    if (file.size > maxSize) { toast.error(`Too large. Max ${isVideo?'15MB':'5MB'}`); return; }
    const reader = new FileReader();
    reader.onload = () => sendMessage({ content:isImage?'📷 Photo':'🎥 Video', messageType:isImage?'image':'video', mediaData:reader.result, mediaMimeType:file.type });
    reader.readAsDataURL(file);
    e.target.value='';
  };

  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  const MessageBubble = ({ msg }) => {
    const isMe = msg.sender?._id===user._id || msg.sender===user._id;
    const time = new Date(msg.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    return (
      <div style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start', gap:8, marginBottom:10, padding:'0 4px' }}>
        {!isMe && (
          <div style={{
            width:30, height:30, borderRadius:'50%', flexShrink:0, alignSelf:'flex-end',
            background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:700, color:'#fff',
          }}>A</div>
        )}
        <div style={{ maxWidth:'78%' }}>
          <div style={{
            padding: msg.messageType==='text' ? '10px 14px' : '8px',
            borderRadius:16,
            borderBottomRightRadius:isMe?3:16,
            borderBottomLeftRadius:isMe?16:3,
            background:isMe?'linear-gradient(135deg,var(--maroon),var(--maroon-light))':'rgba(255,255,255,0.06)',
            border:isMe?'none':'1px solid rgba(255,255,255,0.08)',
            boxShadow:isMe?'0 2px 12px rgba(155,24,38,0.3)':'none',
          }}>
            {msg.messageType==='text' && (
              <p style={{ fontSize:14, color:isMe?'#fff':'var(--text)', lineHeight:1.5, margin:0, wordBreak:'break-word' }}>{msg.content}</p>
            )}
            {msg.messageType==='voice' && msg.mediaData && (
              <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:160 }}>
                <span style={{ fontSize:18 }}>🎤</span>
                <audio controls src={msg.mediaData} style={{ height:32, flex:1, maxWidth:180 }} />
                {msg.duration && <span style={{ fontSize:11, color:isMe?'rgba(255,255,255,0.6)':'var(--text-muted)', flexShrink:0 }}>{fmt(msg.duration)}</span>}
              </div>
            )}
            {msg.messageType==='image' && msg.mediaData && (
              <img src={msg.mediaData} alt="Photo" style={{ maxWidth:220, maxHeight:220, borderRadius:10, display:'block', cursor:'pointer' }}
                onClick={()=>window.open(msg.mediaData,'_blank')} />
            )}
            {msg.messageType==='video' && msg.mediaData && (
              <video controls src={msg.mediaData} style={{ maxWidth:220, maxHeight:180, borderRadius:10, display:'block' }} />
            )}
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3, textAlign:isMe?'right':'left', paddingRight:isMe?0:4, paddingLeft:isMe?4:0 }}>{time}</div>
        </div>
        {isMe && (
          <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, alignSelf:'flex-end', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh' }}>
      <div className="spinner spinner-dark" />
    </div>
  );

  return (
    <div style={{
      display:'flex', flexDirection:'column',
      height:'calc(100dvh - var(--header-height) - 28px)',
      maxWidth:680, margin:'0 auto',
    }}>
      {/* Chat header */}
      <div style={{
        background:'var(--bg-elevated)', borderRadius:'16px 16px 0 0',
        padding:'13px 16px', border:'1px solid var(--border)', borderBottom:'none',
        display:'flex', alignItems:'center', gap:12, flexShrink:0,
      }}>
        <div style={{
          width:38, height:38, borderRadius:'50%',
          background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:17, boxShadow:'0 0 10px rgba(155,24,38,0.35)', flexShrink:0,
        }}>🏫</div>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text)' }}>Peace Mindset Admin</div>
          <div style={{ fontSize:11.5, color:'var(--green)', display:'flex', alignItems:'center', gap:5, marginTop:1 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', display:'inline-block' }} />
            School Administration
          </div>
        </div>
        <div style={{ marginLeft:'auto', fontSize:11.5, color:'var(--text-muted)' }}>
          🔒 Private & Secure
        </div>
      </div>

      {/* Messages area */}
      <div ref={messagesRef} style={{
        flex:1, overflowY:'auto', padding:'14px 8px',
        background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:'none', borderBottom:'none',
        WebkitOverflowScrolling:'touch',
      }}>
        {messages.length===0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--text-muted)', textAlign:'center', padding:20 }}>
            <div style={{ fontSize:52, marginBottom:14 }}>💬</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>Start a conversation</div>
            <div style={{ fontSize:13, lineHeight:1.5 }}>
              Send a message to the school.<br/>Voice, photos & videos supported!
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => <MessageBubble key={msg._id} msg={msg} />)}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input area - stays at bottom */}
      <div style={{
        background:'var(--bg-elevated)',
        borderRadius:'0 0 16px 16px',
        border:'1px solid var(--border)', borderTop:'none',
        padding:'10px 12px 12px',
        flexShrink:0,
      }}>
        {/* Recording indicator */}
        {recording && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'8px 12px', marginBottom:8,
            background:'rgba(239,68,68,0.1)', borderRadius:10,
            border:'1px solid rgba(239,68,68,0.25)',
          }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#EF4444', animation:'pulse 1s infinite', flexShrink:0 }} />
            <span style={{ fontSize:13, color:'#FC8181', fontWeight:600, flex:1 }}>🎤 Recording... {fmt(recordingTime)}</span>
            <button onClick={stopRecording} style={{
              padding:'5px 12px', borderRadius:7, background:'#EF4444', border:'none',
              color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer',
            }}>Stop & Send</button>
          </div>
        )}

        <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
          {/* Attach file */}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }} />
          <button onClick={()=>fileInputRef.current?.click()} style={{
            width:40, height:40, borderRadius:10, flexShrink:0,
            background:'var(--bg-card)', border:'1px solid var(--border)',
            color:'var(--text-muted)', fontSize:18, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 0.15s',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--gold)'; e.currentTarget.style.color='var(--gold)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)'; }}
          title="Send photo or video">📎</button>

          {/* Voice */}
          <button
            onMouseDown={startRecording} onMouseUp={stopRecording}
            onTouchStart={(e)=>{ e.preventDefault(); startRecording(); }}
            onTouchEnd={(e)=>{ e.preventDefault(); stopRecording(); }}
            style={{
              width:40, height:40, borderRadius:10, flexShrink:0,
              background:recording?'#EF4444':'var(--bg-card)',
              border:`1px solid ${recording?'#EF4444':'var(--border)'}`,
              color:recording?'#fff':'var(--text-muted)',
              fontSize:18, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:recording?'0 0 12px rgba(239,68,68,0.4)':'none',
              transition:'all 0.15s',
            }}
            title="Hold to record voice"
          >🎤</button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message..."
            rows={1}
            style={{
              flex:1, padding:'10px 13px',
              background:'var(--bg-card)',
              border:'1.5px solid var(--border)',
              borderRadius:12, resize:'none',
              color:'var(--text)', fontFamily:'var(--font-body)',
              fontSize:'16px', maxHeight:100, lineHeight:1.5,
              transition:'border-color 0.15s', outline:'none',
            }}
            onFocus={e=>e.target.style.borderColor='var(--maroon-light)'}
            onBlur={e=>e.target.style.borderColor='var(--border)'}
          />

          {/* Send */}
          <button onClick={sendText} disabled={!input.trim()||sending} style={{
            width:40, height:40, borderRadius:10, flexShrink:0,
            background:input.trim()?'linear-gradient(135deg,var(--maroon),var(--maroon-light))':'var(--bg-card)',
            border:`1px solid ${input.trim()?'var(--maroon)':'var(--border)'}`,
            color:input.trim()?'#fff':'var(--text-muted)',
            fontSize:17, cursor:input.trim()?'pointer':'not-allowed',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:input.trim()?'0 0 10px rgba(155,24,38,0.3)':'none',
            transition:'all 0.18s',
          }}>➤</button>
        </div>

        <div style={{ textAlign:'center', marginTop:7, fontSize:11, color:'rgba(255,255,255,0.2)' }}>
          Hold 🎤 for voice · 📎 for photos/videos · Enter to send
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
    </div>
  );
}
