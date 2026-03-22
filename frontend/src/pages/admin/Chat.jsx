import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { compressImage, compressVideo, formatSize, shareMedia, downloadMedia } from '../../utils/media';
import toast from 'react-hot-toast';
import { smartUpload, formatFileSize } from '../../utils/fileUpload';


const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

function Avatar({ name, src, size = 40, online }) {
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
        <span style={{ position:'absolute', bottom:1, right:1, width:size*0.27, height:size*0.27, borderRadius:'50%', background:online?'#25D366':'#555', border:'2px solid #111B21' }} />
      )}
    </div>
  );
}

function MsgBubble({ msg, isMe, userId, onDelete, onShare, onDownload, onReact }) {
  const [menu, setMenu] = useState(false);
  const [imgFull, setImgFull] = useState(false);
  const time = new Date(msg.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const isDeleted = msg.deletedForEveryone;

  return (
    <>
      {imgFull && (
        <div onClick={()=>setImgFull(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <img src={msg.mediaData} alt="" style={{maxWidth:'95vw',maxHeight:'90vh',objectFit:'contain'}}/>
          <div style={{position:'absolute',bottom:24,display:'flex',gap:12}}>
            <button onClick={e=>{e.stopPropagation();downloadMedia(msg.mediaData,'photo.jpg');}} style={shareBtn}>⬇ Save</button>
            <button onClick={e=>{e.stopPropagation();shareMedia(msg.mediaData,'photo.jpg');}} style={shareBtn}>↗ Share</button>
          </div>
        </div>
      )}
      <div style={{display:'flex',flexDirection:isMe?'row-reverse':'row',gap:6,alignItems:'flex-end',marginBottom:4,position:'relative'}}
        onContextMenu={e=>{e.preventDefault();setMenu(!menu);}}>
        {menu && (
          <div style={{position:'absolute',[isMe?'right':'left']:0,bottom:'100%',zIndex:50,background:'#1F2C34',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,overflow:'hidden',minWidth:170,boxShadow:'0 8px 32px rgba(0,0,0,0.7)'}}>
            <div style={{display:'flex',padding:'8px 12px',gap:4,borderBottom:'0.5px solid rgba(255,255,255,0.08)'}}>
              {['❤️','👍','😂','😮','😢','🙏'].map(e=>(
                <button key={e} onClick={()=>{onReact(msg._id,e);setMenu(false);}} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',padding:'2px 4px'}}>{e}</button>
              ))}
            </div>
            {msg.mediaData&&!isDeleted&&<>
              <button onClick={()=>{onDownload(msg);setMenu(false);}} style={menuBtn}>⬇ Download</button>
              <button onClick={()=>{onShare(msg);setMenu(false);}} style={menuBtn}>↗ Share</button>
            </>}
            <button onClick={()=>{onDelete(msg._id,false);setMenu(false);}} style={{...menuBtn,color:'#FC8181'}}>🗑 Delete for me</button>
            {isMe&&<button onClick={()=>{onDelete(msg._id,true);setMenu(false);}} style={{...menuBtn,color:'#FC8181'}}>🗑 Delete for everyone</button>}
            <button onClick={()=>setMenu(false)} style={{...menuBtn,color:'#666'}}>✕ Cancel</button>
          </div>
        )}
        <div style={{maxWidth:'78%'}}>
          <div style={{
            padding:msg.mediaData&&!isDeleted?'4px':'9px 13px',
            borderRadius:18,borderBottomRightRadius:isMe?4:18,borderBottomLeftRadius:isMe?18:4,
            background:isMe?'linear-gradient(135deg,#005C4B,#128C7E)':'rgba(255,255,255,0.07)',
            border:isMe?'none':'1px solid rgba(255,255,255,0.08)',
          }}>
            {isDeleted?<p style={{fontSize:13,color:'rgba(255,255,255,0.35)',fontStyle:'italic',margin:0,padding:'2px 4px'}}>🚫 Deleted</p>:<>
              {msg.messageType==='text'&&<p style={{fontSize:14.5,color:'#E9EDEF',lineHeight:1.55,margin:0,wordBreak:'break-word'}}>{msg.content}</p>}
              {msg.messageType==='voice'&&msg.mediaData&&<div style={{display:'flex',alignItems:'center',gap:8,minWidth:180,padding:'4px 6px'}}>
                <span>🎤</span><audio controls src={msg.mediaData} style={{flex:1,height:32}}/>
                {msg.duration&&<span style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{fmt(msg.duration)}</span>}
              </div>}
              {msg.messageType==='image'&&msg.mediaData&&<div style={{position:'relative'}}>
                <img src={msg.mediaData} alt="Photo" onClick={()=>setImgFull(true)} style={{maxWidth:220,maxHeight:260,borderRadius:14,display:'block',cursor:'pointer',objectFit:'cover'}}/>
                <button onClick={e=>{e.stopPropagation();shareMedia(msg.mediaData,'photo.jpg');}} style={floatBtn}>↗</button>
              </div>}
              {msg.messageType==='video'&&msg.mediaData&&<div style={{position:'relative'}}>
                <video controls src={msg.mediaData} style={{maxWidth:220,maxHeight:180,borderRadius:14,display:'block'}}/>
                <button onClick={e=>{e.stopPropagation();shareMedia(msg.mediaData,'video.mp4');}} style={floatBtn}>↗</button>
              </div>}
            </>}
          </div>
          {msg.reactions?.length>0&&(
            <div style={{display:'flex',gap:2,marginTop:2,flexWrap:'wrap',justifyContent:isMe?'flex-end':'flex-start'}}>
              {Object.entries(msg.reactions.reduce((a,r)=>{a[r.emoji]=(a[r.emoji]||0)+1;return a;},{})).map(([em,cnt])=>(
                <span key={em} onClick={()=>onReact(msg._id,em)} style={{background:'rgba(255,255,255,0.08)',borderRadius:999,padding:'1px 6px',fontSize:12,cursor:'pointer'}}>{em}{cnt>1?' '+cnt:''}</span>
              ))}
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:3,marginTop:2,justifyContent:isMe?'flex-end':'flex-start',paddingLeft:4,paddingRight:4}}>
            <span style={{fontSize:10.5,color:'rgba(255,255,255,0.3)'}}>{time}</span>
            {isMe&&<span style={{fontSize:11,color:msg.isRead?'#53BDEB':'rgba(255,255,255,0.3)'}}>✓✓</span>}
          </div>
        </div>
      </div>
    </>
  );
}

const menuBtn = {display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 14px',background:'none',border:'none',color:'#E9EDEF',fontSize:13.5,cursor:'pointer',textAlign:'left'};
const shareBtn = {padding:'8px 20px',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.25)',color:'#fff',borderRadius:999,cursor:'pointer',fontSize:13};
const floatBtn = {position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',borderRadius:'50%',width:28,height:28,cursor:'pointer',fontSize:12};

function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [parents, setParents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ api.get('/admin/parents').then(r=>setParents(r.data.parents||[])).catch(()=>{}); },[]);
  const create = async () => {
    if(!name.trim()){toast.error('Group name required');return;}
    setLoading(true);
    try{ const r=await api.post('/groups',{name,members:selected}); toast.success('Group created!'); onCreated(r.data.group); onClose(); }
    catch{ toast.error('Failed'); } finally{ setLoading(false); }
  };
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div style={{background:'#1F2C34',borderRadius:'20px 20px 0 0',padding:20,width:'100%',maxWidth:480,maxHeight:'80vh',display:'flex',flexDirection:'column',gap:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{color:'#E9EDEF',fontWeight:700,fontSize:17}}>Create Group</h3>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#8696A0',fontSize:22,cursor:'pointer'}}>✕</button>
        </div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Group name *" style={{padding:'11px 14px',background:'#2A3942',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,color:'#E9EDEF',fontSize:14,outline:'none'}}/>
        <p style={{fontSize:12,color:'#8696A0'}}>Add parents:</p>
        <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
          {parents.map(p=>(
            <label key={p._id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'rgba(255,255,255,0.04)',borderRadius:10,cursor:'pointer',border:`1px solid ${selected.includes(p._id)?'rgba(37,211,102,0.4)':'transparent'}`}}>
              <input type="checkbox" checked={selected.includes(p._id)} onChange={()=>setSelected(prev=>prev.includes(p._id)?prev.filter(x=>x!==p._id):[...prev,p._id])} style={{width:16,height:16,accentColor:'#25D366'}}/>
              <Avatar name={p.name} src={p.profilePic} size={32}/>
              <span style={{fontSize:14,color:'#E9EDEF'}}>{p.name}</span>
            </label>
          ))}
        </div>
        <button onClick={create} disabled={loading} style={{padding:'13px',background:'linear-gradient(135deg,#00A884,#128C7E)',border:'none',borderRadius:12,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer'}}>
          {loading?'Creating...':'✓ Create Group'}
        </button>
      </div>
    </div>
  );
}

export default function AdminChat() {
  const { user } = useStore();
  const [screen, setScreen] = useState('list'); // 'list' | 'chat' | 'group'
  const [tab, setTab] = useState('direct');
  const [convs, setConvs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [typingParents, setTypingParents] = useState({});
  const msgsBox = useRef(null);
  const mr = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const fileRef = useRef(null);

  const scrollBottom = useCallback(()=>{ setTimeout(()=>{ if(msgsBox.current) msgsBox.current.scrollTop=msgsBox.current.scrollHeight; },60); },[]);

  const loadConvs = async () => {
    try{ const r=await api.get('/chat/admin/conversations'); setConvs(r.data.conversations||[]); }
    catch{} finally{ setLoadingConvs(false); }
  };
  const loadGroups = async () => {
    try{ const r=await api.get('/groups'); setGroups(r.data.groups||[]); } catch{}
  };

  useEffect(()=>{
    loadConvs(); loadGroups();
    const s=getSocket();
    if(s){
      s.on('new_message',(msg)=>{ setMessages(p=>p.find(m=>m._id===msg._id)?p:[...p,msg]); loadConvs(); scrollBottom(); });
      s.on('new_group_message',(msg)=>{ setGroupMessages(p=>p.find(m=>m._id===msg._id)?p:[...p,msg]); loadGroups(); scrollBottom(); });
      s.on('message_deleted',({msgId,forEveryone})=>{ setMessages(p=>p.map(m=>m._id===msgId?(forEveryone?{...m,deletedForEveryone:true,mediaData:null}:null):m).filter(Boolean)); });
      s.on('user_online',({userId,online})=>setOnlineUsers(p=>{const n=new Set(p);online?n.add(userId):n.delete(userId);return n;}));
      s.on('online_users',({userIds})=>setOnlineUsers(new Set(userIds)));
      s.on('user_typing',({parentId,isTyping})=>setTypingParents(p=>({...p,[parentId]:isTyping})));
    }
    return ()=>{ s?.off('new_message');s?.off('new_group_message');s?.off('message_deleted');s?.off('user_online');s?.off('online_users');s?.off('user_typing'); };
  },[]);

  useEffect(()=>{ scrollBottom(); },[messages,groupMessages]);

  const openChat = async (parent) => {
    setActive(parent); setActiveGroup(null); setScreen('chat'); setLoadingMsgs(true);
    try{ const r=await api.get(`/chat/${parent._id}`); setMessages(r.data.messages||[]); }
    catch{} finally{ setLoadingMsgs(false); }
  };
  const openGroup = async (group) => {
    setActiveGroup(group); setActive(null); setScreen('group'); setLoadingMsgs(true);
    getSocket()?.emit('join_group',group._id);
    try{ const r=await api.get(`/groups/${group._id}/messages`); setGroupMessages(r.data.messages||[]); }
    catch{} finally{ setLoadingMsgs(false); }
  };

  const send = async (payload,isGroup=false) => {
    const s=getSocket();
    try{
      if(isGroup&&activeGroup){
        if(s?.connected) s.emit('send_group_message',{groupId:activeGroup._id,senderId:user._id,...payload});
        else{ const r=await api.post(`/groups/${activeGroup._id}/messages`,payload); setGroupMessages(p=>[...p,r.data.message]); }
      } else if(active){
        if(s?.connected){
          s.emit('send_message',{senderId:user._id,senderRole:'admin',parentId:active._id,...payload});
          setMessages(p=>[...p,{_id:Date.now().toString(),sender:{_id:user._id,name:user.name,profilePic:user.profilePic},senderRole:'admin',parentId:active._id,createdAt:new Date().toISOString(),isRead:false,reactions:[],...payload}]);
        } else{ const r=await api.post('/chat',{parentId:active._id,...payload}); setMessages(p=>[...p,r.data.message]); }
      }
      setInput(''); scrollBottom();
    } catch{ toast.error('Send failed'); }
    finally{ setMediaProgress(null); }
  };

  const sendText = () => { if(!input.trim()) return; send({content:input.trim(),messageType:'text'},screen==='group'); setInput(''); };

  const startRec = async () => {
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      mr.current=new MediaRecorder(stream,{mimeType:'audio/webm'});
      chunks.current=[];
      mr.current.ondataavailable=e=>chunks.current.push(e.data);
      mr.current.onstop=()=>{
        const blob=new Blob(chunks.current,{type:'audio/webm'});
        const rd=new FileReader();
        rd.onload=()=>send({content:'🎤 Voice message',messageType:'voice',mediaData:rd.result,mediaMimeType:'audio/webm',duration:recordSec},screen==='group');
        rd.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop()); setRecordSec(0);
      };
      mr.current.start(); setRecording(true);
      timer.current=setInterval(()=>setRecordSec(n=>n+1),1000);
    } catch{ toast.error('Mic not available'); }
  };
  const stopRec = () => { if(mr.current?.state==='recording'){mr.current.stop();clearInterval(timer.current);setRecording(false);} };
  const cancelRec = () => { if(mr.current?.state==='recording'){mr.current.ondataavailable=null;mr.current.onstop=null;mr.current.stop();clearInterval(timer.current);setRecording(false);setRecordSec(0);} };

  const handleFile = async (e) => {
    const f=e.target.files[0]; if(!f) return;
    const isImg=f.type.startsWith('image/'),isVid=f.type.startsWith('video/');
    if(!isImg&&!isVid){toast.error('Images and videos only');return;}
    if(f.size>1024*1024*1024){toast.error('Max 1GB');return;}
    const isGroup=screen==='group';
    try{
      if(isImg){ setMediaProgress({progress:30,label:'Compressing...'}); const {data,sizeKB,originalKB}=await compressImage(f,1); setMediaProgress({progress:85,label:'Sending...'}); toast.success(`Photo: ${formatSize(originalKB)}→${formatSize(sizeKB)}`); await send({content:'📷 Photo',messageType:'image',mediaData:data,mediaMimeType:'image/jpeg'},isGroup); }
      else{ setMediaProgress({progress:10,label:'Processing video...'}); const {data,sizeKB,originalKB,mimeType}=await compressVideo(f,15); setMediaProgress({progress:85,label:'Sending...'}); toast.success(`Video: ${formatSize(originalKB)}→${formatSize(sizeKB)}`); await send({content:'🎥 Video',messageType:'video',mediaData:data,mediaMimeType:mimeType||f.type},isGroup); }
    } catch{ toast.error('Media failed'); setMediaProgress(null); }
    e.target.value='';
  };

  const handleDelete = async (msgId,forEveryone) => {
    try{ await api.delete(`/chat/${msgId}`,{data:{deleteForEveryone:forEveryone}}); if(forEveryone) setMessages(p=>p.map(m=>m._id===msgId?{...m,deletedForEveryone:true,mediaData:null}:m)); else setMessages(p=>p.filter(m=>m._id!==msgId)); toast.success(forEveryone?'Deleted for everyone':'Deleted'); } catch{ toast.error('Delete failed'); }
  };
  const handleReact = async (msgId,emoji) => {
    try{ await api.put(`/chat/${msgId}/react`,{emoji}); if(active){const r=await api.get(`/chat/${active._id}`);setMessages(r.data.messages||[]);} } catch{}
  };

  const isOnline = (id) => onlineUsers.has(id?.toString());
  const currentMsgs = screen==='group'?groupMessages:messages;
  const chatTarget = screen==='group'?activeGroup:active;

  // ── CHAT SCREEN ────────────────────────────────────────────────────────────
  if(screen==='chat'||screen==='group') return (
    <div style={{position:'fixed',top:'var(--header-height)',left:0,right:0,bottom:0,display:'flex',flexDirection:'column',background:'#0B141A'}}>
      {showCreateGroup&&<CreateGroupModal onClose={()=>setShowCreateGroup(false)} onCreated={g=>{setGroups(p=>[g,...p]);}}/>}
      {/* Header */}
      <div style={{padding:'10px 14px',background:'#1F2C34',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <button onClick={()=>setScreen('list')} style={{background:'none',border:'none',color:'#E9EDEF',fontSize:22,cursor:'pointer',padding:'4px 8px',marginLeft:-8}}>←</button>
        <Avatar name={chatTarget?.name||'?'} src={chatTarget?.profilePic} size={42} online={screen==='chat'?isOnline(chatTarget?._id):undefined}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:15,color:'#E9EDEF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{screen==='group'?`👥 ${chatTarget?.name}`:chatTarget?.name||'Parent'}</div>
          <div style={{fontSize:11,color:typingParents[chatTarget?._id]?'#25D366':'#8696A0',marginTop:1}}>
            {screen==='group'?`${chatTarget?.members?.length||0} members`:typingParents[chatTarget?._id]?'✍ typing...':isOnline(chatTarget?._id)?'● Online':'○ Offline'}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{display:'none'}}/>
        <button onClick={()=>fileRef.current?.click()} style={{background:'none',border:'none',color:'#8696A0',cursor:'pointer',fontSize:20,padding:4}}>📎</button>
      </div>

      {/* Messages */}
      <div ref={msgsBox} style={{flex:1,overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:4,WebkitOverflowScrolling:'touch',backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`}}>
        {loadingMsgs?<div style={{display:'flex',justifyContent:'center',padding:40}}><div className="spinner spinner-dark"/></div>
        :currentMsgs.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#8696A0',textAlign:'center',padding:40}}>
          <div style={{fontSize:52,marginBottom:12}}>💬</div>
          <div style={{fontSize:15,fontWeight:600,color:'#E9EDEF',marginBottom:6}}>No messages yet</div>
          <div style={{fontSize:13}}>Start the conversation</div>
        </div>
        :currentMsgs.map(msg=>{
          const isMe=msg.sender?._id===user._id||msg.sender===user._id;
          return <MsgBubble key={msg._id} msg={msg} isMe={isMe} userId={user._id} onDelete={handleDelete} onShare={m=>shareMedia(m.mediaData,m.messageType==='image'?'photo.jpg':'video.mp4')} onDownload={m=>downloadMedia(m.mediaData,m.messageType==='image'?'photo.jpg':'video.mp4')} onReact={handleReact}/>;
        })}
        <div style={{height:8}}/>
      </div>

      {/* Media progress */}
      {mediaProgress&&<div style={{margin:'0 12px',padding:'7px 12px',background:'rgba(37,211,102,0.08)',borderRadius:10,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div style={{flex:1,height:3,background:'rgba(255,255,255,0.08)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',width:`${mediaProgress.progress}%`,background:'#25D366',transition:'width 0.3s'}}/></div>
        <span style={{fontSize:11,color:'#25D366'}}>{mediaProgress.label}</span>
      </div>}

      {/* Recording */}
      {recording&&<div style={{margin:'0 12px',padding:'8px 12px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:10,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <div style={{width:9,height:9,borderRadius:'50%',background:'#EF4444',animation:'pulse 1s infinite'}}/>
        <span style={{fontSize:13,color:'#FC8181',fontWeight:600,flex:1}}>🎤 {fmt(recordSec)}</span>
        <button onClick={cancelRec} style={{padding:'4px 10px',borderRadius:8,background:'transparent',border:'1px solid rgba(239,68,68,0.4)',color:'#FC8181',fontSize:12,cursor:'pointer'}}>✕</button>
        <button onClick={stopRec} style={{padding:'4px 12px',borderRadius:8,background:'#EF4444',border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>⬛ Send</button>
      </div>}

      {/* Input */}
      <div style={{padding:'8px 12px 16px',background:'#1F2C34',borderTop:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();}}}
            placeholder={`Message ${screen==='group'?activeGroup?.name||'group':active?.name||''}...`}
            rows={1} style={{flex:1,padding:'11px 14px',background:'#2A3942',border:'1.5px solid rgba(255,255,255,0.06)',borderRadius:24,resize:'none',outline:'none',color:'#E9EDEF',fontSize:'16px',lineHeight:1.5,maxHeight:100}}
          />
          {input.trim()?
            <button onClick={sendText} style={sendBtn}>➤</button>:
            <button onMouseDown={startRec} onMouseUp={stopRec} onTouchStart={e=>{e.preventDefault();startRec();}} onTouchEnd={e=>{e.preventDefault();stopRec();}}
              style={{...sendBtn,background:recording?'#EF4444':'linear-gradient(135deg,#00A884,#128C7E)'}}>🎤</button>
          }
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );

  // ── LIST SCREEN (default mobile view) ─────────────────────────────────────
  return (
    <div style={{position:'fixed',top:'var(--header-height)',left:0,right:0,bottom:0,display:'flex',flexDirection:'column',background:'#111B21'}}>
      {showCreateGroup&&<CreateGroupModal onClose={()=>setShowCreateGroup(false)} onCreated={g=>{setGroups(p=>[g,...p]);}}/>}

      {/* Header */}
      <div style={{padding:'14px 16px 0',background:'#111B21',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <h2 style={{color:'#E9EDEF',fontSize:22,fontWeight:700}}>Chats</h2>
          <button onClick={()=>setShowCreateGroup(true)} style={{background:'rgba(37,211,102,0.15)',border:'1px solid rgba(37,211,102,0.3)',color:'#25D366',borderRadius:999,padding:'7px 16px',cursor:'pointer',fontSize:14,fontWeight:600}}>+ Group</button>
        </div>
        <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
          {[['direct','Direct'],['groups','Groups']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'10px 0',background:'none',border:'none',color:tab===k?'#25D366':'#8696A0',fontSize:14,fontWeight:tab===k?700:400,cursor:'pointer',borderBottom:tab===k?'2px solid #25D366':'2px solid transparent',marginBottom:-1}}>{l}</button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div style={{padding:'10px 14px',flexShrink:0}}>
        <div style={{background:'#2A3942',borderRadius:10,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
          <span style={{color:'#8696A0',fontSize:16}}>🔍</span>
          <span style={{fontSize:14,color:'#8696A0'}}>Search...</span>
        </div>
      </div>

      {/* List */}
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
        {tab==='direct'&&(
          loadingConvs?<div style={{display:'flex',justifyContent:'center',padding:40}}><div className="spinner spinner-dark"/></div>
          :convs.length===0?<div style={{padding:'60px 20px',textAlign:'center',color:'#8696A0'}}>
            <div style={{fontSize:48,marginBottom:12}}>💬</div>
            <div style={{fontSize:16,fontWeight:600,color:'#E9EDEF',marginBottom:4}}>No conversations yet</div>
            <div style={{fontSize:13}}>Parents will appear here when they message</div>
          </div>
          :convs.map(conv=>{
            const pid=conv.parent?._id||conv._id;
            const online=isOnline(pid);
            const isTyp=typingParents[pid];
            const lastTime=conv.lastTime?new Date(conv.lastTime).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';
            return (
              <div key={pid} onClick={()=>openChat(conv.parent)} style={{padding:'13px 16px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',gap:13,active:'background:#1F2C34'}}>
                <Avatar name={conv.parent?.name} src={conv.parent?.profilePic} size={50} online={online}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                    <span style={{fontWeight:600,fontSize:15,color:'#E9EDEF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{conv.parent?.name||'Unknown'}</span>
                    <span style={{fontSize:11,color:conv.unreadCount>0?'#25D366':'#8696A0',flexShrink:0,marginLeft:8}}>{lastTime}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:13,color:isTyp?'#25D366':'#8696A0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                      {isTyp?'✍ typing...':(conv.lastMessage?.substring(0,35)||'')}
                    </span>
                    {conv.unreadCount>0&&<span style={{background:'#25D366',color:'#111',borderRadius:999,fontSize:11,fontWeight:700,padding:'2px 7px',marginLeft:8,flexShrink:0,minWidth:20,textAlign:'center'}}>{conv.unreadCount}</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {tab==='groups'&&(
          groups.length===0?<div style={{padding:'60px 20px',textAlign:'center',color:'#8696A0'}}>
            <div style={{fontSize:48,marginBottom:12}}>👥</div>
            <div style={{fontSize:16,fontWeight:600,color:'#E9EDEF',marginBottom:4}}>No groups yet</div>
            <button onClick={()=>setShowCreateGroup(true)} style={{marginTop:16,padding:'11px 28px',background:'linear-gradient(135deg,#00A884,#128C7E)',border:'none',borderRadius:12,color:'#fff',cursor:'pointer',fontWeight:600}}>Create First Group</button>
          </div>
          :groups.map(group=>(
            <div key={group._id} onClick={()=>openGroup(group)} style={{padding:'13px 16px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',gap:13}}>
              <div style={{width:50,height:50,borderRadius:'50%',background:'linear-gradient(135deg,#9B1826,#6B0F1A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{group.icon||'👥'}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontWeight:600,fontSize:15,color:'#E9EDEF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{group.name}</span>
                  {group.lastMessageTime&&<span style={{fontSize:11,color:'#8696A0',flexShrink:0,marginLeft:8}}>{new Date(group.lastMessageTime).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>}
                </div>
                <div style={{fontSize:13,color:'#8696A0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{group.lastMessage||`${group.members?.length||0} members`}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const sendBtn = {width:46,height:46,borderRadius:'50%',flexShrink:0,background:'linear-gradient(135deg,#00A884,#128C7E)',border:'none',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'};
