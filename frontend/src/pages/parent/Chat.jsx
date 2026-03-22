import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { compressImage, compressVideo, formatSize, shareMedia, downloadMedia } from '../../utils/media';
import toast from 'react-hot-toast';

const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

function Avatar({ name, src, size = 38, online }) {
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <div style={{
        width:size, height:size, borderRadius:'50%', overflow:'hidden',
        background:'linear-gradient(135deg,#9B1826,#C02035)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:size*0.38, fontWeight:700, color:'#fff',
      }}>
        {src ? <img src={src} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/> : (name?.[0]?.toUpperCase()||'?')}
      </div>
      {online !== undefined && (
        <span style={{ position:'absolute', bottom:1, right:1, width:size*0.28, height:size*0.28, borderRadius:'50%', background:online?'#25D366':'#666', border:'2px solid #0B141A' }}/>
      )}
    </div>
  );
}

// ── Bottom sheet delete dialog (WhatsApp style) ───────────────────────────────
function DeleteSheet({ msg, isMe, onClose, onDelete }) {
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:900 }}/>
      {/* Sheet */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:901,
        background:'#1F2C34', borderRadius:'20px 20px 0 0',
        padding:'8px 0 32px', boxShadow:'0 -4px 30px rgba(0,0,0,0.5)',
      }}>
        {/* Handle bar */}
        <div style={{ width:36, height:4, background:'rgba(255,255,255,0.2)', borderRadius:2, margin:'8px auto 16px' }}/>

        {/* Message preview */}
        <div style={{ padding:'0 20px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:11, color:'#8696A0', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>Delete message</div>
          <div style={{ fontSize:13, color:'#E9EDEF', background:'rgba(255,255,255,0.05)', padding:'8px 12px', borderRadius:10, maxLines:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {msg.messageType === 'text' ? msg.content : msg.messageType === 'voice' ? '🎤 Voice message' : msg.messageType === 'image' ? '📷 Photo' : '🎥 Video'}
          </div>
        </div>

        {/* Delete options */}
        <div style={{ padding:'8px 0' }}>
          {/* Delete for me — always available */}
          <button
            onClick={() => { onDelete(msg._id, false); onClose(); }}
            style={{
              width:'100%', padding:'16px 22px',
              background:'none', border:'none',
              display:'flex', alignItems:'center', gap:16,
              cursor:'pointer', textAlign:'left',
            }}
          >
            <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🗑</div>
            <div>
              <div style={{ fontSize:15, fontWeight:500, color:'#E9EDEF', marginBottom:2 }}>Delete for me</div>
              <div style={{ fontSize:12, color:'#8696A0' }}>Remove from your chat only</div>
            </div>
          </button>

          {/* Delete for everyone — only for messages sent by me */}
          {isMe && (
            <button
              onClick={() => { onDelete(msg._id, true); onClose(); }}
              style={{
                width:'100%', padding:'16px 22px',
                background:'none', border:'none',
                display:'flex', alignItems:'center', gap:16,
                cursor:'pointer', textAlign:'left',
              }}
            >
              <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(239,68,68,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🗑</div>
              <div>
                <div style={{ fontSize:15, fontWeight:500, color:'#FC8181', marginBottom:2 }}>Delete for everyone</div>
                <div style={{ fontSize:12, color:'#8696A0' }}>Remove from both sides</div>
              </div>
            </button>
          )}

          {/* Cancel */}
          <button
            onClick={onClose}
            style={{
              width:'100%', padding:'16px 22px',
              background:'none', border:'none',
              display:'flex', alignItems:'center', gap:16,
              cursor:'pointer', textAlign:'left',
            }}
          >
            <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>✕</div>
            <div style={{ fontSize:15, fontWeight:500, color:'#8696A0' }}>Cancel</div>
          </button>
        </div>
      </div>
    </>
  );
}

// ── Message bubble with long-press support ────────────────────────────────────
function MessageBubble({ msg, isMe, onDelete, onShare, onDownload, onReact, onLongPress }) {
  const [imgFull, setImgFull] = useState(false);
  const longPressTimer = useRef(null);
  const touchMoved = useRef(false);

  const time = new Date(msg.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const isDeleted = msg.deletedForEveryone;

  // ── Long press handlers (Android touch) ──────────────────────────────
  const handleTouchStart = (e) => {
    touchMoved.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) {
        // Haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(40);
        onLongPress(msg);
      }
    }, 450); // 450ms hold = long press
  };

  const handleTouchMove = () => {
    touchMoved.current = true;
    clearTimeout(longPressTimer.current);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
  };

  // Prevent context menu on mobile (shows our custom menu instead)
  const handleContextMenu = (e) => {
    e.preventDefault();
    onLongPress(msg);
  };

  return (
    <>
      {/* Full-screen image viewer */}
      {imgFull && (
        <div onClick={() => setImgFull(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.96)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src={msg.mediaData} alt="" style={{ maxWidth:'95vw', maxHeight:'90vh', objectFit:'contain' }}/>
          <div style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', display:'flex', gap:12 }}>
            <button onClick={e=>{e.stopPropagation();downloadMedia(msg.mediaData,'image.jpg');}} style={shareBtn}>⬇ Save</button>
            <button onClick={e=>{e.stopPropagation();shareMedia(msg.mediaData,'image.jpg');}} style={shareBtn}>↗ Share</button>
          </div>
        </div>
      )}

      <div
        style={{ display:'flex', flexDirection:isMe?'row-reverse':'row', gap:6, alignItems:'flex-end', marginBottom:2 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        {!isMe && <Avatar name={msg.sender?.name||'A'} src={msg.sender?.profilePic} size={32}/>}

        <div style={{ maxWidth:'78%', display:'flex', flexDirection:'column', alignItems:isMe?'flex-end':'flex-start', position:'relative' }}>

          {/* Bubble */}
          <div style={{
            padding: msg.mediaData && !isDeleted ? '4px' : '9px 13px',
            borderRadius:18,
            borderBottomRightRadius: isMe ? 4 : 18,
            borderBottomLeftRadius: isMe ? 18 : 4,
            background: isMe ? 'linear-gradient(135deg,#005C4B,#128C7E)' : 'rgba(255,255,255,0.07)',
            border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isMe ? '0 2px 10px rgba(18,140,126,0.25)' : 'none',
            userSelect:'none', WebkitUserSelect:'none',
          }}>
            {isDeleted ? (
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.38)', fontStyle:'italic', margin:0, padding:'2px 4px' }}>🚫 This message was deleted</p>
            ) : (
              <>
                {msg.messageType==='text' && <p style={{ fontSize:14.5, color:'#E9EDEF', lineHeight:1.55, margin:0, wordBreak:'break-word' }}>{msg.content}</p>}
                {msg.messageType==='voice' && msg.mediaData && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:200, maxWidth:260, padding:'4px 6px' }}>
                    <span style={{ fontSize:18 }}>🎤</span>
                    <audio controls src={msg.mediaData} style={{ flex:1, height:32 }}/>
                    {msg.duration && <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)' }}>{fmt(msg.duration)}</span>}
                  </div>
                )}
                {msg.messageType==='image' && msg.mediaData && (
                  <div style={{ position:'relative' }}>
                    <img src={msg.mediaData} alt="Photo" onClick={()=>setImgFull(true)} style={{ maxWidth:240, maxHeight:280, borderRadius:14, display:'block', cursor:'pointer', objectFit:'cover' }}/>
                    <button onClick={e=>{e.stopPropagation();shareMedia(msg.mediaData,'photo.jpg');}} style={floatBtn}>↗</button>
                  </div>
                )}
                {msg.messageType==='video' && msg.mediaData && (
                  <div style={{ position:'relative' }}>
                    <video controls src={msg.mediaData} style={{ maxWidth:240, maxHeight:200, borderRadius:14, display:'block' }}/>
                    <button onClick={e=>{e.stopPropagation();shareMedia(msg.mediaData,'video.mp4');}} style={floatBtn}>↗</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Reactions */}
          {msg.reactions?.length > 0 && (
            <div style={{ display:'flex', gap:2, marginTop:2, flexWrap:'wrap', justifyContent:isMe?'flex-end':'flex-start' }}>
              {Object.entries(msg.reactions.reduce((a,r)=>{a[r.emoji]=(a[r.emoji]||0)+1;return a;},{})).map(([em,cnt]) => (
                <span key={em} onClick={()=>onReact(msg._id,em)} style={{ background:'rgba(255,255,255,0.1)', borderRadius:999, padding:'1px 6px', fontSize:12, cursor:'pointer', border:'1px solid rgba(255,255,255,0.08)' }}>
                  {em} {cnt>1?cnt:''}
                </span>
              ))}
            </div>
          )}

          {/* Time + ticks */}
          <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2, paddingLeft:4, paddingRight:4 }}>
            <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.35)' }}>{time}</span>
            {isMe && <span style={{ fontSize:11, color:msg.isRead?'#53BDEB':'rgba(255,255,255,0.35)' }}>✓✓</span>}
            {/* Hold hint — only shows on non-deleted messages */}
            {!isDeleted && <span style={{ fontSize:9, color:'rgba(255,255,255,0.2)', marginLeft:2 }}>hold •••</span>}
          </div>
        </div>
      </div>
    </>
  );
}

const shareBtn = { padding:'8px 20px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', borderRadius:999, cursor:'pointer', fontSize:13 };
const floatBtn = { position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.6)', border:'none', color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:12 };

// ── Reaction picker overlay ────────────────────────────────────────────────────
function ReactionPicker({ onReact, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:800 }}/>
      <div style={{ position:'fixed', bottom:120, left:'50%', transform:'translateX(-50%)', zIndex:801, background:'#233138', borderRadius:999, padding:'10px 16px', display:'flex', gap:6, boxShadow:'0 4px 20px rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.1)' }}>
        {['❤️','👍','😂','😮','😢','🙏'].map(e => (
          <button key={e} onClick={()=>{onReact(e);onClose();}} style={{ background:'none', border:'none', fontSize:26, cursor:'pointer', padding:'4px 6px', borderRadius:999, transition:'transform 0.1s' }}
            onMouseEnter={el=>el.currentTarget.style.transform='scale(1.3)'}
            onMouseLeave={el=>el.currentTarget.style.transform='scale(1)'}
          >{e}</button>
        ))}
      </div>
    </>
  );
}

// ── Main Parent Chat ──────────────────────────────────────────────────────────
export default function ParentChat() {
  const { user, setUnreadMessages } = useStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [sending, setSending] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(null);
  const [adminTyping, setAdminTyping] = useState(false);

  // Delete / reaction state
  const [deleteSheet, setDeleteSheet] = useState(null); // msg object
  const [reactionTarget, setReactionTarget] = useState(null); // msg._id

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
        setMessages(p => p.map(m => m._id===msgId
          ? (forEveryone ? {...m, deletedForEveryone:true, mediaData:null} : null)
          : m
        ).filter(Boolean));
      });
      s.on('admin_typing', ({ isTyping }) => setAdminTyping(isTyping));
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
        setMessages(p => [...p, {
          _id: Date.now().toString(),
          sender: { _id:user._id, name:user.name, profilePic:user.profilePic },
          senderRole:'parent', parentId:user._id,
          createdAt: new Date().toISOString(),
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
    send({ content:input.trim(), messageType:'text' });
    setInput('');
    clearTimeout(typingTimer.current);
    getSocket()?.emit('typing', { parentId:user._id, isTyping:false, senderRole:'parent' });
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
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      mr.current = new MediaRecorder(stream, { mimeType:mime });
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
    if (mr.current?.state==='recording') { mr.current.stop(); clearInterval(timer.current); setRecording(false); }
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
    const isImg = f.type.startsWith('image/'), isVid = f.type.startsWith('video/');
    if (!isImg && !isVid) { toast.error('Only images and videos'); return; }
    if (f.size > 50*1024*1024) { toast.error('Max 50MB'); return; }
    try {
      if (isImg) {
        setMediaProgress({ progress:30, label:'Compressing photo...' });
        const { data, sizeKB, originalKB } = await compressImage(f, 1);
        setMediaProgress({ progress:80, label:'Sending...' });
        toast.success(`📷 ${formatSize(originalKB)} → ${formatSize(sizeKB)}`);
        await send({ content:'📷 Photo', messageType:'image', mediaData:data, mediaMimeType:'image/jpeg' });
      } else {
        setMediaProgress({ progress:10, label:'Processing video...' });
        const { data, sizeKB, originalKB, mimeType } = await compressVideo(f, 15);
        setMediaProgress({ progress:85, label:'Sending video...' });
        if (sizeKB < originalKB) toast.success(`🎥 ${formatSize(originalKB)} → ${formatSize(sizeKB)}`);
        await send({ content:'🎥 Video', messageType:'video', mediaData:data, mediaMimeType:mimeType||f.type });
      }
    } catch { toast.error('Media failed'); setMediaProgress(null); }
    e.target.value = '';
  };

  // ── Delete handler ────────────────────────────────────────────────────
  const handleDelete = async (msgId, forEveryone) => {
    try {
      await api.delete(`/chat/${msgId}`, { data: { deleteForEveryone: forEveryone } });
      if (forEveryone) {
        setMessages(p => p.map(m => m._id===msgId ? {...m, deletedForEveryone:true, mediaData:null} : m));
        // Emit socket event so admin also sees deletion
        const s = getSocket();
        const msg = messages.find(m=>m._id===msgId);
        if (msg) s?.emit('delete_message', { msgId, parentId:user._id, forEveryone });
      } else {
        setMessages(p => p.filter(m => m._id!==msgId));
      }
      toast.success(forEveryone ? '🗑 Deleted for everyone' : '🗑 Deleted for you');
    } catch { toast.error('Delete failed'); }
  };

  const handleReact = async (msgId, emoji) => {
    try {
      await api.put(`/chat/${msgId}/react`, { emoji });
      const r = await api.get(`/chat/${user._id}`);
      setMessages(r.data.messages || []);
    } catch {}
  };

  // Long press opens delete sheet
  const handleLongPress = (msg) => {
    setDeleteSheet(msg);
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark"/>
    </div>
  );

  return (
    <div style={{ position:'fixed', top:'var(--header-height)', left:0, right:0, bottom:0, display:'flex', flexDirection:'column', background:'#0B141A' }}>

      {/* Delete bottom sheet */}
      {deleteSheet && (
        <DeleteSheet
          msg={deleteSheet}
          isMe={deleteSheet.sender?._id===user._id || deleteSheet.sender===user._id}
          onClose={() => setDeleteSheet(null)}
          onDelete={handleDelete}
        />
      )}

      {/* Reaction picker */}
      {reactionTarget && (
        <ReactionPicker
          onReact={(emoji) => handleReact(reactionTarget, emoji)}
          onClose={() => setReactionTarget(null)}
        />
      )}

      {/* Header */}
      <div style={{ padding:'10px 16px', background:'#1F2C34', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:12, flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.4)' }}>
        <Avatar name="Admin" size={42} online={true}/>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, fontSize:16, color:'#E9EDEF' }}>Peace Mindset Admin</div>
          <div style={{ fontSize:12, color:adminTyping?'#25D366':'#8696A0', marginTop:1 }}>
            {adminTyping ? '✍ typing...' : '🏫 School Administration'}
          </div>
        </div>
        <button onClick={()=>fileRef.current?.click()} style={{ background:'none', border:'none', color:'#8696A0', cursor:'pointer', fontSize:20, padding:4 }}>📎</button>
      </div>

      {/* Messages */}
      <div ref={msgsBox} style={{
        flex:1, overflowY:'auto', padding:'12px 12px 0',
        WebkitOverflowScrolling:'touch', display:'flex', flexDirection:'column', gap:4,
        backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`,
      }}>
        {messages.length===0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>💬</div>
            <div style={{ fontSize:17, fontWeight:600, color:'#E9EDEF', marginBottom:8 }}>No messages yet</div>
            <div style={{ fontSize:13, color:'#8696A0', lineHeight:1.7 }}>
              Send a message to the school admin.<br/>
              Hold any message to delete it 🗑
            </div>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender?._id===user._id || msg.sender===user._id;
          return (
            <MessageBubble
              key={msg._id}
              msg={msg}
              isMe={isMe}
              onDelete={handleDelete}
              onShare={(m) => shareMedia(m.mediaData, m.messageType==='image'?'photo.jpg':'video.mp4')}
              onDownload={(m) => downloadMedia(m.mediaData, m.messageType==='image'?'photo.jpg':'video.mp4')}
              onReact={handleReact}
              onLongPress={handleLongPress}
            />
          );
        })}
        <div style={{ height:8 }}/>
      </div>

      {/* Media progress */}
      {mediaProgress && (
        <div style={{ margin:'0 12px', padding:'8px 12px', background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:10, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${mediaProgress.progress}%`, background:'#25D366', transition:'width 0.3s' }}/>
          </div>
          <span style={{ fontSize:11, color:'#25D366' }}>{mediaProgress.label}</span>
        </div>
      )}

      {/* Recording bar */}
      {recording && (
        <div style={{ margin:'0 12px', padding:'10px 14px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:12, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#EF4444', animation:'pulse 1s infinite', flexShrink:0 }}/>
          <span style={{ fontSize:13, color:'#FC8181', fontWeight:600, flex:1 }}>🎤 Recording {fmt(recordSec)}</span>
          <button onClick={cancelRec} style={{ padding:'4px 12px', borderRadius:8, background:'transparent', border:'1px solid rgba(239,68,68,0.4)', color:'#FC8181', fontSize:12, cursor:'pointer' }}>✕ Cancel</button>
          <button onClick={stopRec} style={{ padding:'4px 14px', borderRadius:8, background:'#EF4444', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>⬛ Send</button>
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding:'8px 12px 16px', background:'#1F2C34', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }}/>
        <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
          <textarea
            ref={inputRef} value={input}
            onChange={e => handleTyping(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();} }}
            placeholder="Message"
            rows={1}
            style={{ flex:1, padding:'11px 14px', background:'#2A3942', border:'1.5px solid rgba(255,255,255,0.06)', borderRadius:24, resize:'none', outline:'none', color:'#E9EDEF', fontFamily:'var(--font-body)', fontSize:'16px', lineHeight:1.5, maxHeight:120 }}
          />
          {input.trim() ? (
            <button onClick={sendText} disabled={sending} style={sendBtnStyle}>
              {sending ? <span className="spinner" style={{width:16,height:16}}/> : '➤'}
            </button>
          ) : (
            <button
              onMouseDown={startRec} onMouseUp={stopRec}
              onTouchStart={e=>{e.preventDefault();startRec();}}
              onTouchEnd={e=>{e.preventDefault();stopRec();}}
              style={{...sendBtnStyle, background:recording?'#EF4444':'linear-gradient(135deg,#00A884,#128C7E)', boxShadow:recording?'0 0 18px rgba(239,68,68,0.6)':'0 2px 12px rgba(37,211,102,0.4)'}}
            >🎤</button>
          )}
        </div>
        <div style={{ textAlign:'center', marginTop:5, fontSize:10, color:'rgba(255,255,255,0.18)' }}>
          Hold any message to delete · 📎 photos & videos up to 50MB
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

const sendBtnStyle = {
  width:46, height:46, borderRadius:'50%', flexShrink:0,
  background:'linear-gradient(135deg,#00A884,#128C7E)',
  border:'none', color:'#fff', fontSize:18, cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center',
  boxShadow:'0 2px 12px rgba(37,211,102,0.4)',
};
