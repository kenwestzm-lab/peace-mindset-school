import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (d) =>
  d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

const fmtDate = (d) => {
  if (!d) return '';
  const now = new Date(); const dd = new Date(d);
  const diff = Math.floor((now - dd) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return dd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const timeLeft = (exp) => {
  const diff = new Date(exp) - new Date();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

// ─── Story Viewer ────────────────────────────────────────────────────────────
function StoryViewer({ stories, startIdx, onClose, currentUser }) {
  const [idx, setIdx] = useState(startIdx || 0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const story = stories[idx];

  const markViewed = useCallback(async (sid) => {
    try { await api.put(`/stories/${sid}/view`); } catch {}
  }, []);

  useEffect(() => {
    if (!story) return;
    markViewed(story._id);
    setProgress(0);
    const duration = story.mediaType === 'video' ? 15000 : 5000;
    const step = 100 / (duration / 100);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timerRef.current);
          if (idx < stories.length - 1) setIdx(i => i + 1);
          else onClose();
          return 100;
        }
        return p + step;
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [idx, story]);

  if (!story) return null;

  return (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:9999, display:'flex', flexDirection:'column', userSelect:'none' }}>
      {/* Progress bars */}
      <div style={{ display:'flex', gap:3, padding:'12px 12px 0', flexShrink:0 }}>
        {stories.map((_, i) => (
          <div key={i} style={{ flex:1, height:3, background:'rgba(255,255,255,0.3)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'#fff', width:`${i < idx ? 100 : i === idx ? progress : 0}%`, transition: i === idx ? 'none' : 'none' }} />
          </div>
        ))}
      </div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#9B1826,#C02035)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff' }}>
          {story.author?.profilePic ? <img src={story.author.profilePic} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : story.author?.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#fff' }}>{story.author?.name}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>{timeLeft(story.expiresAt)}</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', padding:4 }}>✕</button>
      </div>
      {/* Media */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}
        onClick={e => { const x = e.clientX / window.innerWidth; if (x < 0.35) { if (idx > 0) { clearInterval(timerRef.current); setIdx(i => i - 1); } } else { clearInterval(timerRef.current); if (idx < stories.length - 1) setIdx(i => i + 1); else onClose(); } }}>
        {story.mediaType === 'image' && story.mediaData &&
          <img src={story.mediaData} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} alt="" />}
        {story.mediaType === 'video' && story.mediaData &&
          <video src={story.mediaData} autoPlay muted style={{ maxWidth:'100%', maxHeight:'100%' }} />}
        {story.text &&
          <div style={{ position:'absolute', bottom:80, left:0, right:0, padding:'16px 20px', background:'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
            <p style={{ color:'#fff', fontSize:16, fontWeight:500, margin:0, textAlign:'center' }}>{story.text}</p>
          </div>}
        {/* Tap zones hint */}
        <div style={{ position:'absolute', left:0, top:0, width:'35%', height:'100%' }} />
        <div style={{ position:'absolute', right:0, top:0, width:'65%', height:'100%' }} />
      </div>
      {/* Viewers count */}
      {story.author?._id === currentUser?._id &&
        <div style={{ padding:'10px 16px', flexShrink:0, display:'flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.7)', fontSize:13 }}>
          <span>👁</span><span>{story.viewers?.length || 0} views</span>
        </div>}
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────
function Bubble({ msg, isMe, onDelete, onReact, onLongPress }) {
  const [imgFull, setImgFull] = useState(false);
  const pressTimer = useRef(null);
  const moved = useRef(false);
  const time = fmt(msg.createdAt);
  const deleted = msg.deletedForEveryone;

  const onTouchStart = () => { moved.current = false; pressTimer.current = setTimeout(() => { if (!moved.current) { navigator.vibrate?.(40); onLongPress(msg); } }, 450); };
  const onTouchMove = () => { moved.current = true; };
  const onTouchEnd = () => clearTimeout(pressTimer.current);

  const bubbleStyle = {
    maxWidth: '72%', padding: deleted ? '8px 14px' : '8px 12px 6px',
    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    background: isMe ? 'linear-gradient(135deg,#005C4B,#128C7E)' : '#1F2C34',
    color: deleted ? 'rgba(255,255,255,0.4)' : '#E9EDEF',
    fontSize: 15, lineHeight: 1.45, wordBreak: 'break-word',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    fontStyle: deleted ? 'italic' : 'normal',
    position: 'relative',
  };

  return (
    <>
      <div style={{ display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom:2, padding:'0 10px' }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onTouchStart} onMouseUp={onTouchEnd}>
        <div style={bubbleStyle}>
          {deleted ? <span>🚫 Message deleted</span> : (<>
            {msg.messageType === 'image' && msg.mediaData && (
              <img src={msg.mediaData} style={{ maxWidth:'100%', borderRadius:10, display:'block', marginBottom:4, cursor:'pointer' }}
                onClick={() => setImgFull(true)} alt="" />)}
            {msg.messageType === 'video' && msg.mediaData && (
              <video src={msg.mediaData} controls style={{ maxWidth:'100%', borderRadius:10, display:'block', marginBottom:4 }} />)}
            {msg.messageType === 'voice' && msg.mediaData && (
              <audio src={msg.mediaData} controls style={{ width:200, height:32 }} />)}
            {msg.content && <span>{msg.content}</span>}
            {/* Reactions */}
            {msg.reactions?.length > 0 && (
              <div style={{ position:'absolute', bottom:-10, right:6, background:'#2A3942', borderRadius:10, padding:'2px 6px', fontSize:13, boxShadow:'0 1px 4px rgba(0,0,0,0.4)' }}>
                {[...new Set(msg.reactions.map(r => r.emoji))].join('')}
                <span style={{ fontSize:10, color:'#8696A0', marginLeft:3 }}>{msg.reactions.length}</span>
              </div>)}
          </>)}
          <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:3, marginTop:2 }}>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>{time}</span>
            {isMe && !deleted && <span style={{ fontSize:11, color: msg.isRead ? '#53BDEB' : 'rgba(255,255,255,0.45)' }}>{msg.isRead ? '✓✓' : '✓✓'}</span>}
          </div>
        </div>
      </div>
      {imgFull && msg.mediaData && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setImgFull(false)}>
          <img src={msg.mediaData} style={{ maxWidth:'95vw', maxHeight:'90vh', objectFit:'contain', borderRadius:8 }} alt="" />
        </div>)}
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ParentChat() {
  const { user } = useStore();

  // Tab: 'chats' | 'updates'
  const [tab, setTab] = useState('chats');

  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRec, setMediaRec] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [menu, setMenu] = useState(null); // { msg }
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimer = useRef(null);

  // Stories state
  const [stories, setStories] = useState([]);       // grouped by author
  const [myStories, setMyStories] = useState([]);
  const [viewer, setViewer] = useState(null);        // { stories, startIdx }
  const [showCreate, setShowCreate] = useState(false);
  const [storyMedia, setStoryMedia] = useState(null);
  const [storyText, setStoryText] = useState('');
  const [storyPreview, setStoryPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const storyFileRef = useRef(null);

  // ── Load chat messages ──
  const loadMessages = useCallback(async () => {
    try {
      const res = await api.get('/chat/messages');
      setMessages(res.data.messages || []);
    } catch {}
  }, []);

  // ── Load stories ──
  const loadStories = useCallback(async () => {
    try {
      const res = await api.get('/stories');
      const all = res.data.stories || [];
      // Group by author
      const map = {};
      all.forEach(s => {
        const aid = s.author?._id;
        if (!map[aid]) map[aid] = { author: s.author, items: [] };
        map[aid].items.push(s);
      });
      const mine = map[user?._id];
      setMyStories(mine ? mine.items : []);
      const others = Object.values(map).filter(g => g.author?._id !== user?._id);
      setStories(others);
    } catch {}
  }, [user?._id]);

  useEffect(() => {
    loadMessages();
    loadStories();
  }, [loadMessages, loadStories]);

  // ── Socket ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      // Mark read
      api.put(`/chat/${msg._id}/read`).catch(() => {});
    });
    socket.on('admin_typing', ({ isTyping }) => setTyping(isTyping));
    socket.on('message_deleted', ({ msgId, forEveryone }) => {
      if (forEveryone) setMessages(prev => prev.map(m => m._id === msgId ? { ...m, deletedForEveryone: true } : m));
    });
    socket.on('message_reaction', ({ msgId }) => {
      // Re-fetch that message
      api.get(`/chat/message/${msgId}`).then(r => {
        setMessages(prev => prev.map(m => m._id === msgId ? r.data.message : m));
      }).catch(() => {});
    });
    socket.on('new_story', ({ story }) => {
      loadStories();
    });
    socket.on('stories_expired', loadStories);

    return () => {
      socket.off('new_message');
      socket.off('admin_typing');
      socket.off('message_deleted');
      socket.off('message_reaction');
      socket.off('new_story');
      socket.off('stories_expired');
    };
  }, [loadStories]);

  // ── Auto scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Typing indicator ──
  const handleTyping = (val) => {
    setInput(val);
    const socket = getSocket();
    if (!socket) return;
    socket.emit('typing', { isTyping: true, senderRole: 'parent', parentId: user?._id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing', { isTyping: false, senderRole: 'parent', parentId: user?._id });
    }, 1500);
  };

  // ── Send text ──
  const sendText = () => {
    const txt = input.trim();
    if (!txt) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('send_message', {
      senderId: user?._id, senderRole: 'parent',
      parentId: user?._id, content: txt, messageType: 'text',
    });
    setInput('');
    socket.emit('typing', { isTyping: false, senderRole: 'parent', parentId: user?._id });
  };

  // ── Send media ──
  const sendMedia = async (file) => {
    if (!file) return;
    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');
    if (!isImg && !isVid) { toast.error('Only images or videos'); return; }
    toast('Uploading...', { icon: '📎' });
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const socket = getSocket();
        if (!socket) return;
        const base64 = e.target.result;
        socket.emit('send_message', {
          senderId: user?._id, senderRole: 'parent',
          parentId: user?._id, content: '',
          messageType: isImg ? 'image' : 'video',
          mediaData: base64, mediaMimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } catch { toast.error('Upload failed'); }
  };

  // ── Voice recording ──
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const ch = [];
      mr.ondataavailable = e => ch.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(ch, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = e => {
          const socket = getSocket();
          if (!socket) return;
          socket.emit('send_message', {
            senderId: user?._id, senderRole: 'parent',
            parentId: user?._id, content: '',
            messageType: 'voice', mediaData: e.target.result,
            mediaMimeType: 'audio/webm', duration: Math.round(blob.size / 16000),
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setMediaRec(mr); setChunks(ch); setRecording(true);
    } catch { toast.error('Microphone access denied'); }
  };

  const stopRec = () => { mediaRec?.stop(); setRecording(false); setMediaRec(null); };

  // ── Delete ──
  const onDelete = async (msgId, forEveryone) => {
    try {
      await api.delete(`/chat/${msgId}`, { data: { forEveryone } });
      if (forEveryone) setMessages(prev => prev.map(m => m._id === msgId ? { ...m, deletedForEveryone: true } : m));
      else setMessages(prev => prev.filter(m => m._id !== msgId));
      setMenu(null);
    } catch { toast.error('Delete failed'); }
  };

  // ── React ──
  const onReact = async (msgId, emoji) => {
    try { await api.put(`/chat/${msgId}/react`, { emoji }); setMenu(null); } catch {}
  };

  // ── Post story ──
  const postStory = async () => {
    if (!storyMedia && !storyText.trim()) { toast.error('Add media or text'); return; }
    setPosting(true);
    try {
      let mediaData = null, mediaMimeType = null, mediaType = 'text';
      if (storyMedia) {
        const reader = new FileReader();
        await new Promise((res, rej) => {
          reader.onload = e => { mediaData = e.target.result; res(); };
          reader.onerror = rej;
          reader.readAsDataURL(storyMedia);
        });
        mediaMimeType = storyMedia.type;
        mediaType = storyMedia.type.startsWith('video/') ? 'video' : 'image';
      }
      await api.post('/stories', { mediaData, mediaMimeType, mediaType, text: storyText || null });
      toast.success('Story posted!');
      setShowCreate(false); setStoryMedia(null); setStoryText(''); setStoryPreview(null);
      loadStories();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setPosting(false); }
  };

  // ── Group messages by date ──
  const grouped = messages.reduce((acc, msg) => {
    const day = fmtDate(msg.createdAt);
    if (!acc.length || acc[acc.length - 1].date !== day) acc.push({ date: day, msgs: [msg] });
    else acc[acc.length - 1].msgs.push(msg);
    return acc;
  }, []);

  const hasMyStory = myStories.length > 0;
  const allStories = stories;

  // ── Styles ──────────────────────────────────────────────────────────
  const S = {
    root: { display:'flex', flexDirection:'column', height:'100dvh', background:'#0B141A', color:'#E9EDEF', fontFamily:"'Segoe UI', system-ui, sans-serif", overflow:'hidden' },
    topBar: { display:'flex', alignItems:'center', background:'#1F2C34', padding:'10px 16px', gap:14, flexShrink:0, borderBottom:'1px solid rgba(255,255,255,0.06)' },
    tabBar: { display:'flex', background:'#1F2C34', flexShrink:0, borderBottom:'2px solid #128C7E' },
    tab: (active) => ({ flex:1, padding:'11px 0', textAlign:'center', fontSize:13, fontWeight:600, letterSpacing:.5, cursor:'pointer', color: active ? '#25D366' : '#8696A0', borderBottom: active ? '2px solid #25D366' : '2px solid transparent', transition:'all .2s', background:'none', border:'none', textTransform:'uppercase' }),
    chatArea: { flex:1, overflowY:'auto', padding:'8px 0 4px' },
    dateSep: { textAlign:'center', margin:'10px 0', fontSize:11, color:'#8696A0' },
    dateChip: { background:'#1F2C34', padding:'4px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)' },
    inputBar: { display:'flex', alignItems:'flex-end', gap:8, padding:'8px 10px', background:'#1F2C34', flexShrink:0, borderTop:'1px solid rgba(255,255,255,0.06)' },
    textarea: { flex:1, padding:'11px 14px', background:'#2A3942', border:'1.5px solid rgba(255,255,255,0.06)', borderRadius:24, resize:'none', outline:'none', color:'#E9EDEF', fontSize:15, lineHeight:1.5, maxHeight:100, fontFamily:'inherit' },
    iconBtn: (color) => ({ width:44, height:44, borderRadius:'50%', background: color || '#2A3942', border:'none', color:'#8696A0', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }),
    sendBtn: { width:46, height:46, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#00A884,#128C7E)', border:'none', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
    // Stories
    storiesRow: { display:'flex', gap:12, overflowX:'auto', padding:'12px 12px 8px', scrollbarWidth:'none' },
    storyBubble: (hasNew) => ({ display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer', flexShrink:0, width:62 }),
    storyRing: (hasNew, isMe) => ({ width:58, height:58, borderRadius:'50%', padding:2, background: isMe ? 'linear-gradient(135deg,#2A3942,#3B4A54)' : hasNew ? 'linear-gradient(135deg,#25D366,#128C7E)' : 'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }),
    storyInner: { width:'100%', height:'100%', borderRadius:'50%', overflow:'hidden', background:'#2A3942', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, color:'#fff' },
    storyLabel: { fontSize:10, color:'#8696A0', textAlign:'center', maxWidth:62, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
    addBadge: { position:'absolute', bottom:0, right:0, width:18, height:18, borderRadius:'50%', background:'#25D366', color:'#fff', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #0B141A' },
    // Overlay
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:998, display:'flex', alignItems:'flex-end', justifyContent:'center' },
    sheet: { background:'#1F2C34', borderRadius:'20px 20px 0 0', padding:'20px 16px 32px', width:'100%', maxWidth:480 },
    menuOverlay: { position:'fixed', inset:0, zIndex:997, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)' },
    menuBox: { background:'#233138', borderRadius:14, overflow:'hidden', width:240, boxShadow:'0 8px 32px rgba(0,0,0,0.7)' },
    menuBtn: { display:'block', width:'100%', padding:'14px 18px', background:'none', border:'none', color:'#E9EDEF', fontSize:15, textAlign:'left', cursor:'pointer' },
    typingDot: { display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#25D366', animation:'pulse 1s infinite', margin:'0 2px' },
  };

  return (
    <div style={S.root}>
      {/* Story Viewer */}
      {viewer && (
        <StoryViewer stories={viewer.stories} startIdx={viewer.startIdx}
          onClose={() => setViewer(null)} currentUser={user} />)}

      {/* Context Menu */}
      {menu && (
        <div style={S.menuOverlay} onClick={() => setMenu(null)}>
          <div style={S.menuBox} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'8px 12px', display:'flex', gap:4, borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
              {['❤️','👍','😂','😮','😢','🙏'].map(e => (
                <button key={e} onClick={() => onReact(menu.msg._id, e)}
                  style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', padding:'2px 4px' }}>{e}</button>))}
            </div>
            {menu.msg.mediaData && !menu.msg.deletedForEveryone && (
              <button onClick={() => { const a = document.createElement('a'); a.href = menu.msg.mediaData; a.download = 'media'; a.click(); setMenu(null); }} style={S.menuBtn}>⬇ Download</button>)}
            <button onClick={() => onDelete(menu.msg._id, false)} style={{ ...S.menuBtn, color:'#FC8181' }}>🗑 Delete for me</button>
            {menu.msg.sender?._id === user?._id && !menu.msg.deletedForEveryone && (
              <button onClick={() => onDelete(menu.msg._id, true)} style={{ ...S.menuBtn, color:'#FC8181' }}>🗑 Delete for everyone</button>)}
            <button onClick={() => setMenu(null)} style={{ ...S.menuBtn, color:'#8696A0' }}>✕ Cancel</button>
          </div>
        </div>)}

      {/* Story Create Sheet */}
      {showCreate && (
        <div style={S.overlay} onClick={() => setShowCreate(false)}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:14, color:'#E9EDEF' }}>📸 New Story</div>
            <input ref={storyFileRef} type="file" accept="image/*,video/*" style={{ display:'none' }}
              onChange={e => { const f = e.target.files[0]; if (!f) return; setStoryMedia(f); const r = new FileReader(); r.onload = ev => setStoryPreview(ev.target.result); r.readAsDataURL(f); }} />
            {storyPreview
              ? <div style={{ position:'relative', marginBottom:12 }}>
                  {storyMedia?.type.startsWith('video/')
                    ? <video src={storyPreview} style={{ width:'100%', borderRadius:12, maxHeight:220, objectFit:'cover' }} muted />
                    : <img src={storyPreview} style={{ width:'100%', borderRadius:12, maxHeight:220, objectFit:'cover' }} alt="" />}
                  <button onClick={() => { setStoryMedia(null); setStoryPreview(null); }}
                    style={{ position:'absolute', top:8, right:8, background:'rgba(239,68,68,0.8)', border:'none', color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:14 }}>✕</button>
                </div>
              : <button onClick={() => storyFileRef.current?.click()}
                  style={{ width:'100%', padding:'20px', background:'#2A3942', border:'2px dashed rgba(255,255,255,0.15)', borderRadius:12, color:'#8696A0', cursor:'pointer', marginBottom:12, fontSize:14 }}>
                  📎 Tap to add photo or video
                </button>}
            <textarea value={storyText} onChange={e => setStoryText(e.target.value)}
              placeholder="Add a caption..." rows={2}
              style={{ width:'100%', background:'#2A3942', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 12px', color:'#E9EDEF', fontSize:14, resize:'none', outline:'none', marginBottom:12, boxSizing:'border-box' }} />
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowCreate(false)}
                style={{ flex:1, padding:'12px', background:'#2A3942', border:'none', borderRadius:10, color:'#8696A0', cursor:'pointer', fontSize:14 }}>Cancel</button>
              <button onClick={postStory} disabled={posting}
                style={{ flex:2, padding:'12px', background:'linear-gradient(135deg,#00A884,#128C7E)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14 }}>
                {posting ? 'Posting...' : '📤 Post Story (24h)'}
              </button>
            </div>
          </div>
        </div>)}

      {/* Tab Bar */}
      <div style={S.tabBar}>
        <button style={S.tab(tab === 'chats')} onClick={() => setTab('chats')}>💬 Chats</button>
        <button style={S.tab(tab === 'updates')} onClick={() => setTab('updates')}>🔵 Updates</button>
      </div>

      {/* UPDATES TAB */}
      {tab === 'updates' && (
        <div style={{ flex:1, overflowY:'auto' }}>
          {/* My Status */}
          <div style={{ padding:'12px 16px 6px', fontSize:12, color:'#8696A0', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>My Status</div>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px 12px', cursor:'pointer', borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ ...S.storyRing(false, true), width:52, height:52 }}>
                <div style={{ ...S.storyInner, fontSize:18 }}>
                  {user?.profilePic ? <img src={user.profilePic} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : user?.name?.[0]?.toUpperCase()}
                </div>
              </div>
              <div style={S.addBadge} onClick={() => setShowCreate(true)}>+</div>
            </div>
            <div onClick={hasMyStory ? () => setViewer({ stories: myStories, startIdx: 0 }) : () => setShowCreate(true)}>
              <div style={{ fontSize:14, fontWeight:600, color:'#E9EDEF' }}>My status</div>
              <div style={{ fontSize:12, color:'#8696A0' }}>{hasMyStory ? `${myStories.length} update${myStories.length > 1 ? 's' : ''}` : 'Tap to add status update'}</div>
            </div>
          </div>

          {/* Others */}
          {allStories.length > 0 && <>
            <div style={{ padding:'12px 16px 6px', fontSize:12, color:'#8696A0', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Recent Updates</div>
            {allStories.map(group => (
              <div key={group.author?._id}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', cursor:'pointer', borderBottom:'0.5px solid rgba(255,255,255,0.04)' }}
                onClick={() => setViewer({ stories: group.items, startIdx: 0 })}>
                <div style={{ ...S.storyRing(true, false), width:52, height:52, flexShrink:0 }}>
                  <div style={{ ...S.storyInner, fontSize:18 }}>
                    {group.author?.profilePic ? <img src={group.author.profilePic} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : group.author?.name?.[0]?.toUpperCase()}
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#E9EDEF' }}>{group.author?.name}</div>
                  <div style={{ fontSize:12, color:'#8696A0' }}>{timeLeft(group.items[group.items.length - 1]?.expiresAt)}</div>
                </div>
                <div style={{ fontSize:11, color:'#8696A0' }}>{group.items.length} update{group.items.length > 1 ? 's' : ''}</div>
              </div>))}
          </>}
          {allStories.length === 0 && myStories.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'#8696A0' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📷</div>
              <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>No updates yet</div>
              <div style={{ fontSize:13 }}>Tap + to share your first status</div>
            </div>)}
        </div>)}

      {/* CHATS TAB */}
      {tab === 'chats' && (<>
        {/* Chat header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'#1F2C34', flexShrink:0, borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#9B1826,#C02035)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#fff', flexShrink:0 }}>🏫</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:600 }}>School Admin</div>
            {typing
              ? <div style={{ fontSize:12, color:'#25D366' }}>typing<span style={S.typingDot} /><span style={{ ...S.typingDot, animationDelay:'.2s' }} /><span style={{ ...S.typingDot, animationDelay:'.4s' }} /></div>
              : <div style={{ fontSize:12, color:'#8696A0' }}>Peace Mindset Private School</div>}
          </div>
        </div>

        {/* Messages */}
        <div style={S.chatArea}>
          {messages.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'#8696A0' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>💬</div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>No messages yet</div>
              <div style={{ fontSize:13 }}>Send a message to the school admin</div>
            </div>)}
          {grouped.map((group, gi) => (
            <div key={gi}>
              <div style={S.dateSep}><span style={S.dateChip}>{group.date}</span></div>
              {group.msgs.map(msg => {
                const isMe = msg.senderRole === 'parent';
                return (
                  <Bubble key={msg._id} msg={msg} isMe={isMe}
                    onDelete={onDelete} onReact={onReact}
                    onLongPress={(m) => setMenu({ msg: m })} />);
              })}
            </div>))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={S.inputBar}>
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display:'none' }}
            onChange={e => { sendMedia(e.target.files[0]); e.target.value = ''; }} />
          <button style={S.iconBtn()} onClick={() => fileRef.current?.click()}>📎</button>
          <textarea value={input} onChange={e => handleTyping(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            placeholder="Message" rows={1} style={S.textarea} />
          {input.trim()
            ? <button style={S.sendBtn} onClick={sendText}>➤</button>
            : <button style={{ ...S.sendBtn, background: recording ? '#EF4444' : 'linear-gradient(135deg,#00A884,#128C7E)' }}
                onMouseDown={startRec} onMouseUp={stopRec}
                onTouchStart={e => { e.preventDefault(); startRec(); }} onTouchEnd={stopRec}>
                {recording ? '⏹' : '🎤'}
              </button>}
        </div>
      </>)}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        *::-webkit-scrollbar { width:0; height:0 }
        textarea { font-family: inherit }
      `}</style>
    </div>
  );
}
