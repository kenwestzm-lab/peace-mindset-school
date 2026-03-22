import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { compressImage, compressVideo, formatSize, shareMedia, downloadMedia } from '../../utils/media';
import toast from 'react-hot-toast';

const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

function Avatar({ name, src, size = 38, online }) {
  const initials = name?.[0]?.toUpperCase() || '?';
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <div style={{
        width:size, height:size, borderRadius:'50%', overflow:'hidden',
        background:'linear-gradient(135deg,#9B1826,#C02035)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:size*0.38, fontWeight:700, color:'#fff', flexShrink:0,
      }}>
        {src ? <img src={src} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>e.target.style.display='none'} /> : initials}
      </div>
      {online !== undefined && (
        <span style={{ position:'absolute', bottom:1, right:1, width:size*0.28, height:size*0.28, borderRadius:'50%', background:online?'#25D366':'#666', border:'2px solid var(--bg-card)' }} />
      )}
    </div>
  );
}

function MediaSendProgress({ progress, label }) {
  return (
    <div style={{ margin:'4px 12px', padding:'10px 14px', background:'rgba(37,211,102,0.1)', border:'1px solid rgba(37,211,102,0.3)', borderRadius:12, display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.1)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${progress}%`, background:'#25D366', borderRadius:2, transition:'width 0.3s' }} />
      </div>
      <span style={{ fontSize:11, color:'#25D366', whiteSpace:'nowrap' }}>{label}</span>
    </div>
  );
}

function MessageBubble({ msg, isMe, onDelete, onShare, onDownload, onReact }) {
  const [showMenu, setShowMenu] = useState(false);
  const [imgFull, setImgFull] = useState(false);
  const time = new Date(msg.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  
  const isDeleted = msg.deletedForEveryone;
  const hasMedia = msg.mediaData && !isDeleted;

  return (
    <>
      {/* Full-screen image viewer */}
      {imgFull && (
        <div onClick={() => setImgFull(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
        }}>
          <img src={msg.mediaData} alt="" style={{ maxWidth:'95vw', maxHeight:'90vh', objectFit:'contain', borderRadius:8 }} />
          <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', display:'flex', gap:12 }}>
            <button onClick={(e)=>{e.stopPropagation();downloadMedia(msg.mediaData,'image.jpg');}} style={{ padding:'8px 20px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', borderRadius:999, cursor:'pointer', fontSize:13 }}>⬇ Download</button>
            <button onClick={(e)=>{e.stopPropagation();shareMedia(msg.mediaData,'image.jpg');}} style={{ padding:'8px 20px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', borderRadius:999, cursor:'pointer', fontSize:13 }}>↗ Share</button>
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:isMe?'row-reverse':'row', gap:6, alignItems:'flex-end', marginBottom:2 }}
        onContextMenu={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
      >
        {!isMe && <Avatar name={msg.sender?.name||'A'} src={msg.sender?.profilePic} size={32} />}

        <div style={{ maxWidth:'78%', display:'flex', flexDirection:'column', alignItems:isMe?'flex-end':'flex-start' }}>
          {showMenu && (
            <div style={{
              position:'absolute', zIndex:100,
              background:'#1F1F1F', border:'1px solid rgba(255,255,255,0.12)',
              borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.6)',
              minWidth:160, overflow:'hidden',
            }}>
              {!isDeleted && hasMedia && <>
                <button onClick={()=>{onDownload(msg);setShowMenu(false);}} style={menuBtnStyle}>⬇ Download</button>
                <button onClick={()=>{onShare(msg);setShowMenu(false);}} style={menuBtnStyle}>↗ Share</button>
              </>}
              {['❤️','👍','😂','😮','😢','🙏'].map(e => (
                <button key={e} onClick={()=>{onReact(msg._id,e);setShowMenu(false);}} style={{...menuBtnStyle,display:'inline-flex'}}>{e}</button>
              ))}
              <div style={{ height:1, background:'rgba(255,255,255,0.08)', margin:'4px 0' }} />
              <button onClick={()=>{onDelete(msg._id,false);setShowMenu(false);}} style={{...menuBtnStyle,color:'#FC8181'}}>🗑 Delete for me</button>
              {isMe && <button onClick={()=>{onDelete(msg._id,true);setShowMenu(false);}} style={{...menuBtnStyle,color:'#FC8181'}}>🗑 Delete for everyone</button>}
              <button onClick={()=>setShowMenu(false)} style={{...menuBtnStyle,color:'#999'}}>✕ Cancel</button>
            </div>
          )}

          <div
            onClick={() => showMenu && setShowMenu(false)}
            onLongPress={() => setShowMenu(true)}
            style={{
              padding: hasMedia ? '4px' : '9px 13px',
              borderRadius: 18,
              borderBottomRightRadius: isMe ? 4 : 18,
              borderBottomLeftRadius: isMe ? 18 : 4,
              background: isMe
                ? 'linear-gradient(135deg,#005C4B,#128C7E)'
                : 'rgba(255,255,255,0.07)',
              border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: isMe ? '0 2px 10px rgba(18,140,126,0.3)' : 'none',
              position:'relative',
            }}
          >
            {isDeleted ? (
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', fontStyle:'italic', margin:0, padding:'2px 4px' }}>🚫 This message was deleted</p>
            ) : (
              <>
                {msg.messageType === 'text' && (
                  <p style={{ fontSize:14.5, color:'#E9EDEF', lineHeight:1.55, margin:0, wordBreak:'break-word' }}>{msg.content}</p>
                )}
                {msg.messageType === 'voice' && msg.mediaData && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:200, maxWidth:260, padding:'4px 6px' }}>
                    <span style={{ fontSize:18 }}>🎤</span>
                    <audio controls src={msg.mediaData} style={{ flex:1, height:32 }} />
                    {msg.duration && <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)', flexShrink:0 }}>{fmt(msg.duration)}</span>}
                  </div>
                )}
                {msg.messageType === 'image' && msg.mediaData && (
                  <div style={{ position:'relative' }}>
                    <img src={msg.mediaData} alt="Photo"
                      style={{ maxWidth:240, maxHeight:280, borderRadius:14, display:'block', cursor:'pointer', objectFit:'cover' }}
                      onClick={() => setImgFull(true)}
                    />
                    <button
                      onClick={(e)=>{e.stopPropagation();shareMedia(msg.mediaData,'photo.jpg');}}
                      style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.6)', border:'none', color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:12 }}
                    >↗</button>
                  </div>
                )}
                {msg.messageType === 'video' && msg.mediaData && (
                  <div style={{ position:'relative' }}>
                    <video controls src={msg.mediaData} style={{ maxWidth:240, maxHeight:200, borderRadius:14, display:'block' }} />
                    <button
                      onClick={(e)=>{e.stopPropagation();shareMedia(msg.mediaData,'video.mp4');}}
                      style={{ position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.6)', border:'none', color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:12 }}
                    >↗</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Reactions */}
          {msg.reactions?.length > 0 && (
            <div style={{ display:'flex', gap:2, marginTop:2, flexWrap:'wrap', justifyContent:isMe?'flex-end':'flex-start' }}>
              {Object.entries(msg.reactions.reduce((a,r)=>{a[r.emoji]=(a[r.emoji]||0)+1;return a;},{})
              ).map(([em,cnt]) => (
                <span key={em} onClick={()=>onReact(msg._id,em)} style={{ background:'rgba(255,255,255,0.1)', borderRadius:999, padding:'1px 6px', fontSize:12, cursor:'pointer', border:'1px solid rgba(255,255,255,0.08)' }}>
                  {em} {cnt>1?cnt:''}
                </span>
              ))}
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2, paddingRight:4, paddingLeft:4 }}>
            <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.35)' }}>{time}</span>
            {isMe && <span style={{ fontSize:11, color:msg.isRead?'#53BDEB':'rgba(255,255,255,0.35)' }}>✓✓</span>}
          </div>
        </div>
      </div>
    </>
  );
}

const menuBtnStyle = {
  display:'flex', alignItems:'center', gap:8, width:'100%',
  padding:'10px 14px', background:'none', border:'none',
  color:'#E9EDEF', fontSize:13.5, cursor:'pointer', textAlign:'left',
};

export default function ParentChat() {
  const { user, setUnreadMessages } = useStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [sending, setSending] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(null); // {progress, label}
  const [adminTyping, setAdminTyping] = useState(false);
  const msgsBox = useRef(null);
  const inputRef = useRef(null);
  const mr = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const typingTimer = useRef(null);
  const fileRef = useRef(null);

  const scrollBottom = useCallback(() => {
    setTimeout(() => { if (msgsBox.current) msgsBox.current.scrollTop = msgsBox.current.scrollHeight; }, 50);
  }, []);

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
      s.on('message_deleted', ({ msgId, forEveryone }) => {
        setMessages(p => p.map(m => m._id===msgId ? (forEveryone ? {...m, deletedForEveryone:true, mediaData:null} : null) : m).filter(Boolean));
      });
      s.on('admin_typing', ({ isTyping }) => {
        setAdminTyping(isTyping);
      });
    }
    return () => { s?.off('new_message'); s?.off('message_deleted'); s?.off('admin_typing'); };
  }, []);

  useEffect(() => { scrollBottom(); }, [messages]);

  const send = useCallback(async (payload) => {
    if (sending) return;
    setSending(true);
    const s = getSocket();
    try {
      if (s?.connected) {
        s.emit('send_message', { senderId:user._id, senderRole:'parent', parentId:user._id, ...payload });
        // Optimistic update
        setMessages(p => [...p, {
          _id: Date.now().toString(), sender:{ _id:user._id, name:user.name, profilePic:user.profilePic },
          senderRole:'parent', parentId:user._id, createdAt:new Date().toISOString(),
          isRead:false, reactions:[], ...payload,
        }]);
      } else {
        const r = await api.post('/chat', { parentId:user._id, ...payload });
        setMessages(p => [...p, r.data.message]);
      }
      scrollBottom();
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); setMediaProgress(null); }
  }, [user, sending]);

  const sendText = () => {
    if (!input.trim() || sending) return;
    send({ content: input.trim(), messageType: 'text' });
    setInput('');
    clearTimeout(typingTimer.current);
    const s = getSocket();
    s?.emit('typing', { parentId:user._id, isTyping:false, senderRole:'parent' });
  };

  const handleTyping = (val) => {
    setInput(val);
    const s = getSocket();
    s?.emit('typing', { parentId:user._id, isTyping:true, senderRole:'parent' });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      s?.emit('typing', { parentId:user._id, isTyping:false, senderRole:'parent' });
    }, 1500);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      mr.current = new MediaRecorder(stream, { mimeType });
      chunks.current = [];
      mr.current.ondataavailable = e => chunks.current.push(e.data);
      mr.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
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

  const cancelRec = () => {
    if (mr.current?.state==='recording') {
      mr.current.ondataavailable = null; mr.current.onstop = null;
      mr.current.stop(); clearInterval(timer.current);
      setRecording(false); setRecordSec(0);
    }
  };

  const handleFile = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const isImg = f.type.startsWith('image/');
    const isVid = f.type.startsWith('video/');
    if (!isImg && !isVid) { toast.error('Only images and videos are supported'); return; }
    
    const maxMB = isVid ? 50 : 50;
    if (f.size > maxMB * 1024 * 1024) { toast.error(`Max file size: ${maxMB}MB`); return; }

    try {
      if (isImg) {
        setMediaProgress({ progress: 30, label: 'Compressing photo...' });
        const { data, sizeKB, originalKB } = await compressImage(f, 1);
        setMediaProgress({ progress: 80, label: 'Sending...' });
        const compressed = sizeKB < originalKB * 0.9;
        toast.success(`Photo ${compressed ? `compressed: ${formatSize(originalKB)} → ${formatSize(sizeKB)}` : `ready: ${formatSize(sizeKB)}`}`);
        await send({ content:'📷 Photo', messageType:'image', mediaData:data, mediaMimeType:'image/jpeg' });
      } else {
        setMediaProgress({ progress: 10, label: 'Processing video...' });
        const { data, sizeKB, originalKB, compressed } = await compressVideo(f, 15);
        setMediaProgress({ progress: 85, label: 'Sending video...' });
        const ext = compressed ? 'webm' : f.name.split('.').pop();
        const mime = compressed ? 'video/webm' : f.type;
        if (compressed) toast.success(`Video compressed: ${formatSize(originalKB)} → ${formatSize(sizeKB)}`);
        else toast.success(`Video ready: ${formatSize(sizeKB)}`);
        await send({ content:'🎥 Video', messageType:'video', mediaData:data, mediaMimeType:mime });
      }
    } catch (err) {
      toast.error('Failed to process media');
      setMediaProgress(null);
    }
    e.target.value = '';
  };

  const handleDelete = async (msgId, forEveryone) => {
    try {
      await api.delete(`/chat/${msgId}`, { data: { deleteForEveryone: forEveryone } });
      if (forEveryone) {
        setMessages(p => p.map(m => m._id===msgId ? {...m, deletedForEveryone:true, mediaData:null} : m));
      } else {
        setMessages(p => p.filter(m => m._id !== msgId));
      }
      toast.success(forEveryone ? 'Deleted for everyone' : 'Deleted for you');
    } catch { toast.error('Delete failed'); }
  };

  const handleReact = async (msgId, emoji) => {
    try {
      await api.put(`/chat/${msgId}/react`, { emoji });
      const r = await api.get(`/chat/${user._id}`);
      setMessages(r.data.messages || []);
    } catch {}
  };

  const handleShare = (msg) => shareMedia(msg.mediaData, msg.messageType === 'image' ? 'photo.jpg' : 'video.mp4');
  const handleDownload = (msg) => downloadMedia(msg.mediaData, msg.messageType === 'image' ? 'photo.jpg' : 'video.mp4');

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark" />
    </div>
  );

  return (
    <div style={{
      position:'fixed', top:'var(--header-height)', left:0, right:0, bottom:0,
      display:'flex', flexDirection:'column', background:'#0B141A',
    }}>
      {/* WA-style header */}
      <div style={{
        padding:'10px 16px', background:'#1F2C34',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        display:'flex', alignItems:'center', gap:12, flexShrink:0,
        boxShadow:'0 2px 8px rgba(0,0,0,0.4)',
      }}>
        <Avatar name="Admin" size={42} online={true} />
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, fontSize:16, color:'#E9EDEF', fontFamily:'var(--font-body)' }}>Peace Mindset Admin</div>
          <div style={{ fontSize:12, color: adminTyping ? '#25D366' : '#8696A0', marginTop:1 }}>
            {adminTyping ? '✍ typing...' : '🏫 School Administration'}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => fileRef.current?.click()} style={{ background:'none', border:'none', color:'#8696A0', cursor:'pointer', fontSize:18, padding:4 }}>📎</button>
        </div>
      </div>

      {/* Messages */}
      <div ref={msgsBox} style={{
        flex:1, overflowY:'auto', padding:'12px 12px 0',
        backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        WebkitOverflowScrolling:'touch', display:'flex', flexDirection:'column', gap:4,
      }}>
        {messages.length === 0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>💬</div>
            <div style={{ fontSize:17, fontWeight:600, color:'#E9EDEF', marginBottom:8 }}>No messages yet</div>
            <div style={{ fontSize:13, color:'#8696A0', lineHeight:1.7 }}>
              Send a message to the school admin.<br/>
              🎤 Voice · 📷 Photos · 🎥 Videos up to 50MB
            </div>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender?._id === user._id || msg.sender === user._id;
          return (
            <MessageBubble key={msg._id} msg={msg} isMe={isMe}
              onDelete={handleDelete} onShare={handleShare}
              onDownload={handleDownload} onReact={handleReact}
            />
          );
        })}
        <div style={{ height: 8 }} />
      </div>

      {/* Media progress */}
      {mediaProgress && <MediaSendProgress progress={mediaProgress.progress} label={mediaProgress.label} />}

      {/* Recording bar */}
      {recording && (
        <div style={{ margin:'0 12px', padding:'10px 14px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:12, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#EF4444', animation:'pulse 1s infinite', flexShrink:0 }} />
          <span style={{ fontSize:13, color:'#FC8181', fontWeight:600, flex:1 }}>🎤 Recording {fmt(recordSec)}</span>
          <button onClick={cancelRec} style={{ padding:'4px 12px', borderRadius:8, background:'transparent', border:'1px solid rgba(239,68,68,0.4)', color:'#FC8181', fontSize:12, cursor:'pointer' }}>✕ Cancel</button>
          <button onClick={stopRec} style={{ padding:'4px 14px', borderRadius:8, background:'#EF4444', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>⬛ Send</button>
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding:'8px 12px 16px', background:'#1F2C34', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }} />

        <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
          <button onClick={() => fileRef.current?.click()} style={iconBtn}>📎</button>

          <textarea
            ref={inputRef} value={input}
            onChange={e => handleTyping(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey){e.preventDefault();sendText();} }}
            placeholder="Message"
            rows={1}
            style={{
              flex:1, padding:'11px 14px',
              background:'#2A3942', border:'1.5px solid rgba(255,255,255,0.06)',
              borderRadius:24, resize:'none', outline:'none',
              color:'#E9EDEF', fontFamily:'var(--font-body)',
              fontSize:'16px', lineHeight:1.5, maxHeight:120,
            }}
          />

          {input.trim() ? (
            <button onClick={sendText} disabled={sending} style={{
              width:46, height:46, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,#00A884,#128C7E)',
              border:'none', color:'#fff', fontSize:18, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 2px 12px rgba(37,211,102,0.4)',
            }}>
              {sending ? <span className="spinner" style={{width:16,height:16}}/> : '➤'}
            </button>
          ) : (
            <button
              onMouseDown={startRec} onMouseUp={stopRec}
              onTouchStart={e=>{e.preventDefault();startRec();}}
              onTouchEnd={e=>{e.preventDefault();stopRec();}}
              style={{
                width:46, height:46, borderRadius:'50%', flexShrink:0,
                background: recording ? '#EF4444' : 'linear-gradient(135deg,#00A884,#128C7E)',
                border:'none', color:'#fff', fontSize:20, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: recording ? '0 0 18px rgba(239,68,68,0.6)' : '0 2px 12px rgba(37,211,102,0.4)',
              }}
            >🎤</button>
          )}
        </div>
        <div style={{ textAlign:'center', marginTop:5, fontSize:10, color:'rgba(255,255,255,0.15)' }}>
          Hold 🎤 to record voice · 📎 up to 50MB photos/videos
        </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>
    </div>
  );
}

const iconBtn = {
  width:42, height:42, borderRadius:'50%', flexShrink:0,
  background:'#2A3942', border:'none',
  color:'#8696A0', fontSize:19, cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center',
};
