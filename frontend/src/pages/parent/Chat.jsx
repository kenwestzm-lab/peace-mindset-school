import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { useStore } from '../../store/useStore';
import { uploadMedia } from '../../utils/mediaUpload';
import toast from 'react-hot-toast';

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDay = d => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

/* ─── Styles ──────────────────────────────────────────────────────── */
const av = (s, bg) => ({ width: s, height: s, borderRadius: '50%', background: bg || 'linear-gradient(135deg,#2A3942,#3B4A54)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(s * 0.38), fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0 });
const avImg = { width: '100%', height: '100%', objectFit: 'cover' };
const inputBarStyle = { display: 'flex', alignItems: 'flex-end', gap: 8, padding: '6px 10px 8px', background: '#1F2C34', flexShrink: 0 };
const textareaStyle = { flex: 1, background: '#2A3942', border: 'none', borderRadius: 24, padding: '10px 14px', color: '#E9EDEF', fontSize: 15, outline: 'none', resize: 'none', maxHeight: 120, lineHeight: 1.4, minHeight: 40, fontFamily: "'Segoe UI',system-ui,sans-serif" };
const sendBtnStyle = { width: 46, height: 46, borderRadius: '50%', background: '#00A884', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const iconBtnStyle = { width: 42, height: 42, borderRadius: '50%', background: '#2A3942', border: 'none', color: '#8696A0', fontSize: 19, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

const MicIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="9" y="2" width="6" height="12" rx="3" fill="#fff" />
    <path d="M5 11C5 14.866 8.134 18 12 18C15.866 18 19 14.866 19 11" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="18" x2="12" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <line x1="8" y1="22" x2="16" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* ─── VoiceMsg ────────────────────────────────────────────────────── */
function VoiceMsg({ src }) {
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const [dur, setDur] = useState(0);
  const ref = useRef(null);
  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
      <audio ref={ref} src={src}
        onTimeUpdate={e => setProg(e.target.currentTime / e.target.duration * 100)}
        onLoadedMetadata={e => setDur(e.target.duration)}
        onEnded={() => { setPlaying(false); setProg(0); }} />
      <button onClick={toggle} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {playing ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${prog}%`, background: '#25D366', transition: 'width .1s' }} />
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
          {dur ? `${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')}` : '0:00'}
        </div>
      </div>
      <span style={{ fontSize: 18 }}>🎤</span>
    </div>
  );
}

/* ─── RecordingWaveform ───────────────────────────────────────────── */
function RecordingWaveform({ analyserRef, isRecording }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  useEffect(() => {
    if (!isRecording) { cancelAnimationFrame(animRef.current); return; }
    const draw = () => {
      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      if (!canvas || !analyser) { animRef.current = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext('2d');
      const bufLen = analyser.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bw = (canvas.width / bufLen) * 2.5;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const h = (data[i] / 255) * canvas.height;
        ctx.fillStyle = `rgba(37,211,102,${0.5 + data[i] / 512})`;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - h, Math.max(bw - 1, 1), h, 2);
        ctx.fill();
        x += bw;
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isRecording]);
  return <canvas ref={canvasRef} width={140} height={36} style={{ borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />;
}

/* ─── Bubble ──────────────────────────────────────────────────────── */
function Bubble({ msg, isMe, onLongPress }) {
  const [big, setBig] = useState(false);
  const pt = useRef(null); const moved = useRef(false);
  const deleted = msg.deletedForEveryone;
  const onTS = () => { moved.current = false; pt.current = setTimeout(() => { if (!moved.current) { navigator.vibrate?.(30); onLongPress(msg); } }, 500); };
  const onTM = () => { moved.current = true; };
  const onTE = () => clearTimeout(pt.current);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 2, paddingLeft: isMe ? 48 : 8, paddingRight: isMe ? 8 : 48 }}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onMouseDown={onTS} onMouseUp={onTE}>
        {!isMe && (
          <div style={{ ...av(28), marginRight: 5, alignSelf: 'flex-end', background: 'linear-gradient(135deg,#1565C0,#0D47A1)' }}>
            <span style={{ fontSize: 11 }}>🏫</span>
          </div>
        )}
        <div style={{ maxWidth: '75%', padding: '7px 9px 4px', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: isMe ? '#005C4B' : '#1F2C34', boxShadow: '0 1px 2px rgba(0,0,0,0.25)', position: 'relative' }}>
          {!isMe && <div style={{ fontSize: 11, fontWeight: 600, color: '#00A884', marginBottom: 2 }}>School Admin</div>}
          {deleted ? <span style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', fontSize: 14 }}>🚫 This message was deleted</span> : <>
            {msg.messageType === 'image' && msg.mediaData && <img src={msg.mediaData} style={{ maxWidth: '100%', borderRadius: 8, display: 'block', marginBottom: 3, cursor: 'pointer', maxHeight: 260, objectFit: 'cover' }} onClick={() => setBig(true)} alt="" />}
            {msg.messageType === 'video' && msg.mediaData && <video src={msg.mediaData} controls style={{ maxWidth: '100%', borderRadius: 8, display: 'block', marginBottom: 3, maxHeight: 260 }} />}
            {msg.messageType === 'voice' && msg.mediaData && <VoiceMsg src={msg.mediaData} />}
            {msg.content && <p style={{ margin: 0, fontSize: 15, color: '#E9EDEF', lineHeight: 1.45, wordBreak: 'break-word' }}>{msg.content}</p>}
            {msg.reactions?.length > 0 && <div style={{ position: 'absolute', bottom: -10, right: 6, background: '#2A3942', borderRadius: 10, padding: '2px 7px', fontSize: 13, boxShadow: '0 1px 3px rgba(0,0,0,0.4)', display: 'flex', gap: 2 }}>
              {[...new Set(msg.reactions.map(r => r.emoji))].join('')}
              <span style={{ fontSize: 10, color: '#8696A0', marginLeft: 2 }}>{msg.reactions.length}</span>
            </div>}
          </>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 3 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap' }}>{fmtTime(msg.createdAt)}</span>
            {isMe && !deleted && <span style={{ fontSize: 12, color: msg.isRead ? '#53BDEB' : 'rgba(255,255,255,0.38)' }}>✓✓</span>}
          </div>
        </div>
      </div>
      {big && msg.mediaData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 9990, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setBig(false)}>
          <img src={msg.mediaData} style={{ maxWidth: '95vw', maxHeight: '92vh', objectFit: 'contain' }} alt="" />
        </div>
      )}
    </>
  );
}

/* ─── ParentChat ──────────────────────────────────────────────────── */
export default function ParentChat() {
  const { user } = useStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [adminTyping, setAdminTyping] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recObj, setRecObj] = useState(null);
  const [recTime, setRecTime] = useState(0);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);

  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimer = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const recTimerRef = useRef(null);

  /* ── Load messages ── */
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/chat/messages/admin');
      setMessages(r.data.messages || []);
    } catch (e) {
      console.error('load messages', e);
      // Try alternate endpoint
      try {
        const r2 = await api.get('/chat/parent-messages');
        setMessages(r2.data.messages || []);
      } catch {}
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMessages(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ── Socket ── */
  useEffect(() => {
    const socket = getSocket(); if (!socket) return;

    const onMsg = msg => {
      setMessages(p => {
        if (p.find(m => m._id === msg._id)) return p;
        return [...p, msg];
      });
      // Mark as read
      if (msg.senderRole === 'admin') api.put(`/chat/${msg._id}/read`).catch(() => {});
    };
    const onTyping = ({ isTyping }) => setAdminTyping(isTyping);
    const onAdminOnline = () => setAdminOnline(true);
    const onAdminOffline = () => setAdminOnline(false);
    const onDel = ({ msgId, forEveryone }) => {
      if (forEveryone) setMessages(p => p.map(m => m._id === msgId ? { ...m, deletedForEveryone: true } : m));
    };
    const onReact = ({ msgId }) => {
      api.get(`/chat/message/${msgId}`).then(r => setMessages(p => p.map(m => m._id === msgId ? r.data.message : m))).catch(() => {});
    };

    socket.on('new_message', onMsg);
    socket.on('admin_typing', onTyping);
    socket.on('admin_online', onAdminOnline);
    socket.on('admin_offline', onAdminOffline);
    socket.on('message_deleted', onDel);
    socket.on('message_reaction', onReact);

    return () => {
      socket.off('new_message', onMsg);
      socket.off('admin_typing', onTyping);
      socket.off('admin_online', onAdminOnline);
      socket.off('admin_offline', onAdminOffline);
      socket.off('message_deleted', onDel);
      socket.off('message_reaction', onReact);
    };
  }, []);

  /* ── Typing indicator ── */
  const handleInput = e => {
    setInput(e.target.value);
    const socket = getSocket();
    if (socket) {
      socket.emit('typing', { isTyping: true, senderRole: 'parent', parentId: user?._id });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socket.emit('typing', { isTyping: false, senderRole: 'parent', parentId: user?._id });
      }, 1500);
    }
  };

  /* ── Send text ── */
  const sendText = () => {
    const txt = input.trim(); if (!txt) return;
    const socket = getSocket();
    if (!socket) { toast.error('Not connected. Please refresh.'); return; }
    socket.emit('send_message', {
      senderId: user?._id,
      senderRole: 'parent',
      parentId: user?._id,
      content: txt,
      messageType: 'text',
    });
    setInput('');
  };

  /* ── Send media via Cloudinary ── */
  const sendMedia = async file => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { toast.error('Images/videos only'); return; }
    const socket = getSocket();
    if (!socket) { toast.error('Not connected. Please refresh.'); return; }

    const tid = toast.loading('Uploading...');
    try {
      const result = await uploadMedia(file, ({ label }) => toast.loading(label, { id: tid }));
      toast.success('Sent! ✓', { id: tid });
      socket.emit('send_message', {
        senderId: user?._id,
        senderRole: 'parent',
        parentId: user?._id,
        content: '',
        messageType: file.type.startsWith('image/') ? 'image' : 'video',
        mediaData: result.url,
        mediaMimeType: file.type,
      });
    } catch (e) { toast.error('Upload failed: ' + e.message, { id: tid }); }
  };

  /* ── Voice recording with waveform + Cloudinary ── */
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtxRef.current = new AudioContext();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType });
      const ch = [];
      mr.ondataavailable = e => { if (e.data.size > 0) ch.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        audioCtxRef.current?.close();
        analyserRef.current = null;
        const blob = new Blob(ch, { type: mimeType });
        const file = new File([blob], 'voice.webm', { type: mimeType });
        const socket = getSocket(); if (!socket) return;

        const tid = toast.loading('Sending voice message...');
        try {
          const result = await uploadMedia(file);
          toast.success('Voice sent! ✓', { id: tid });
          socket.emit('send_message', {
            senderId: user?._id,
            senderRole: 'parent',
            parentId: user?._id,
            content: '',
            messageType: 'voice',
            mediaData: result.url,
            mediaMimeType: mimeType,
          });
        } catch (e) { toast.error('Failed: ' + e.message, { id: tid }); }
      };
      mr.start(100);
      setRecObj(mr); setRecording(true); setRecTime(0);
      recTimerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch (err) {
      if (err.name === 'NotAllowedError') toast.error('Microphone permission denied');
      else toast.error('Mic error: ' + err.message);
    }
  };

  const stopRec = () => { recObj?.stop(); setRecording(false); setRecObj(null); clearInterval(recTimerRef.current); setRecTime(0); };
  const cancelRec = () => {
    if (recObj) { recObj.onstop = null; recObj.stop(); }
    setRecording(false); setRecObj(null); clearInterval(recTimerRef.current); setRecTime(0);
    audioCtxRef.current?.close(); analyserRef.current = null;
    toast('Recording cancelled', { icon: '🗑' });
  };

  /* ── Delete / React ── */
  const doDelete = async (msgId, forAll) => {
    try {
      await api.delete(`/chat/${msgId}`, { data: { forEveryone: forAll } });
      if (forAll) setMessages(p => p.map(m => m._id === msgId ? { ...m, deletedForEveryone: true } : m));
      else setMessages(p => p.filter(m => m._id !== msgId));
      setMenu(null);
    } catch { toast.error('Delete failed'); }
  };
  const doReact = async (msgId, emoji) => { try { await api.put(`/chat/${msgId}/react`, { emoji }); setMenu(null); } catch {} };

  /* ── Group msgs by day ── */
  const groupByDay = arr => arr.reduce((acc, m) => {
    const day = fmtDay(m.createdAt);
    if (!acc.length || acc[acc.length - 1].day !== day) acc.push({ day, msgs: [m] });
    else acc[acc.length - 1].msgs.push(m);
    return acc;
  }, []);

  const root = { display: 'flex', flexDirection: 'column', height: '100dvh', background: '#111B21', color: '#E9EDEF', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden' };
  const mb = { display: 'block', width: '100%', padding: '14px 18px', background: 'none', border: 'none', color: '#E9EDEF', fontSize: 15, textAlign: 'left', cursor: 'pointer' };

  /* ─── Context Menu ─── */
  const CtxMenu = () => !menu ? null : (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setMenu(null)}>
      <div style={{ background: '#233138', borderRadius: 14, overflow: 'hidden', width: 250, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 8px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(e => <button key={e} onClick={() => doReact(menu.msg._id, e)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', padding: '2px 4px' }}>{e}</button>)}
        </div>
        {menu.msg.mediaData && !menu.msg.deletedForEveryone && <button onClick={() => { window.open(menu.msg.mediaData, '_blank'); setMenu(null); }} style={mb}>⬇ Download</button>}
        <button onClick={() => doDelete(menu.msg._id, false)} style={{ ...mb, color: '#FC8181' }}>🗑 Delete for me</button>
        {menu.msg.senderRole === 'parent' && !menu.msg.deletedForEveryone && <button onClick={() => doDelete(menu.msg._id, true)} style={{ ...mb, color: '#FC8181' }}>🗑 Delete for everyone</button>}
        <button onClick={() => setMenu(null)} style={{ ...mb, color: '#8696A0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>Cancel</button>
      </div>
    </div>
  );

  /* ─── Recording Bar ─── */
  const RecordingBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 8px', background: '#1F2C34', flexShrink: 0 }}>
      <button onClick={cancelRec} style={{ ...iconBtnStyle, color: '#EF4444', background: 'rgba(239,68,68,0.15)' }}>🗑</button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#2A3942', borderRadius: 24, padding: '8px 14px' }}>
        <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 700, minWidth: 36 }}>
          {`${Math.floor(recTime / 60)}:${String(recTime % 60).padStart(2, '0')}`}
        </span>
        <RecordingWaveform analyserRef={analyserRef} isRecording={recording} />
        <span style={{ fontSize: 11, color: '#8696A0', marginLeft: 'auto' }}>🎙 Recording...</span>
      </div>
      <button onMouseUp={stopRec} onTouchEnd={stopRec} style={{ ...sendBtnStyle, background: '#EF4444' }}>⏹</button>
    </div>
  );

  return (
    <div style={root}>
      <CtxMenu />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#1F2C34', flexShrink: 0, borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ ...av(42), background: 'linear-gradient(135deg,#1565C0,#0D47A1)' }}>
          <span style={{ fontSize: 18 }}>🏫</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>School Admin</div>
          <div style={{ fontSize: 12, color: adminTyping ? '#00A884' : adminOnline ? '#25D366' : '#8696A0' }}>
            {adminTyping ? 'typing...' : adminOnline ? 'online' : 'Peace Mindset School'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0 4px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8696A0' }}>
          <div style={{ fontSize: 32, marginBottom: 8, animation: 'spin 1s linear infinite' }}>⏳</div>
          Loading messages...
        </div>}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8696A0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No messages yet</div>
            <div style={{ fontSize: 13 }}>Send a message to the school admin</div>
          </div>
        )}
        {!loading && groupByDay(messages).map((grp, gi) => (
          <div key={gi}>
            <div style={{ textAlign: 'center', margin: '8px 0' }}>
              <span style={{ background: '#1F2C34', padding: '4px 12px', borderRadius: 8, fontSize: 11, color: '#8696A0', border: '0.5px solid rgba(255,255,255,0.06)' }}>{grp.day}</span>
            </div>
            {grp.msgs.map(m => {
              const isMe = m.senderRole === 'parent' || m.senderId === user?._id;
              return <Bubble key={m._id} msg={m} isMe={isMe} onLongPress={msg => setMenu({ msg })} />;
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      {recording ? <RecordingBar /> : (
        <div style={inputBarStyle}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={e => { sendMedia(e.target.files[0]); e.target.value = ''; }}
          />
          <button onClick={() => fileRef.current?.click()} style={iconBtnStyle}>📎</button>
          <textarea
            value={input}
            onChange={handleInput}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            placeholder="Message"
            rows={1}
            style={textareaStyle}
          />
          {input.trim()
            ? <button onClick={sendText} style={sendBtnStyle}>➤</button>
            : <button
              style={{ ...sendBtnStyle, background: '#00A884' }}
              onMouseDown={startRec}
              onTouchStart={e => { e.preventDefault(); startRec(); }}
            ><MicIcon /></button>
          }
        </div>
      )}

      <style>{`*::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}
