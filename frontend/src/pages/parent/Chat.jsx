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

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior:'smooth' });

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
        socket.emit('send_message', {
          senderId: user._id, senderRole:'parent',
          parentId: user._id, ...payload,
        });
      } else {
        const r = await api.post('/chat', { parentId: user._id, ...payload });
        setMessages(prev => [...prev, r.data.message]);
      }
    } catch (err) {
      toast.error('Failed to send message');
    } finally { setSending(false); }
  }, [user._id, sending]);

  const sendText = () => {
    if (!input.trim()) return;
    sendMessage({ content: input.trim(), messageType:'text' });
    setInput('');
  };

  const handleKey = (e) => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
  };

  // ── Voice recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType:'audio/webm' });
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = e => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type:'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          sendMessage({
            content: '🎤 Voice message',
            messageType: 'voice',
            mediaData: reader.result,
            mediaMimeType: 'audio/webm',
            duration: recordingTime,
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
        setRecordingTime(0);
      };

      mediaRecorder.current.start();
      setRecording(true);
      recordTimer.current = setInterval(() => setRecordingTime(t => t+1), 1000);
    } catch (err) {
      toast.error('Microphone not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state==='recording') {
      mediaRecorder.current.stop();
      clearInterval(recordTimer.current);
      setRecording(false);
    }
  };

  // ── Media upload ──
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 15*1024*1024 : 5*1024*1024;

    if (file.size > maxSize) {
      toast.error(`File too large. Max ${isVideo?'15MB':'5MB'}`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      sendMessage({
        content: isImage ? '📷 Photo' : '🎥 Video',
        messageType: isImage ? 'image' : 'video',
        mediaData: reader.result,
        mediaMimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark" />
    </div>
  );

  return (
    <div style={{ height:'calc(100dvh - var(--header-height) - 32px)', display:'flex', flexDirection:'column', maxWidth:700, margin:'0 auto' }}>
      {/* Header */}
      <div style={{
        background:'var(--bg-elevated)', borderRadius:'16px 16px 0 0',
        padding:'14px 18px', border:'1px solid var(--border)', borderBottom:'none',
        display:'flex', alignItems:'center', gap:12,
      }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 0 12px var(--maroon-glow)' }}>🏫</div>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, color:'var(--text)' }}>Peace Mindset Admin</div>
          <div style={{ fontSize:12, color:'var(--green)', display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', display:'inline-block' }} />
            School Administration
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex:1, overflowY:'auto', padding:'16px',
        background:'var(--bg-card)', border:'1px solid var(--border)', borderTop:'none', borderBottom:'none',
        display:'flex', flexDirection:'column', gap:10,
      }}>
        {messages.length===0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>💬</div>
            <div style={{ fontSize:15, fontWeight:600 }}>Start a conversation</div>
            <div style={{ fontSize:13, marginTop:4 }}>Send a message to the school administration</div>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender?._id===user._id || msg.sender===user._id;
          const time = new Date(msg.createdAt).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
          return (
            <div key={msg._id} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start', gap:8 }}>
              {!isMe && (
                <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0, alignSelf:'flex-end' }}>A</div>
              )}
              <div style={{ maxWidth:'72%' }}>
                <div style={{
                  padding: msg.messageType==='text' ? '10px 14px' : '8px 10px',
                  borderRadius:16,
                  borderBottomRightRadius: isMe ? 4 : 16,
                  borderBottomLeftRadius: isMe ? 16 : 4,
                  background: isMe ? 'linear-gradient(135deg,var(--maroon),var(--maroon-light))' : 'var(--bg-elevated)',
                  border: isMe ? 'none' : '1px solid var(--border)',
                  boxShadow: isMe ? '0 0 12px var(--maroon-glow)' : 'none',
                }}>
                  {/* Text */}
                  {msg.messageType==='text' && (
                    <p style={{ fontSize:14, color:isMe?'#fff':'var(--text)', lineHeight:1.5, margin:0 }}>{msg.content}</p>
                  )}
                  {/* Voice */}
                  {msg.messageType==='voice' && msg.mediaData && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:180 }}>
                      <span style={{ fontSize:20 }}>🎤</span>
                      <audio controls src={msg.mediaData} style={{ height:32, flex:1, filter:'invert(1) hue-rotate(180deg)' }} />
                      {msg.duration && <span style={{ fontSize:11, color:isMe?'rgba(255,255,255,0.7)':'var(--text-muted)' }}>{fmt(msg.duration)}</span>}
                    </div>
                  )}
                  {/* Image */}
                  {msg.messageType==='image' && msg.mediaData && (
                    <img src={msg.mediaData} alt="Photo" style={{ maxWidth:220, maxHeight:220, borderRadius:10, display:'block', cursor:'pointer' }}
                      onClick={() => window.open(msg.mediaData, '_blank')}
                    />
                  )}
                  {/* Video */}
                  {msg.messageType==='video' && msg.mediaData && (
                    <video controls src={msg.mediaData} style={{ maxWidth:220, maxHeight:180, borderRadius:10, display:'block' }} />
                  )}
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3, textAlign:isMe?'right':'left' }}>{time}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        background:'var(--bg-elevated)', borderRadius:'0 0 16px 16px',
        border:'1px solid var(--border)', borderTop:'none', padding:'12px 14px',
      }}>
        {/* Recording indicator */}
        {recording && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', marginBottom:8, background:'var(--red-bg)', borderRadius:10, border:'1px solid var(--red-border)' }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--red)', animation:'pulse 1s infinite' }} />
            <span style={{ fontSize:13, color:'var(--red)', fontWeight:600 }}>Recording... {fmt(recordingTime)}</span>
            <button onClick={stopRecording} className="btn btn-danger btn-sm" style={{ marginLeft:'auto' }}>
              ⬛ Stop & Send
            </button>
          </div>
        )}

        <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
          {/* Media buttons */}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }} />

          <button onClick={() => fileInputRef.current?.click()} style={{
            width:40, height:40, borderRadius:10, background:'var(--bg-card)',
            border:'1px solid var(--border)', color:'var(--text-muted)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18, cursor:'pointer', flexShrink:0, transition:'all 0.15s',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--gold)'; e.currentTarget.style.color='var(--gold)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)'; }}
          title="Send photo or video">📎</button>

          {/* Voice record button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            style={{
              width:40, height:40, borderRadius:10,
              background: recording ? 'var(--red)' : 'var(--bg-card)',
              border:`1px solid ${recording?'var(--red)':'var(--border)'}`,
              color: recording ? '#fff' : 'var(--text-muted)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, cursor:'pointer', flexShrink:0, transition:'all 0.15s',
              boxShadow: recording ? '0 0 12px rgba(239,68,68,0.4)' : 'none',
            }}
            title="Hold to record voice"
          >🎤</button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message..."
            rows={1}
            style={{
              flex:1, padding:'10px 14px',
              background:'var(--bg-card)', border:'1.5px solid var(--border)',
              borderRadius:12, resize:'none', color:'var(--text)',
              fontFamily:'var(--font-body)', fontSize:'16px',
              maxHeight:100, lineHeight:1.5,
              transition:'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor='var(--maroon-light)'}
            onBlur={e => e.target.style.borderColor='var(--border)'}
          />

          {/* Send button */}
          <button
            onClick={sendText}
            disabled={!input.trim() || sending}
            style={{
              width:40, height:40, borderRadius:10, flexShrink:0,
              background: input.trim() ? 'linear-gradient(135deg,var(--maroon),var(--maroon-light))' : 'var(--bg-card)',
              border:`1px solid ${input.trim()?'var(--maroon)':'var(--border)'}`,
              color: input.trim() ? '#fff' : 'var(--text-muted)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:17, cursor:input.trim()?'pointer':'not-allowed',
              transition:'all 0.18s',
              boxShadow: input.trim() ? '0 0 12px var(--maroon-glow)' : 'none',
            }}
          >➤</button>
        </div>
        <div style={{ fontSize:11, color:'var(--border-bright)', marginTop:6, textAlign:'center' }}>
          Hold 🎤 to record voice · 📎 to send photos & videos
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}
