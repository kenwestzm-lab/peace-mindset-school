import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { compressImage, compressVideo, formatSize } from '../../utils/media';
import toast from 'react-hot-toast';

const EMOJIS = ['❤️','👍','😂','😮','😢','🙏'];

export default function ParentChat() {
  const { user, setUnreadMessages } = useStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(null); // {name, progress}
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [showEmoji, setShowEmoji] = useState(null);
  const msgsBox = useRef(null);
  const inputRef = useRef(null);
  const mr = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const fileRef = useRef(null);

  const scrollBottom = () => setTimeout(() => {
    if (msgsBox.current) msgsBox.current.scrollTop = msgsBox.current.scrollHeight;
  }, 60);

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
        if (forEveryone) {
          setMessages(p => p.map(m => m._id===msgId ? {...m, deletedForEveryone:true, content:'This message was deleted', mediaData:null} : m));
        } else {
          setMessages(p => p.filter(m => m._id!==msgId));
        }
      });
      s.on('message_reaction', () => { /* reload messages */ });
    }
    return () => { s?.off('new_message'); s?.off('message_deleted'); s?.off('message_reaction'); };
  }, []);

  useEffect(() => { scrollBottom(); }, [messages]);

  const send = useCallback(async (payload) => {
    if (sending) return;
    setSending(true);
    const s = getSocket();
    try {
      if (s?.connected) {
        s.emit('send_message', { senderId:user._id, senderRole:'parent', parentId:user._id, ...payload });
      } else {
        const r = await api.post('/chat', { parentId:user._id, ...payload });
        setMessages(p => [...p, r.data.message]);
      }
      scrollBottom();
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  }, [user._id, sending]);

  const sendText = () => {
    const t = input.trim(); if (!t) return;
    send({ content:t, messageType:'text' });
    setInput('');
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      mr.current = new MediaRecorder(stream, { mimeType:'audio/webm' });
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
    if (mr.current?.state==='recording') {
      mr.current.stop(); clearInterval(timer.current);
      setRecording(false);
    }
  };

  const handleFile = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const isImage = f.type.startsWith('image/');
    const isVideo = f.type.startsWith('video/');
    if (!isImage && !isVideo) { toast.error('Only photos and videos supported'); return; }
    if (f.size > 50*1024*1024) { toast.error('Max file size is 50MB'); return; }

    setUploading({ name: f.name, progress: 0 });

    try {
      if (isImage) {
        setUploading({ name: f.name, progress: 30 });
        const { data, sizeKB } = await compressImage(f, 0.8, 0.85);
        setUploading({ name: f.name, progress: 80 });
        await send({ content:`📷 Photo (${formatSize(sizeKB)})`, messageType:'image', mediaData:data, mediaMimeType:'image/jpeg' });
        toast.success(`Photo sent! (${formatSize(sizeKB)})`);
      } else {
        setUploading({ name: f.name, progress: 30 });
        const { data, sizeKB } = await compressVideo(f);
        setUploading({ name: f.name, progress: 80 });
        await send({ content:`🎥 Video (${formatSize(sizeKB)})`, messageType:'video', mediaData:data, mediaMimeType:f.type });
        toast.success(`Video sent! (${formatSize(sizeKB)})`);
      }
    } catch { toast.error('Failed to send file'); }
    finally { setUploading(null); e.target.value=''; }
  };

  const deleteMsg = async (msg, forEveryone) => {
    try {
      await api.delete(`/chat/${msg._id}`, { data:{ deleteForEveryone:forEveryone } });
      if (forEveryone) {
        setMessages(p => p.map(m => m._id===msg._id ? {...m, deletedForEveryone:true, content:'This message was deleted', mediaData:null} : m));
      } else {
        setMessages(p => p.filter(m => m._id!==msg._id));
      }
      setSelectedMsg(null);
    } catch { toast.error('Failed to delete'); }
  };

  const reactToMsg = async (msgId, emoji) => {
    try {
      await api.put(`/chat/${msgId}/react`, { emoji });
      setShowEmoji(null);
    } catch {}
  };

  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  const canDelete = (msg) => msg.sender?._id===user._id || msg.sender===user._id;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner spinner-dark" />
    </div>
  );

  return (
    <div style={{
      position:'fixed', top:'var(--header-height)', left:0, right:0, bottom:0,
      display:'flex', flexDirection:'column', background:'#0D0D14',
    }}>
      {/* WhatsApp-style header */}
      <div style={{
        padding:'10px 14px', background:'#13131E',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        display:'flex', alignItems:'center', gap:12, flexShrink:0,
        boxShadow:'0 2px 12px rgba(0,0,0,0.4)',
      }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#6B0F1A,#A52030)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏫</div>
          <span style={{ position:'absolute', bottom:0, right:0, width:11, height:11, borderRadius:'50%', background:'#4ADE80', border:'2px solid #13131E' }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15.5, color:'#E8E8F4' }}>Peace Mindset Admin</div>
          <div style={{ fontSize:12, color:'#4ADE80', marginTop:1 }}>● Online</div>
        </div>
        <div style={{ display:'flex', gap:14, color:'rgba(255,255,255,0.4)' }}>
          <span style={{ fontSize:20, cursor:'pointer' }}>🔍</span>
        </div>
      </div>

      {/* Chat background pattern */}
      <div ref={msgsBox} style={{
        flex:1, overflowY:'auto', padding:'10px 10px',
        backgroundImage:'radial-gradient(circle at 20% 50%, rgba(155,24,38,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(212,168,67,0.02) 0%, transparent 50%)',
        WebkitOverflowScrolling:'touch',
        display:'flex', flexDirection:'column', gap:2,
      }}>
        {messages.length===0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.25)', textAlign:'center', padding:'40px 20px', marginTop:'15vh' }}>
            <div style={{ fontSize:60, marginBottom:16 }}>💬</div>
            <div style={{ fontSize:18, fontWeight:600, color:'rgba(255,255,255,0.5)' }}>Messages are end-to-end</div>
            <div style={{ fontSize:13, marginTop:6, lineHeight:1.6 }}>Send a message to the school administration.<br/>Voice 🎤 · Photos 📷 · Videos 🎥</div>
          </div>
        ) : messages.map((msg, idx) => {
          const isMe = msg.sender?._id===user._id || msg.sender===user._id;
          const time = new Date(msg.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
          const isDeleted = msg.deletedForEveryone;
          const prevMsg = messages[idx-1];
          const showDate = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

          return (
            <div key={msg._id}>
              {/* Date separator */}
              {showDate && (
                <div style={{ textAlign:'center', margin:'10px 0', position:'relative' }}>
                  <span style={{ background:'rgba(255,255,255,0.06)', padding:'4px 14px', borderRadius:999, fontSize:11.5, color:'rgba(255,255,255,0.4)', backdropFilter:'blur(4px)' }}>
                    {new Date(msg.createdAt).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}
                  </span>
                </div>
              )}

              <div
                style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start', marginBottom:2, paddingLeft:isMe?'15%':'0', paddingRight:isMe?'0':'15%' }}
                onLongPress={() => setSelectedMsg(msg)}
              >
                <div style={{ maxWidth:'100%', position:'relative' }}>
                  {/* Long press zone */}
                  <div
                    onContextMenu={e=>{ e.preventDefault(); setSelectedMsg(msg); }}
                    onTouchStart={e=>{ const t=setTimeout(()=>setSelectedMsg(msg),500); e.currentTarget._t=t; }}
                    onTouchEnd={e=>{ clearTimeout(e.currentTarget._t); }}
                  >
                    <div style={{
                      padding:isDeleted?'8px 12px':msg.messageType==='text'?'8px 12px':'5px 5px',
                      borderRadius:16,
                      borderTopLeftRadius:!isMe?4:16,
                      borderTopRightRadius:isMe?4:16,
                      background:isMe?'linear-gradient(135deg,#6B0F1A,#A52030)':'rgba(255,255,255,0.07)',
                      border:isMe?'none':'1px solid rgba(255,255,255,0.07)',
                      boxShadow:isMe?'0 1px 8px rgba(155,24,38,0.3)':'0 1px 4px rgba(0,0,0,0.3)',
                      position:'relative',
                    }}>
                      {isDeleted ? (
                        <p style={{ fontSize:13.5, color:'rgba(255,255,255,0.35)', fontStyle:'italic', margin:0 }}>🚫 This message was deleted</p>
                      ) : (
                        <>
                          {msg.messageType==='text' && (
                            <p style={{ fontSize:14.5, color:isMe?'#fff':'#E8E8F4', lineHeight:1.55, margin:0, wordBreak:'break-word' }}>{msg.content}</p>
                          )}
                          {msg.messageType==='voice' && msg.mediaData && (
                            <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:200, maxWidth:260 }}>
                              <div style={{ width:38, height:38, borderRadius:'50%', background:isMe?'rgba(255,255,255,0.15)':'rgba(155,24,38,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🎤</div>
                              <audio controls src={msg.mediaData} style={{ flex:1, height:36 }} />
                              {msg.duration && <span style={{ fontSize:11, color:isMe?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.4)', flexShrink:0 }}>{fmt(msg.duration)}</span>}
                            </div>
                          )}
                          {msg.messageType==='image' && msg.mediaData && (
                            <img src={msg.mediaData} alt="Photo"
                              style={{ maxWidth:240, maxHeight:260, borderRadius:12, display:'block', cursor:'pointer', objectFit:'cover' }}
                              onClick={()=>window.open(msg.mediaData,'_blank')}
                            />
                          )}
                          {msg.messageType==='video' && msg.mediaData && (
                            <video controls src={msg.mediaData} style={{ maxWidth:240, maxHeight:200, borderRadius:12, display:'block' }} playsInline />
                          )}
                        </>
                      )}

                      {/* Time + tick */}
                      <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:4, marginTop:3 }}>
                        <span style={{ fontSize:10.5, color:isMe?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.3)' }}>{time}</span>
                        {isMe && <span style={{ fontSize:12, color:'rgba(255,255,255,0.55)' }}>✓✓</span>}
                      </div>
                    </div>

                    {/* Reactions */}
                    {msg.reactions?.length>0 && (
                      <div style={{ display:'flex', gap:2, marginTop:2, justifyContent:isMe?'flex-end':'flex-start' }}>
                        {[...new Set(msg.reactions.map(r=>r.emoji))].map((e,i) => (
                          <span key={i} style={{ background:'rgba(255,255,255,0.08)', borderRadius:999, padding:'2px 6px', fontSize:13 }}>{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload progress */}
      {uploading && (
        <div style={{ margin:'4px 12px', padding:'8px 14px', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:10, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div className="spinner spinner-dark" style={{ width:16, height:16 }} />
          <span style={{ fontSize:13, color:'#60A5FA', flex:1 }}>Compressing & sending {uploading.name}...</span>
        </div>
      )}

      {/* Recording bar */}
      {recording && (
        <div style={{ margin:'4px 12px', padding:'9px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:12, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:'#EF4444', animation:'pulse 1s infinite', flexShrink:0 }} />
          <span style={{ fontSize:13, color:'#FC8181', fontWeight:600, flex:1 }}>🎤 Recording... {fmt(recordSec)}</span>
          <button onClick={stopRec} style={{ padding:'6px 14px', borderRadius:8, background:'#EF4444', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>Send</button>
        </div>
      )}

      {/* Message action menu */}
      {selectedMsg && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'flex-end' }}
          onClick={()=>setSelectedMsg(null)}>
          <div style={{ width:'100%', background:'#1A1A28', borderRadius:'20px 20px 0 0', padding:'8px 0 16px', border:'1px solid rgba(255,255,255,0.08)' }}
            onClick={e=>e.stopPropagation()}>
            {/* Emoji reactions */}
            <div style={{ display:'flex', justifyContent:'center', gap:16, padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={()=>reactToMsg(selectedMsg._id, e)} style={{ fontSize:26, background:'none', border:'none', cursor:'pointer' }}>{e}</button>
              ))}
            </div>
            {/* Actions */}
            {[
              canDelete(selectedMsg) && { icon:'🗑️', label:'Delete for me', action:()=>deleteMsg(selectedMsg,false), color:'#EF4444' },
              canDelete(selectedMsg) && { icon:'🗑️', label:'Delete for everyone', action:()=>deleteMsg(selectedMsg,true), color:'#EF4444' },
              selectedMsg.mediaData && { icon:'🔗', label:'Copy link', action:()=>{ navigator.clipboard?.writeText(selectedMsg.mediaData||''); toast.success('Copied!'); setSelectedMsg(null); }, color:'#60A5FA' },
              { icon:'✕', label:'Cancel', action:()=>setSelectedMsg(null), color:'rgba(255,255,255,0.4)' },
            ].filter(Boolean).map((a,i) => (
              <button key={i} onClick={a.action} style={{ width:'100%', padding:'14px 22px', background:'none', border:'none', color:a.color, fontSize:15, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:12, textAlign:'left' }}>
                <span style={{ fontSize:18 }}>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp-style input bar */}
      <div style={{ padding:'8px 10px 14px', background:'#13131E', borderTop:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }} />
        <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
          {/* Attach */}
          <button onClick={()=>fileRef.current?.click()} style={{
            width:44, height:44, borderRadius:'50%', flexShrink:0,
            background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)',
            color:'rgba(255,255,255,0.5)', fontSize:20, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>📎</button>

          {/* Text input */}
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:22, border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'flex-end', overflow:'hidden' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();} }}
              placeholder="Message..."
              rows={1}
              style={{ flex:1, padding:'11px 14px', background:'none', border:'none', outline:'none', resize:'none', color:'#E8E8F4', fontFamily:'var(--font-body)', fontSize:'16px', maxHeight:110, lineHeight:1.5 }}
            />
          </div>

          {/* Voice or Send */}
          {input.trim() ? (
            <button onClick={sendText} disabled={sending} style={{
              width:44, height:44, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,#6B0F1A,#A52030)',
              border:'none', color:'#fff', fontSize:18, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:'0 0 14px rgba(155,24,38,0.4)',
            }}>➤</button>
          ) : (
            <button
              onMouseDown={startRec} onMouseUp={stopRec}
              onTouchStart={e=>{e.preventDefault();startRec();}}
              onTouchEnd={e=>{e.preventDefault();stopRec();}}
              style={{
                width:44, height:44, borderRadius:'50%', flexShrink:0,
                background:recording?'#EF4444':'linear-gradient(135deg,#6B0F1A,#A52030)',
                border:'none', color:'#fff', fontSize:20, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:recording?'0 0 18px rgba(239,68,68,0.5)':'0 0 14px rgba(155,24,38,0.4)',
                transition:'all 0.2s',
              }}
            >🎤</button>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}
