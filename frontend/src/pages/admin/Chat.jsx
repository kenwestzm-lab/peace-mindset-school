import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

const fmt = (d) => d ? new Date(d).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : '';
const fmtDate = (d) => {
  if (!d) return '';
  const now = new Date(); const dd = new Date(d);
  const diff = Math.floor((now - dd) / 86400000);
  if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday';
  return dd.toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
};
const timeLeft = (exp) => {
  const diff = new Date(exp) - new Date();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ─── Story Viewer ─────────────────────────────────────────────────────────────
function StoryViewer({ stories, startIdx, onClose, currentUser }) {
  const [idx, setIdx] = useState(startIdx || 0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const story = stories[idx];
  useEffect(() => {
    if (!story) return;
    api.put(`/stories/${story._id}/view`).catch(() => {});
    setProgress(0);
    const duration = story.mediaType === 'video' ? 15000 : 5000;
    const step = 100 / (duration / 100);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(timerRef.current); if (idx < stories.length - 1) setIdx(i => i + 1); else onClose(); return 100; }
        return p + step;
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [idx]);
  if (!story) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:9999, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', gap:3, padding:'12px 12px 0', flexShrink:0 }}>
        {stories.map((_, i) => (
          <div key={i} style={{ flex:1, height:3, background:'rgba(255,255,255,0.3)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'#fff', width:`${i < idx ? 100 : i === idx ? progress : 0}%` }} />
          </div>))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'#2A3942', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff' }}>
          {story.author?.profilePic ? <img src={story.author.profilePic} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : story.author?.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#fff' }}>{story.author?.name}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>{timeLeft(story.expiresAt)}</div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer' }}>✕</button>
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}
        onClick={e => { const x = e.clientX / window.innerWidth; if (x < 0.35) { if (idx > 0) { clearInterval(timerRef.current); setIdx(i => i - 1); } } else { clearInterval(timerRef.current); if (idx < stories.length - 1) setIdx(i => i + 1); else onClose(); } }}>
        {story.mediaType === 'image' && story.mediaData && <img src={story.mediaData} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} alt="" />}
        {story.mediaType === 'video' && story.mediaData && <video src={story.mediaData} autoPlay muted style={{ maxWidth:'100%', maxHeight:'100%' }} />}
        {story.text && <div style={{ position:'absolute', bottom:80, left:0, right:0, padding:'16px 20px', background:'linear-gradient(transparent,rgba(0,0,0,0.7))' }}>
          <p style={{ color:'#fff', fontSize:16, fontWeight:500, margin:0, textAlign:'center' }}>{story.text}</p>
        </div>}
      </div>
      {story.author?._id === currentUser?._id && (
        <div style={{ padding:'10px 16px', color:'rgba(255,255,255,0.7)', fontSize:13, display:'flex', gap:6 }}>
          <span>👁</span><span>{story.viewers?.length || 0} views</span>
        </div>)}
    </div>);
}

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({ msg, isMe, onLongPress }) {
  const [imgFull, setImgFull] = useState(false);
  const pressTimer = useRef(null);
  const moved = useRef(false);
  const time = fmt(msg.createdAt);
  const deleted = msg.deletedForEveryone;
  const onTouchStart = () => { moved.current = false; pressTimer.current = setTimeout(() => { if (!moved.current) { navigator.vibrate?.(40); onLongPress(msg); } }, 450); };
  const onTouchMove = () => { moved.current = true; };
  const onTouchEnd = () => clearTimeout(pressTimer.current);
  return (
    <>
      <div style={{ display:'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom:2, padding:'0 10px' }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onTouchStart} onMouseUp={onTouchEnd}>
        <div style={{ maxWidth:'72%', padding: deleted ? '8px 14px' : '8px 12px 6px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? 'linear-gradient(135deg,#005C4B,#128C7E)' : '#1F2C34', color: deleted ? 'rgba(255,255,255,0.4)' : '#E9EDEF', fontSize:15, lineHeight:1.45, wordBreak:'break-word', boxShadow:'0 1px 4px rgba(0,0,0,0.3)', fontStyle: deleted ? 'italic' : 'normal', position:'relative' }}>
          {deleted ? <span>🚫 Message deleted</span> : (<>
            {msg.messageType === 'image' && msg.mediaData && <img src={msg.mediaData} style={{ maxWidth:'100%', borderRadius:10, display:'block', marginBottom:4, cursor:'pointer' }} onClick={() => setImgFull(true)} alt="" />}
            {msg.messageType === 'video' && msg.mediaData && <video src={msg.mediaData} controls style={{ maxWidth:'100%', borderRadius:10, display:'block', marginBottom:4 }} />}
            {msg.messageType === 'voice' && msg.mediaData && <audio src={msg.mediaData} controls style={{ width:200, height:32 }} />}
            {msg.content && <span>{msg.content}</span>}
            {msg.reactions?.length > 0 && <div style={{ position:'absolute', bottom:-10, right:6, background:'#2A3942', borderRadius:10, padding:'2px 6px', fontSize:13, boxShadow:'0 1px 4px rgba(0,0,0,0.4)' }}>{[...new Set(msg.reactions.map(r => r.emoji))].join('')}<span style={{ fontSize:10, color:'#8696A0', marginLeft:3 }}>{msg.reactions.length}</span></div>}
          </>)}
          <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:3, marginTop:2 }}>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.45)' }}>{time}</span>
            {isMe && !deleted && <span style={{ fontSize:11, color: msg.isRead ? '#53BDEB' : 'rgba(255,255,255,0.45)' }}>✓✓</span>}
          </div>
        </div>
      </div>
      {imgFull && msg.mediaData && <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setImgFull(false)}>
        <img src={msg.mediaData} style={{ maxWidth:'95vw', maxHeight:'90vh', objectFit:'contain', borderRadius:8 }} alt="" />
      </div>}
    </>);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminChat() {
  const { user } = useStore();

  // Panel: 'list' | 'chat' | 'stories'
  const [panel, setPanel] = useState('list');
  const [parents, setParents] = useState([]);
  const [selected, setSelected] = useState(null); // { _id, name, profilePic }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [parentTyping, setParentTyping] = useState({});
  const [unread, setUnread] = useState({});
  const [menu, setMenu] = useState(null);
  const [recording, setRecording] = useState(false);
  const [mediaRec, setMediaRec] = useState(null);
  const [search, setSearch] = useState('');

  // Stories
  const [storyGroups, setStoryGroups] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [storyMedia, setStoryMedia] = useState(null);
  const [storyText, setStoryText] = useState('');
  const [storyPreview, setStoryPreview] = useState(null);
  const [posting, setPosting] = useState(false);

  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const storyFileRef = useRef(null);
  const typingTimer = useRef(null);

  // ── Load parents ──
  const loadParents = useCallback(async () => {
    try {
      const res = await api.get('/admin/parents');
      setParents(res.data.parents || []);
    } catch {}
  }, []);

  // ── Load messages for selected parent ──
  const loadMessages = useCallback(async (parentId) => {
    if (!parentId) return;
    try {
      const res = await api.get(`/chat/messages/${parentId}`);
      setMessages(res.data.messages || []);
      setUnread(u => ({ ...u, [parentId]: 0 }));
    } catch {}
  }, []);

  // ── Load stories ──
  const loadStories = useCallback(async () => {
    try {
      const res = await api.get('/stories');
      const all = res.data.stories || [];
      const map = {};
      all.forEach(s => { const aid = s.author?._id; if (!map[aid]) map[aid] = { author: s.author, items: [] }; map[aid].items.push(s); });
      const mine = map[user?._id];
      setMyStories(mine ? mine.items : []);
      setStoryGroups(Object.values(map).filter(g => g.author?._id !== user?._id));
    } catch {}
  }, [user?._id]);

  useEffect(() => { loadParents(); loadStories(); }, [loadParents, loadStories]);

  // ── Select parent → load messages ──
  useEffect(() => {
    if (selected) loadMessages(selected._id);
  }, [selected, loadMessages]);

  // ── Socket ──
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('new_message', (msg) => {
      const pid = msg.parentId;
      setMessages(prev => {
        if (selected?._id === pid) {
          api.put(`/chat/${msg._id}/read`).catch(() => {});
          return [...prev, msg];
        }
        return prev;
      });
      setUnread(u => selected?._id === pid ? u : { ...u, [pid]: (u[pid] || 0) + 1 });
    });
    socket.on('user_typing', ({ parentId, isTyping }) => {
      setParentTyping(t => ({ ...t, [parentId]: isTyping }));
    });
    socket.on('message_deleted', ({ msgId, forEveryone }) => {
      if (forEveryone) setMessages(prev => prev.map(m => m._id === msgId ? { ...m, deletedForEveryone: true } : m));
    });
    socket.on('message_reaction', ({ msgId }) => {
      api.get(`/chat/message/${msgId}`).then(r => {
        setMessages(prev => prev.map(m => m._id === msgId ? r.data.message : m));
      }).catch(() => {});
    });
    socket.on('new_story', loadStories);
    socket.on('stories_expired', loadStories);
    return () => {
      socket.off('new_message'); socket.off('user_typing');
      socket.off('message_deleted'); socket.off('message_reaction');
      socket.off('new_story'); socket.off('stories_expired');
    };
  }, [selected, loadStories]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const handleTyping = (val) => {
    setInput(val);
    const socket = getSocket(); if (!socket) return;
    socket.emit('typing', { isTyping:true, senderRole:'admin', parentId: selected?._id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('typing', { isTyping:false, senderRole:'admin', parentId: selected?._id }), 1500);
  };

  const sendText = () => {
    const txt = input.trim(); if (!txt || !selected) return;
    const socket = getSocket(); if (!socket) return;
    socket.emit('send_message', { senderId: user?._id, senderRole:'admin', parentId: selected._id, content: txt, messageType:'text' });
    setInput('');
    socket.emit('typing', { isTyping:false, senderRole:'admin', parentId: selected._id });
  };

  const sendMedia = async (file) => {
    if (!file || !selected) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { toast.error('Images/videos only'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const socket = getSocket(); if (!socket) return;
      socket.emit('send_message', { senderId: user?._id, senderRole:'admin', parentId: selected._id, content:'', messageType: file.type.startsWith('image/') ? 'image' : 'video', mediaData: e.target.result, mediaMimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mr = new MediaRecorder(stream); const ch = [];
      mr.ondataavailable = e => ch.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(ch, { type:'audio/webm' });
        const reader = new FileReader();
        reader.onload = e => {
          const socket = getSocket(); if (!socket) return;
          socket.emit('send_message', { senderId: user?._id, senderRole:'admin', parentId: selected?._id, content:'', messageType:'voice', mediaData: e.target.result, mediaMimeType:'audio/webm', duration: Math.round(blob.size/16000) });
        };
        reader.readAsDataURL(blob); stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); setMediaRec(mr); setRecording(true);
    } catch { toast.error('Mic denied'); }
  };
  const stopRec = () => { mediaRec?.stop(); setRecording(false); setMediaRec(null); };

  const onDelete = async (msgId, forEveryone) => {
    try { await api.delete(`/chat/${msgId}`, { data:{ forEveryone } }); if (forEveryone) setMessages(prev => prev.map(m => m._id === msgId ? { ...m, deletedForEveryone:true } : m)); else setMessages(prev => prev.filter(m => m._id !== msgId)); setMenu(null); } catch { toast.error('Delete failed'); }
  };
  const onReact = async (msgId, emoji) => { try { await api.put(`/chat/${msgId}/react`, { emoji }); setMenu(null); } catch {} };

  const postStory = async () => {
    if (!storyMedia && !storyText.trim()) { toast.error('Add media or text'); return; }
    setPosting(true);
    try {
      let mediaData = null, mediaMimeType = null, mediaType = 'text';
      if (storyMedia) {
        await new Promise((res, rej) => { const r = new FileReader(); r.onload = e => { mediaData = e.target.result; res(); }; r.onerror = rej; r.readAsDataURL(storyMedia); });
        mediaMimeType = storyMedia.type;
        mediaType = storyMedia.type.startsWith('video/') ? 'video' : 'image';
      }
      await api.post('/stories', { mediaData, mediaMimeType, mediaType, text: storyText || null });
      toast.success('Story posted!');
      setShowCreate(false); setStoryMedia(null); setStoryText(''); setStoryPreview(null);
      loadStories();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setPosting(false); }
  };

  const grouped = messages.reduce((acc, msg) => {
    const day = fmtDate(msg.createdAt);
    if (!acc.length || acc[acc.length-1].date !== day) acc.push({ date:day, msgs:[msg] });
    else acc[acc.length-1].msgs.push(msg);
    return acc;
  }, []);

  const filteredParents = parents.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()));
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  // ── Styles ──
  const S = {
    root: { display:'flex', flexDirection:'column', height:'100dvh', background:'#0B141A', color:'#E9EDEF', fontFamily:"'Segoe UI', system-ui, sans-serif", overflow:'hidden' },
    tabBar: { display:'flex', background:'#1F2C34', flexShrink:0, borderBottom:'1px solid rgba(255,255,255,0.08)' },
    tab: (a) => ({ flex:1, padding:'12px 0', textAlign:'center', fontSize:13, fontWeight:600, cursor:'pointer', color: a ? '#25D366' : '#8696A0', borderBottom: a ? '2px solid #25D366' : '2px solid transparent', background:'none', border:'none', textTransform:'uppercase', letterSpacing:.5, position:'relative' }),
    badge: { position:'absolute', top:6, right:'25%', background:'#25D366', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:10, fontWeight:700 },
    // Parent list
    listItem: (sel) => ({ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', borderBottom:'0.5px solid rgba(255,255,255,0.04)', background: sel ? 'rgba(37,211,102,0.08)' : 'transparent', transition:'background .15s' }),
    avatar: (color) => ({ width:46, height:46, borderRadius:'50%', background: color || 'linear-gradient(135deg,#9B1826,#C02035)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:'#fff', flexShrink:0, overflow:'hidden' }),
    // Input bar
    inputBar: { display:'flex', alignItems:'flex-end', gap:8, padding:'8px 10px', background:'#1F2C34', flexShrink:0, borderTop:'1px solid rgba(255,255,255,0.06)' },
    textarea: { flex:1, padding:'11px 14px', background:'#2A3942', border:'1.5px solid rgba(255,255,255,0.06)', borderRadius:24, resize:'none', outline:'none', color:'#E9EDEF', fontSize:15, lineHeight:1.5, maxHeight:100, fontFamily:'inherit' },
    iconBtn: { width:44, height:44, borderRadius:'50%', background:'#2A3942', border:'none', color:'#8696A0', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
    sendBtn: { width:46, height:46, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#00A884,#128C7E)', border:'none', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:998, display:'flex', alignItems:'flex-end', justifyContent:'center' },
    sheet: { background:'#1F2C34', borderRadius:'20px 20px 0 0', padding:'20px 16px 32px', width:'100%', maxWidth:480 },
    menuOverlay: { position:'fixed', inset:0, zIndex:997, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)' },
    menuBox: { background:'#233138', borderRadius:14, overflow:'hidden', width:240, boxShadow:'0 8px 32px rgba(0,0,0,0.7)' },
    menuBtn: { display:'block', width:'100%', padding:'14px 18px', background:'none', border:'none', color:'#E9EDEF', fontSize:15, textAlign:'left', cursor:'pointer' },
    storyRing: (hasNew) => ({ width:52, height:52, borderRadius:'50%', padding:2, background: hasNew ? 'linear-gradient(135deg,#25D366,#128C7E)' : 'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }),
    storyInner: { width:'100%', height:'100%', borderRadius:'50%', overflow:'hidden', background:'#2A3942', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff' },
    addBadge: { position:'absolute', bottom:0, right:0, width:18, height:18, borderRadius:'50%', background:'#25D366', color:'#fff', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #0B141A' },
  };

  return (
    <div style={S.root}>
      {viewer && <StoryViewer stories={viewer.stories} startIdx={viewer.startIdx} onClose={() => setViewer(null)} currentUser={user} />}

      {menu && (
        <div style={S.menuOverlay} onClick={() => setMenu(null)}>
          <div style={S.menuBox} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'8px 12px', display:'flex', gap:4, borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
              {['❤️','👍','😂','😮','😢','🙏'].map(e => (<button key={e} onClick={() => onReact(menu.msg._id, e)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', padding:'2px 4px' }}>{e}</button>))}
            </div>
            {menu.msg.mediaData && !menu.msg.deletedForEveryone && <button onClick={() => { const a = document.createElement('a'); a.href = menu.msg.mediaData; a.download='media'; a.click(); setMenu(null); }} style={S.menuBtn}>⬇ Download</button>}
            <button onClick={() => onDelete(menu.msg._id, false)} style={{ ...S.menuBtn, color:'#FC8181' }}>🗑 Delete for me</button>
            {menu.msg.senderRole === 'admin' && !menu.msg.deletedForEveryone && <button onClick={() => onDelete(menu.msg._id, true)} style={{ ...S.menuBtn, color:'#FC8181' }}>🗑 Delete for everyone</button>}
            <button onClick={() => setMenu(null)} style={{ ...S.menuBtn, color:'#8696A0' }}>✕ Cancel</button>
          </div>
        </div>)}

      {showCreate && (
        <div style={S.overlay} onClick={() => setShowCreate(false)}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:14, color:'#E9EDEF' }}>📸 New Story</div>
            <input ref={storyFileRef} type="file" accept="image/*,video/*" style={{ display:'none' }}
              onChange={e => { const f = e.target.files[0]; if (!f) return; setStoryMedia(f); const r = new FileReader(); r.onload = ev => setStoryPreview(ev.target.result); r.readAsDataURL(f); }} />
            {storyPreview
              ? <div style={{ position:'relative', marginBottom:12 }}>
                  {storyMedia?.type.startsWith('video/') ? <video src={storyPreview} style={{ width:'100%', borderRadius:12, maxHeight:220, objectFit:'cover' }} muted /> : <img src={storyPreview} style={{ width:'100%', borderRadius:12, maxHeight:220, objectFit:'cover' }} alt="" />}
                  <button onClick={() => { setStoryMedia(null); setStoryPreview(null); }} style={{ position:'absolute', top:8, right:8, background:'rgba(239,68,68,0.8)', border:'none', color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:14 }}>✕</button>
                </div>
              : <button onClick={() => storyFileRef.current?.click()} style={{ width:'100%', padding:'20px', background:'#2A3942', border:'2px dashed rgba(255,255,255,0.15)', borderRadius:12, color:'#8696A0', cursor:'pointer', marginBottom:12, fontSize:14 }}>📎 Tap to add photo or video</button>}
            <textarea value={storyText} onChange={e => setStoryText(e.target.value)} placeholder="Add a caption..." rows={2}
              style={{ width:'100%', background:'#2A3942', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 12px', color:'#E9EDEF', fontSize:14, resize:'none', outline:'none', marginBottom:12, boxSizing:'border-box' }} />
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex:1, padding:'12px', background:'#2A3942', border:'none', borderRadius:10, color:'#8696A0', cursor:'pointer' }}>Cancel</button>
              <button onClick={postStory} disabled={posting} style={{ flex:2, padding:'12px', background:'linear-gradient(135deg,#00A884,#128C7E)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontWeight:700 }}>{posting ? 'Posting...' : '📤 Post Story'}</button>
            </div>
          </div>
        </div>)}

      {/* Tab Bar */}
      <div style={S.tabBar}>
        <button style={S.tab(panel === 'list')} onClick={() => setPanel('list')}>
          💬 Chats {totalUnread > 0 && <span style={S.badge}>{totalUnread}</span>}
        </button>
        <button style={S.tab(panel === 'stories')} onClick={() => setPanel('stories')}>🔵 Updates</button>
      </div>

      {/* STORIES PANEL */}
      {panel === 'stories' && (
        <div style={{ flex:1, overflowY:'auto' }}>
          <div style={{ padding:'12px 16px 6px', fontSize:12, color:'#8696A0', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>My Status</div>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px 12px', borderBottom:'0.5px solid rgba(255,255,255,0.06)', cursor:'pointer' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div style={{ ...S.storyRing(false), width:52, height:52 }}>
                <div style={{ ...S.storyInner }}>
                  {user?.profilePic ? <img src={user.profilePic} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : user?.name?.[0]?.toUpperCase()}
                </div>
              </div>
              <div style={S.addBadge} onClick={() => setShowCreate(true)}>+</div>
            </div>
            <div onClick={myStories.length ? () => setViewer({ stories: myStories, startIdx:0 }) : () => setShowCreate(true)}>
              <div style={{ fontSize:14, fontWeight:600, color:'#E9EDEF' }}>My status</div>
              <div style={{ fontSize:12, color:'#8696A0' }}>{myStories.length ? `${myStories.length} update${myStories.length > 1 ? 's' : ''}` : 'Tap to add status update'}</div>
            </div>
          </div>
          {storyGroups.length > 0 && <>
            <div style={{ padding:'12px 16px 6px', fontSize:12, color:'#8696A0', fontWeight:600, textTransform:'uppercase', letterSpacing:.5 }}>Recent Updates</div>
            {storyGroups.map(g => (
              <div key={g.author?._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', cursor:'pointer', borderBottom:'0.5px solid rgba(255,255,255,0.04)' }} onClick={() => setViewer({ stories: g.items, startIdx:0 })}>
                <div style={{ ...S.storyRing(true), width:52, height:52, flexShrink:0 }}>
                  <div style={S.storyInner}>{g.author?.profilePic ? <img src={g.author.profilePic} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : g.author?.name?.[0]?.toUpperCase()}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#E9EDEF' }}>{g.author?.name}</div>
                  <div style={{ fontSize:12, color:'#8696A0' }}>{timeLeft(g.items[g.items.length-1]?.expiresAt)}</div>
                </div>
                <div style={{ fontSize:11, color:'#8696A0' }}>{g.items.length} update{g.items.length > 1 ? 's' : ''}</div>
              </div>))}
          </>}
          {storyGroups.length === 0 && myStories.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'#8696A0' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📷</div>
              <div style={{ fontSize:16, fontWeight:600 }}>No updates yet</div>
            </div>)}
        </div>)}

      {/* CHAT LIST PANEL */}
      {panel === 'list' && !selected && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'8px 12px', flexShrink:0 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search parents..."
              style={{ width:'100%', padding:'9px 14px', background:'#2A3942', border:'none', borderRadius:20, color:'#E9EDEF', fontSize:14, outline:'none', boxSizing:'border-box' }} />
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {filteredParents.length === 0 && <div style={{ textAlign:'center', padding:'60px 20px', color:'#8696A0' }}><div style={{ fontSize:40, marginBottom:10 }}>👥</div>No parents found</div>}
            {filteredParents.map(p => {
              const u = unread[p._id] || 0;
              const isTyping = parentTyping[p._id];
              return (
                <div key={p._id} style={S.listItem(false)} onClick={() => { setSelected(p); setPanel('chat'); }}>
                  <div style={S.avatar()}>
                    {p.profilePic ? <img src={p.profilePic} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : p.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ fontSize:15, fontWeight:600, color:'#E9EDEF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                      {u > 0 && <div style={{ background:'#25D366', color:'#fff', borderRadius:10, padding:'2px 7px', fontSize:11, fontWeight:700, flexShrink:0 }}>{u}</div>}
                    </div>
                    <div style={{ fontSize:13, color: isTyping ? '#25D366' : '#8696A0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {isTyping ? 'typing...' : p.email}
                    </div>
                  </div>
                </div>);
            })}
          </div>
        </div>)}

      {/* CHAT PANEL */}
      {panel === 'chat' && selected && (
        <>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'#1F2C34', flexShrink:0, borderBottom:'0.5px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => { setSelected(null); setPanel('list'); setMessages([]); }} style={{ background:'none', border:'none', color:'#8696A0', fontSize:20, cursor:'pointer', padding:4 }}>←</button>
            <div style={{ ...S.avatar(), width:38, height:38, fontSize:14 }}>
              {selected.profilePic ? <img src={selected.profilePic} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" /> : selected.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:15, fontWeight:600 }}>{selected.name}</div>
              {parentTyping[selected._id]
                ? <div style={{ fontSize:12, color:'#25D366' }}>typing...</div>
                : <div style={{ fontSize:12, color:'#8696A0' }}>Parent</div>}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'8px 0 4px' }}>
            {messages.length === 0 && <div style={{ textAlign:'center', padding:'60px 20px', color:'#8696A0' }}><div style={{ fontSize:48, marginBottom:12 }}>💬</div><div style={{ fontSize:15, fontWeight:600 }}>No messages yet</div></div>}
            {grouped.map((group, gi) => (
              <div key={gi}>
                <div style={{ textAlign:'center', margin:'10px 0', fontSize:11, color:'#8696A0' }}>
                  <span style={{ background:'#1F2C34', padding:'4px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)' }}>{group.date}</span>
                </div>
                {group.msgs.map(msg => {
                  const isMe = msg.senderRole === 'admin';
                  return <Bubble key={msg._id} msg={msg} isMe={isMe} onLongPress={m => setMenu({ msg: m })} />;
                })}
              </div>))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={S.inputBar}>
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display:'none' }}
              onChange={e => { sendMedia(e.target.files[0]); e.target.value=''; }} />
            <button style={S.iconBtn} onClick={() => fileRef.current?.click()}>📎</button>
            <textarea value={input} onChange={e => handleTyping(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
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

      <style>{`*::-webkit-scrollbar{width:0;height:0} textarea{font-family:inherit}`}</style>
    </div>
  );
}
