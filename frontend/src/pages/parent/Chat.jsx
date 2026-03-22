import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { uploadMedia } from '../../utils/mediaUpload';
import { compressImage, formatSize, shareMedia, downloadMedia } from '../../utils/media';
import toast from 'react-hot-toast';

const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

function Avatar({ name, src, size=38, online }) {
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', background:'linear-gradient(135deg,#9B1826,#C02035)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:700, color:'#fff' }}>
        {src ? <img src={src} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/> : name?.[0]?.toUpperCase()||'?'}
      </div>
      {online!==undefined && <span style={{ position:'absolute', bottom:1, right:1, width:size*0.28, height:size*0.28, borderRadius:'50%', background:online?'#25D366':'#666', border:'2px solid #0B141A' }}/>}
    </div>
  );
}

function DeleteSheet({ msg, isMe, onClose, onDelete }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:900 }}/>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:901, background:'#1F2C34', borderRadius:'20px 20px 0 0', padding:'8px 0 32px', boxShadow:'0 -4px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ width:36, height:4, background:'rgba(255,255,255,0.2)', borderRadius:2, margin:'8px auto 16px' }}/>
        <div style={{ padding:'0 20px 14px', borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize:11, color:'#8696A0', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>Delete message</div>
          <div style={{ fontSize:13, color:'#E9EDEF', background:'rgba(255,255,255,0.05)', padding:'8px 12px', borderRadius:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {msg.messageType==='text'?msg.content:msg.messageType==='voice'?'🎤 Voice':msg.messageType==='image'?'📷 Photo':'🎥 Video'}
          </div>
        </div>
        <button onClick={()=>{onDelete(msg._id,false);onClose();}} style={{ width:'100%', padding:'16px 22px', background:'none', border:'none', display:'flex', alignItems:'center', gap:16, cursor:'pointer' }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🗑</div>
          <div><div style={{ fontSize:15, fontWeight:500, color:'#E9EDEF' }}>Delete for me</div><div style={{ fontSize:12, color:'#8696A0' }}>Remove from your chat only</div></div>
        </button>
        {isMe && (
          <button onClick={()=>{onDelete(msg._id,true);onClose();}} style={{ width:'100%', padding:'16px 22px', background:'none', border:'none', display:'flex', alignItems:'center', gap:16, cursor:'pointer' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(239,68,68,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🗑</div>
            <div><div style={{ fontSize:15, fontWeight:500, color:'#FC8181' }}>Delete for everyone</div><div style={{ fontSize:12, color:'#8696A0' }}>Remove from both sides</div></div>
          </button>
        )}
        <button onClick={onClose} style={{ width:'100%', padding:'16px 22px', background:'none', border:'none', display:'flex', alignItems:'center', gap:16, cursor:'pointer' }}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>✕</div>
          <div style={{ fontSize:15, fontWeight:500, color:'#8696A0' }}>Cancel</div>
        </button>
      </div>
    </>
  );
}

function Bubble({ msg, isMe, onDelete, onReact, onLongPress }) {
  const [imgFull, setImgFull] = useState(false);
  const pressTimer = useRef(null);
  const moved = useRef(false);
  const time = new Date(msg.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const deleted = msg.deletedForEveryone;

  const onTouchStart = () => { moved.current=false; pressTimer.current=setTimeout(()=>{ if(!moved.current){navigator.vibrate?.(40);onLongPress(msg);} },450); };
  const onTouchMove = () => { moved.current=true; clearTimeout(pressTimer.current); };
  const onTouchEnd = () => clearTimeout(pressTimer.current);

  return (
    <>
      {imgFull && (
        <div onClick={()=>setImgFull(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.96)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src={msg.mediaUrl||msg.mediaData} style={{ maxWidth:'95vw', maxHeight:'90vh', objectFit:'contain' }}/>
          <div style={{ position:'absolute', bottom:24, display:'flex', gap:12 }}>
            <button onClick={e=>{e.stopPropagation();downloadMedia(msg.mediaUrl||msg.mediaData,'photo.jpg');}} style={sBtn}>⬇ Save</button>
            <button onClick={e=>{e.stopPropagation();shareMedia(msg.mediaUrl||msg.mediaData,'photo.jpg');}} style={sBtn}>↗ Share</button>
          </div>
        </div>
      )}
      <div style={{ display:'flex', flexDirection:isMe?'row-reverse':'row', gap:6, alignItems:'flex-end', marginBottom:2 }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onContextMenu={e=>{e.preventDefault();onLongPress(msg);}}>
        {!isMe && <Avatar name={msg.sender?.name||'A'} src={msg.sender?.profilePic} size={32}/>}
        <div style={{ maxWidth:'78%' }}>
          <div style={{ padding:(msg.mediaUrl||msg.mediaData)&&!deleted?'4px':'9px 13px', borderRadius:18, borderBottomRightRadius:isMe?4:18, borderBottomLeftRadius:isMe?18:4, background:isMe?'linear-gradient(135deg,#005C4B,#128C7E)':'rgba(255,255,255,0.07)', border:isMe?'none':'1px solid rgba(255,255,255,0.08)', userSelect:'none', WebkitUserSelect:'none' }}>
            {deleted ? <p style={{ fontSize:13, color:'rgba(255,255,255,0.38)', fontStyle:'italic', margin:0, padding:'2px 4px' }}>🚫 This message was deleted</p> : <>
              {msg.messageType==='text'&&<p style={{ fontSize:14.5, color:'#E9EDEF', lineHeight:1.55, margin:0, wordBreak:'break-word' }}>{msg.content}</p>}
              {msg.messageType==='voice'&&(msg.mediaUrl||msg.mediaData)&&<div style={{ display:'flex', alignItems:'center', gap:8, minWidth:200, padding:'4px 6px' }}><span>🎤</span><audio controls src={msg.mediaUrl||msg.mediaData} style={{ flex:1, height:32 }}/>{msg.duration&&<span style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>{fmt(msg.duration)}</span>}</div>}
              {msg.messageType==='image'&&(msg.mediaUrl||msg.mediaData)&&<div style={{ position:'relative' }}>
                <img src={msg.mediaUrl||msg.mediaData} onClick={()=>setImgFull(true)} style={{ maxWidth:240, maxHeight:280, borderRadius:14, display:'block', cursor:'pointer', objectFit:'cover' }}/>
                <button onClick={e=>{e.stopPropagation();shareMedia(msg.mediaUrl||msg.mediaData,'photo.jpg');}} style={fBtn}>↗</button>
              </div>}
              {msg.messageType==='video'&&(msg.mediaUrl||msg.mediaData)&&<div style={{ position:'relative' }}>
                <video controls src={msg.mediaUrl||msg.mediaData} style={{ maxWidth:240, maxHeight:200, borderRadius:14, display:'block' }} playsInline/>
                <button onClick={e=>{e.stopPropagation();shareMedia(msg.mediaUrl||msg.mediaData,'video.mp4');}} style={fBtn}>↗</button>
              </div>}
            </>}
          </div>
          {msg.reactions?.length>0&&<div style={{ display:'flex', gap:2, marginTop:2, flexWrap:'wrap', justifyContent:isMe?'flex-end':'flex-start' }}>
            {Object.entries(msg.reactions.reduce((a,r)=>{a[r.emoji]=(a[r.emoji]||0)+1;return a;},{})).map(([em,cnt])=>(
              <span key={em} onClick={()=>onReact(msg._id,em)} style={{ background:'rgba(255,255,255,0.1)', borderRadius:999, padding:'1px 6px', fontSize:12, cursor:'pointer' }}>{em}{cnt>1?' '+cnt:''}</span>
            ))}
          </div>}
          <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2, justifyContent:isMe?'flex-end':'flex-start', paddingLeft:4, paddingRight:4 }}>
            <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.35)' }}>{time}</span>
            {isMe&&<span style={{ fontSize:11, color:msg.isRead?'#53BDEB':'rgba(255,255,255,0.35)' }}>✓✓</span>}
            {!deleted&&<span style={{ fontSize:9, color:'rgba(255,255,255,0.18)', marginLeft:2 }}>hold•••</span>}
          </div>
        </div>
      </div>
    </>
  );
}

const sBtn = { padding:'8px 20px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', borderRadius:999, cursor:'pointer', fontSize:13 };
const fBtn = { position:'absolute', top:6, right:6, background:'rgba(0,0,0,0.6)', border:'none', color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:12 };

// ── Upload progress bar ────────────────────────────────────────────────
function UploadBar({ state }) {
  if (!state) return null;
  return (
    <div style={{ margin:'0 12px 4px', padding:'8px 12px', background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${state.pct||0}%`, background:'#25D366', transition:'width 0.3s', borderRadius:2 }}/>
      </div>
      <span style={{ fontSize:11, color:'#25D366', whiteSpace:'nowrap' }}>{state.label}</span>
    </div>
  );
}

export default function ParentChat() {
  const { user, setUnreadMessages } = useStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [uploadState, setUploadState] = useState(null);
  const [adminTyping, setAdminTyping] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState(null);
  const msgsBox = useRef(null);
  const mr = useRef(null);
  const chunks = useRef([]);
  const recTimer = useRef(null);
  const typingTimer = useRef(null);
  const fileRef = useRef(null);

  const scroll = useCallback(() => setTimeout(() => { if(msgsBox.current) msgsBox.current.scrollTop=msgsBox.current.scrollHeight; }, 50), []);

  useEffect(() => {
    (async () => {
      try { const r=await api.get(`/chat/${user._id}`); setMessages(r.data.messages||[]); setUnreadMessages(0); }
      catch {} finally { setLoading(false); }
    })();
    const s = getSocket();
    if (s) {
      s.on('new_message', msg => { setMessages(p=>p.find(m=>m._id===msg._id)?p:[...p,msg]); setUnreadMessages(0); scroll(); });
      s.on('message_deleted', ({msgId,forEveryone}) => setMessages(p=>p.map(m=>m._id===msgId?(forEveryone?{...m,deletedForEveryone:true,mediaUrl:null,mediaData:null}:null):m).filter(Boolean)));
      s.on('admin_typing', ({isTyping}) => setAdminTyping(isTyping));
    }
    return () => { s?.off('new_message'); s?.off('message_deleted'); s?.off('admin_typing'); };
  }, []);

  useEffect(() => { scroll(); }, [messages]);

  const sendMessage = useCallback(async (payload) => {
    const s = getSocket();
    if (s?.connected) {
      s.emit('send_message', { senderId:user._id, senderRole:'parent', parentId:user._id, ...payload });
      // Optimistic update
      setMessages(p=>[...p,{ _id:Date.now().toString(), sender:{_id:user._id,name:user.name,profilePic:user.profilePic}, senderRole:'parent', parentId:user._id, createdAt:new Date().toISOString(), isRead:false, reactions:[], ...payload }]);
    } else {
      const r = await api.post('/chat', { parentId:user._id, ...payload });
      setMessages(p=>[...p,r.data.message]);
    }
    scroll();
  }, [user]);

  const sendText = () => {
    if (!input.trim()) return;
    sendMessage({ content:input.trim(), messageType:'text' });
    setInput('');
    clearTimeout(typingTimer.current);
    getSocket()?.emit('typing', { parentId:user._id, isTyping:false, senderRole:'parent' });
  };

  const handleTyping = val => {
    setInput(val);
    const s = getSocket();
    s?.emit('typing', { parentId:user._id, isTyping:true, senderRole:'parent' });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => s?.emit('typing', { parentId:user._id, isTyping:false, senderRole:'parent' }), 1500);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';
      mr.current = new MediaRecorder(stream, { mimeType:mime });
      chunks.current = [];
      mr.current.ondataavailable = e => chunks.current.push(e.data);
      mr.current.onstop = () => {
        const blob = new Blob(chunks.current, { type:'audio/webm' });
        const rd = new FileReader();
        rd.onload = () => sendMessage({ content:'🎤 Voice message', messageType:'voice', mediaData:rd.result, mediaMimeType:'audio/webm', duration:recordSec });
        rd.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop()); setRecordSec(0);
      };
      mr.current.start(); setRecording(true);
      recTimer.current = setInterval(() => setRecordSec(n=>n+1), 1000);
    } catch { toast.error('Microphone not available'); }
  };

  const stopRec = () => { if(mr.current?.state==='recording'){mr.current.stop();clearInterval(recTimer.current);setRecording(false);} };
  const cancelRec = () => { if(mr.current?.state==='recording'){mr.current.ondataavailable=null;mr.current.onstop=null;mr.current.stop();clearInterval(recTimer.current);setRecording(false);setRecordSec(0);} };

  const handleFile = async e => {
    const f = e.target.files[0]; if(!f) return;
    const isImg = f.type.startsWith('image/'), isVid = f.type.startsWith('video/');
    if (!isImg && !isVid) { toast.error('Images and videos only'); return; }
    if (f.size > 1024*1024*1024) { toast.error('Max 1GB'); return; }

    setUploadState({ pct:5, label:'Starting...' });
    try {
      // Upload to Cloudinary first — get URL — then send URL via socket (NOT base64)
      const result = await uploadMedia(f, state => setUploadState(state));
      await sendMessage({
        content: isImg ? '📷 Photo' : '🎥 Video',
        messageType: isImg ? 'image' : 'video',
        mediaUrl: result.url,        // ← Cloudinary URL, not base64
        mediaData: result.url,       // ← same URL in mediaData for compatibility
        mediaMimeType: result.mimeType,
      });
      toast.success(`✅ ${isImg?'Photo':'Video'} sent! (${formatSize(result.sizeKB)})`);
    } catch (err) {
      toast.error('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally { setUploadState(null); }
    e.target.value = '';
  };

  const handleDelete = async (msgId, forEveryone) => {
    try {
      await api.delete(`/chat/${msgId}`, { data: { deleteForEveryone:forEveryone } });
      if (forEveryone) {
        setMessages(p=>p.map(m=>m._id===msgId?{...m,deletedForEveryone:true,mediaUrl:null,mediaData:null}:m));
        const msg = messages.find(m=>m._id===msgId);
        if (msg) getSocket()?.emit('delete_message', { msgId, parentId:user._id, forEveryone });
      } else {
        setMessages(p=>p.filter(m=>m._id!==msgId));
      }
      toast.success(forEveryone?'🗑 Deleted for everyone':'🗑 Deleted for you');
    } catch { toast.error('Delete failed'); }
  };

  const handleReact = async (msgId, emoji) => {
    try {
      await api.put(`/chat/${msgId}/react`, { emoji });
      const r = await api.get(`/chat/${user._id}`);
      setMessages(r.data.messages||[]);
    } catch {}
  };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}><div className="spinner spinner-dark"/></div>;

  return (
    <div style={{ position:'fixed', top:'var(--header-height)', left:0, right:0, bottom:0, display:'flex', flexDirection:'column', background:'#0B141A' }}>
      {deleteSheet && <DeleteSheet msg={deleteSheet} isMe={deleteSheet.sender?._id===user._id||deleteSheet.sender===user._id} onClose={()=>setDeleteSheet(null)} onDelete={handleDelete}/>}

      {/* Header */}
      <div style={{ padding:'10px 16px', background:'#1F2C34', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <Avatar name="Admin" size={42} online={true}/>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, fontSize:16, color:'#E9EDEF' }}>Peace Mindset Admin</div>
          <div style={{ fontSize:12, color:adminTyping?'#25D366':'#8696A0', marginTop:1 }}>{adminTyping?'✍ typing...':'🏫 School Administration'}</div>
        </div>
        <button onClick={()=>fileRef.current?.click()} style={{ background:'none', border:'none', color:'#8696A0', cursor:'pointer', fontSize:20 }}>📎</button>
      </div>

      {/* Messages */}
      <div ref={msgsBox} style={{ flex:1, overflowY:'auto', padding:'12px 12px 0', WebkitOverflowScrolling:'touch', display:'flex', flexDirection:'column', gap:4 }}>
        {messages.length===0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>💬</div>
            <div style={{ fontSize:17, fontWeight:600, color:'#E9EDEF', marginBottom:8 }}>No messages yet</div>
            <div style={{ fontSize:13, color:'#8696A0', lineHeight:1.7 }}>Send a message to the school admin.<br/>Hold any message to delete it 🗑</div>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender?._id===user._id||msg.sender===user._id;
          return <Bubble key={msg._id} msg={msg} isMe={isMe} onDelete={handleDelete} onReact={handleReact} onLongPress={setDeleteSheet}/>;
        })}
        <div style={{ height:8 }}/>
      </div>

      <UploadBar state={uploadState}/>

      {recording && (
        <div style={{ margin:'0 12px', padding:'10px 14px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:12, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:'#EF4444', animation:'pulse 1s infinite' }}/>
          <span style={{ fontSize:13, color:'#FC8181', fontWeight:600, flex:1 }}>🎤 {fmt(recordSec)}</span>
          <button onClick={cancelRec} style={{ padding:'4px 12px', borderRadius:8, background:'transparent', border:'1px solid rgba(239,68,68,0.4)', color:'#FC8181', fontSize:12, cursor:'pointer' }}>✕</button>
          <button onClick={stopRec} style={{ padding:'4px 14px', borderRadius:8, background:'#EF4444', border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>⬛ Send</button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'8px 12px 16px', background:'#1F2C34', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }}/>
        <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
          <button onClick={()=>fileRef.current?.click()} style={{ width:42, height:42, borderRadius:'50%', background:'#2A3942', border:'none', color:'#8696A0', fontSize:19, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>📎</button>
          <textarea value={input} onChange={e=>handleTyping(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();}}}
            placeholder="Message" rows={1}
            style={{ flex:1, padding:'11px 14px', background:'#2A3942', border:'1.5px solid rgba(255,255,255,0.06)', borderRadius:24, resize:'none', outline:'none', color:'#E9EDEF', fontSize:'16px', lineHeight:1.5, maxHeight:100 }}
          />
          {input.trim() ?
            <button onClick={sendText} style={sendBtn}>➤</button> :
            <button onMouseDown={startRec} onMouseUp={stopRec} onTouchStart={e=>{e.preventDefault();startRec();}} onTouchEnd={e=>{e.preventDefault();stopRec();}}
              style={{...sendBtn, background:recording?'#EF4444':'linear-gradient(135deg,#00A884,#128C7E)'}}>🎤</button>
          }
        </div>
        <div style={{ textAlign:'center', marginTop:5, fontSize:10, color:'rgba(255,255,255,0.18)' }}>Hold 🎤 voice · 📎 photos & videos up to 1GB · Hold message to delete</div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}
const sendBtn = { width:46, height:46, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#00A884,#128C7E)', border:'none', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' };
