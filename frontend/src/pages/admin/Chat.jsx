import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { compressImage, compressVideo, formatSize } from '../../utils/media';
import toast from 'react-hot-toast';

const EMOJIS = ['❤️','👍','😂','😮','😢','🙏'];

export default function AdminChat() {
  const { user } = useStore();
  const [view, setView] = useState('list'); // 'list' | 'chat' | 'group' | 'newGroup'
  const [convs, setConvs] = useState([]);
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [uploading, setUploading] = useState(null);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [newGroup, setNewGroup] = useState({ name:'', desc:'', members:[] });
  const [parents, setParents] = useState([]);
  const msgsBox = useRef(null);
  const mr = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const fileRef = useRef(null);

  const scrollBottom = () => setTimeout(() => { if(msgsBox.current) msgsBox.current.scrollTop=msgsBox.current.scrollHeight; }, 60);

  const loadAll = async () => {
    try {
      const [c, g, p] = await Promise.all([
        api.get('/chat/admin/conversations'),
        api.get('/groups'),
        api.get('/admin/parents'),
      ]);
      setConvs(c.data.conversations||[]);
      setGroups(g.data.groups||[]);
      setParents(p.data.parents||[]);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    loadAll();
    const s = getSocket();
    if (s) {
      s.on('new_message', (msg) => { setMessages(p=>p.find(m=>m._id===msg._id)?p:[...p,msg]); loadAll(); scrollBottom(); });
      s.on('group_message', ({ message, groupId }) => { if(activeGroup?._id===groupId) setGroupMessages(p=>p.find(m=>m._id===message._id)?p:[...p,message]); loadAll(); scrollBottom(); });
      s.on('user_online', ({userId,online}) => setOnlineUsers(p=>{ const n=new Set(p); online?n.add(userId):n.delete(userId); return n; }));
      s.on('online_users', ({userIds}) => setOnlineUsers(new Set(userIds)));
      s.on('message_deleted', ({msgId,forEveryone}) => { if(forEveryone) setMessages(p=>p.map(m=>m._id===msgId?{...m,deletedForEveryone:true,content:'This message was deleted',mediaData:null}:m)); else setMessages(p=>p.filter(m=>m._id!==msgId)); });
      s.on('group_created', () => loadAll());
    }
    return () => { ['new_message','group_message','user_online','online_users','message_deleted','group_created'].forEach(e=>s?.off(e)); };
  }, [activeGroup]);

  useEffect(() => { scrollBottom(); }, [messages, groupMessages]);

  const openChat = async (parent) => {
    setActive(parent); setView('chat');
    try { const r=await api.get(`/chat/${parent._id}`); setMessages(r.data.messages||[]); } catch {}
  };

  const openGroup = async (group) => {
    setActiveGroup(group); setView('group');
    try { const r=await api.get(`/groups/${group._id}/messages`); setGroupMessages(r.data.messages||[]); } catch {}
  };

  const send = async (payload) => {
    const s = getSocket();
    if (view==='group' && activeGroup) {
      try {
        const r = await api.post(`/groups/${activeGroup._id}/messages`, payload);
        setGroupMessages(p=>[...p, r.data.message]);
        scrollBottom();
      } catch { toast.error('Failed'); }
    } else if (active) {
      try {
        if (s?.connected) s.emit('send_message', { senderId:user._id, senderRole:'admin', parentId:active._id, ...payload });
        else { const r=await api.post('/chat',{parentId:active._id,...payload}); setMessages(p=>[...p,r.data.message]); }
        scrollBottom();
      } catch { toast.error('Failed'); }
    }
  };

  const sendText = () => { if(!input.trim()) return; send({content:input.trim(),messageType:'text'}); setInput(''); };
  const handleKey = e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();} };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      mr.current = new MediaRecorder(stream,{mimeType:'audio/webm'});
      chunks.current=[];
      mr.current.ondataavailable=e=>chunks.current.push(e.data);
      mr.current.onstop=()=>{
        const blob=new Blob(chunks.current,{type:'audio/webm'});
        const rd=new FileReader();
        rd.onload=()=>send({content:'🎤 Voice message',messageType:'voice',mediaData:rd.result,mediaMimeType:'audio/webm',duration:recordSec});
        rd.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop());
        setRecordSec(0);
      };
      mr.current.start(); setRecording(true);
      timer.current=setInterval(()=>setRecordSec(n=>n+1),1000);
    } catch { toast.error('Microphone not available'); }
  };

  const stopRec = () => { if(mr.current?.state==='recording'){mr.current.stop();clearInterval(timer.current);setRecording(false);} };

  const handleFile = async (e) => {
    const f=e.target.files[0]; if(!f) return;
    const isImage=f.type.startsWith('image/'); const isVideo=f.type.startsWith('video/');
    if(!isImage&&!isVideo){toast.error('Only photos and videos');return;}
    if(f.size>50*1024*1024){toast.error('Max 50MB');return;}
    setUploading({name:f.name});
    try {
      if(isImage){
        const {data,sizeKB}=await compressImage(f,0.8,0.85);
        await send({content:`📷 Photo (${formatSize(sizeKB)})`,messageType:'image',mediaData:data,mediaMimeType:'image/jpeg'});
        toast.success(`Photo sent! (${formatSize(sizeKB)})`);
      } else {
        const {data,sizeKB}=await compressVideo(f);
        await send({content:`🎥 Video (${formatSize(sizeKB)})`,messageType:'video',mediaData:data,mediaMimeType:f.type});
        toast.success(`Video sent! (${formatSize(sizeKB)})`);
      }
    } catch { toast.error('Failed'); } finally { setUploading(null); e.target.value=''; }
  };

  const deleteMsg = async (msg, forEveryone) => {
    try {
      if(view==='group') {
        await api.delete(`/groups/${activeGroup._id}/messages/${msg._id}`,{data:{deleteForEveryone:forEveryone}});
        if(forEveryone) setGroupMessages(p=>p.map(m=>m._id===msg._id?{...m,deletedForEveryone:true,content:'This message was deleted',mediaData:null}:m));
        else setGroupMessages(p=>p.filter(m=>m._id!==msg._id));
      } else {
        await api.delete(`/chat/${msg._id}`,{data:{deleteForEveryone:forEveryone}});
        if(forEveryone) setMessages(p=>p.map(m=>m._id===msg._id?{...m,deletedForEveryone:true,content:'This message was deleted',mediaData:null}:m));
        else setMessages(p=>p.filter(m=>m._id!==msg._id));
      }
      setSelectedMsg(null);
    } catch { toast.error('Failed'); }
  };

  const createGroup = async () => {
    if(!newGroup.name.trim()){toast.error('Enter group name');return;}
    try {
      await api.post('/groups',{name:newGroup.name,description:newGroup.desc,memberIds:newGroup.members});
      toast.success('Group created!');
      setNewGroup({name:'',desc:'',members:[]});
      setView('list'); loadAll();
    } catch { toast.error('Failed to create group'); }
  };

  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const isOnline = id => onlineUsers.has(id?.toString());
  const msgList = view==='group' ? groupMessages : messages;
  const activeTitle = view==='group' ? activeGroup?.name : active?.name;
  const isActiveOnline = view==='group' ? false : isOnline(active?._id);

  const MsgBubble = ({msg}) => {
    const isMe = msg.sender?._id===user._id||msg.sender===user._id;
    const time = new Date(msg.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    const isDeleted = msg.deletedForEveryone;
    return (
      <div style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',marginBottom:3,paddingLeft:isMe?'12%':'0',paddingRight:isMe?'0':'12%'}}>
        {!isMe&&view==='group'&&(
          <div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg,#6B0F1A,#A52030)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff',flexShrink:0,alignSelf:'flex-end',marginRight:6}}>
            {msg.sender?.name?.[0]?.toUpperCase()||'?'}
          </div>
        )}
        <div onContextMenu={e=>{e.preventDefault();setSelectedMsg(msg);}} onTouchStart={e=>{const t=setTimeout(()=>setSelectedMsg(msg),500);e.currentTarget._t=t;}} onTouchEnd={e=>clearTimeout(e.currentTarget._t)}>
          {view==='group'&&!isMe&&<div style={{fontSize:11,color:'#D4A843',marginBottom:2,paddingLeft:4}}>{msg.sender?.name}</div>}
          <div style={{padding:isDeleted?'8px 12px':msg.messageType==='text'?'8px 12px':'5px',borderRadius:14,borderTopLeftRadius:!isMe?4:14,borderTopRightRadius:isMe?4:14,background:isMe?'linear-gradient(135deg,#6B0F1A,#A52030)':'rgba(255,255,255,0.07)',border:isMe?'none':'1px solid rgba(255,255,255,0.07)',boxShadow:isMe?'0 1px 6px rgba(155,24,38,0.25)':'none'}}>
            {isDeleted ? <p style={{fontSize:13,color:'rgba(255,255,255,0.3)',fontStyle:'italic',margin:0}}>🚫 This message was deleted</p> : <>
              {msg.messageType==='text'&&<p style={{fontSize:14,color:isMe?'#fff':'#E8E8F4',lineHeight:1.55,margin:0,wordBreak:'break-word'}}>{msg.content}</p>}
              {msg.messageType==='voice'&&msg.mediaData&&(<div style={{display:'flex',alignItems:'center',gap:8,minWidth:180}}><span style={{fontSize:18}}>🎤</span><audio controls src={msg.mediaData} style={{flex:1,height:32,maxWidth:160}}/></div>)}
              {msg.messageType==='image'&&msg.mediaData&&(<img src={msg.mediaData} alt="Photo" style={{maxWidth:220,maxHeight:240,borderRadius:10,display:'block',cursor:'pointer',objectFit:'cover'}} onClick={()=>window.open(msg.mediaData,'_blank')}/>)}
              {msg.messageType==='video'&&msg.mediaData&&(<video controls src={msg.mediaData} style={{maxWidth:220,maxHeight:180,borderRadius:10,display:'block'}} playsInline/>)}
            </>}
            <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:3,marginTop:2}}>
              <span style={{fontSize:10,color:isMe?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.28)'}}>{time}</span>
              {isMe&&<span style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>✓✓</span>}
            </div>
          </div>
          {msg.reactions?.length>0&&<div style={{display:'flex',gap:2,marginTop:2,justifyContent:isMe?'flex-end':'flex-start'}}>{[...new Set(msg.reactions.map(r=>r.emoji))].map((e,i)=><span key={i} style={{background:'rgba(255,255,255,0.08)',borderRadius:999,padding:'2px 5px',fontSize:12}}>{e}</span>)}</div>}
        </div>
      </div>
    );
  };

  return (
    <div style={{position:'fixed',top:'var(--header-height)',left:0,right:0,bottom:0,display:'flex',flexDirection:'column',background:'#0D0D14'}}>
      {/* New Group Modal */}
      {view==='newGroup' && (
        <div style={{flex:1,overflowY:'auto',padding:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
            <button onClick={()=>setView('list')} style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:22,cursor:'pointer'}}>‹</button>
            <h3 style={{fontFamily:'var(--font-display)',fontSize:20,color:'var(--text)'}}>New Group</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Group Name *</label>
            <input className="form-input" value={newGroup.name} onChange={e=>setNewGroup({...newGroup,name:e.target.value})} placeholder="e.g. Grade 7 Parents" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={newGroup.desc} onChange={e=>setNewGroup({...newGroup,desc:e.target.value})} placeholder="What is this group for?" />
          </div>
          <div className="form-group">
            <label className="form-label">Add Parents ({newGroup.members.length} selected)</label>
            <div style={{maxHeight:300,overflowY:'auto',background:'var(--bg-elevated)',borderRadius:10,border:'1px solid var(--border)'}}>
              {parents.map(p=>(
                <div key={p._id} onClick={()=>setNewGroup(g=>({...g,members:g.members.includes(p._id)?g.members.filter(id=>id!==p._id):[...g.members,p._id]}))} style={{padding:'11px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12,cursor:'pointer',background:newGroup.members.includes(p._id)?'rgba(155,24,38,0.1)':'transparent'}}>
                  <div style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#6B0F1A,#A52030)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>{p.name?.[0]?.toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13.5,color:'var(--text)'}}>{p.name}</div>
                    <div style={{fontSize:11.5,color:'var(--text-muted)'}}>{p.email}</div>
                  </div>
                  {newGroup.members.includes(p._id)&&<span style={{color:'#4ADE80',fontSize:18}}>✓</span>}
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary w-full btn-lg" onClick={createGroup}>🏘️ Create Group</button>
        </div>
      )}

      {/* Conversation list */}
      {view==='list' && (
        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
          <div style={{padding:'12px 14px',background:'#13131E',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:20,color:'#E8E8F4'}}>💬 Messages</h3>
              <p style={{fontSize:11.5,color:'rgba(255,255,255,0.35)',marginTop:1}}>{onlineUsers.size} online now</p>
            </div>
            <button onClick={()=>setView('newGroup')} style={{padding:'7px 14px',borderRadius:20,background:'linear-gradient(135deg,#6B0F1A,#A52030)',border:'none',color:'#fff',fontSize:12.5,fontWeight:700,cursor:'pointer',boxShadow:'0 0 10px rgba(155,24,38,0.3)'}}>
              + New Group
            </button>
          </div>

          {/* Groups */}
          {groups.length>0&&<div style={{padding:'8px 14px 4px',fontSize:10.5,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.1em'}}>Groups</div>}
          {groups.map(g=>(
            <div key={g._id} onClick={()=>openGroup(g)} style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'background 0.1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{width:46,height:46,borderRadius:'50%',background:'linear-gradient(135deg,#1A1A28,#2A2A40)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,border:'1px solid rgba(255,255,255,0.08)'}}>{g.icon||'🏫'}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:14.5,color:'#E8E8F4'}}>{g.name}</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:1}}>
                  {g.members?.length} members{g.lastMessage?` · ${g.lastMessage.substring(0,30)}`:''}
                </div>
              </div>
            </div>
          ))}

          {/* Direct messages */}
          {convs.length>0&&<div style={{padding:'8px 14px 4px',fontSize:10.5,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.1em'}}>Direct Messages</div>}
          {loading ? <div style={{display:'flex',justifyContent:'center',padding:24}}><div className="spinner spinner-dark"/></div>
          : convs.length===0&&groups.length===0 ? (
            <div style={{padding:'40px 20px',textAlign:'center',color:'rgba(255,255,255,0.25)'}}>
              <div style={{fontSize:48,marginBottom:12}}>💬</div>
              <div style={{fontSize:15,fontWeight:600}}>No messages yet</div>
              <div style={{fontSize:12,marginTop:4}}>Parents will appear here when they message</div>
            </div>
          ) : convs.map(conv=>(
            <div key={conv._id} onClick={()=>openChat(conv.parent)} style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'background 0.1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{position:'relative',flexShrink:0}}>
                <div style={{width:46,height:46,borderRadius:'50%',background:'linear-gradient(135deg,#6B0F1A,#A52030)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,fontWeight:700,color:'#fff'}}>{conv.parent?.name?.[0]?.toUpperCase()||'?'}</div>
                <span style={{position:'absolute',bottom:1,right:1,width:12,height:12,borderRadius:'50%',background:isOnline(conv.parent?._id)?'#4ADE80':'rgba(255,255,255,0.2)',border:'2px solid #0D0D14'}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:600,fontSize:14.5,color:'#E8E8F4',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{conv.parent?.name||'Unknown'}</span>
                  {conv.unreadCount>0&&<span style={{background:'#25D366',color:'#000',borderRadius:999,fontSize:11,fontWeight:700,padding:'2px 7px',flexShrink:0,marginLeft:6}}>{conv.unreadCount}</span>}
                </div>
                <div style={{fontSize:12,color:isOnline(conv.parent?._id)?'#4ADE80':'rgba(255,255,255,0.3)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {isOnline(conv.parent?._id)?'● Online':'○ Offline'}
                  {conv.lastMessage&&<span style={{color:'rgba(255,255,255,0.3)',marginLeft:6}}>{conv.lastMessage.substring(0,28)}{conv.lastMessage.length>28?'...':''}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat view */}
      {(view==='chat'||view==='group') && (
        <>
          {/* Header */}
          <div style={{padding:'10px 14px',background:'#13131E',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:11,flexShrink:0,boxShadow:'0 2px 10px rgba(0,0,0,0.4)'}}>
            <button onClick={()=>setView('list')} style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:24,cursor:'pointer',padding:'2px 4px',marginLeft:-4,flexShrink:0}}>‹</button>
            <div style={{position:'relative',flexShrink:0}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#6B0F1A,#A52030)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:view==='group'?20:15,fontWeight:700,color:'#fff'}}>
                {view==='group'?activeGroup?.icon||'🏫':activeTitle?.[0]?.toUpperCase()}
              </div>
              {view==='chat'&&<span style={{position:'absolute',bottom:0,right:0,width:11,height:11,borderRadius:'50%',background:isActiveOnline?'#4ADE80':'rgba(255,255,255,0.2)',border:'2px solid #13131E'}}/>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:15,color:'#E8E8F4',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeTitle}</div>
              <div style={{fontSize:11.5,marginTop:1,color:view==='group'?'rgba(255,255,255,0.4)':isActiveOnline?'#4ADE80':'rgba(255,255,255,0.3)'}}>
                {view==='group'?`${activeGroup?.members?.length} members`:isActiveOnline?'● Online now':'○ Offline'}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={msgsBox} style={{flex:1,overflowY:'auto',padding:'10px 10px',backgroundImage:'radial-gradient(circle at 20% 50%, rgba(155,24,38,0.03) 0%, transparent 50%)',WebkitOverflowScrolling:'touch',display:'flex',flexDirection:'column',gap:2}}>
            {msgList.map((msg,idx) => {
              const prev = msgList[idx-1];
              const showDate = !prev || new Date(msg.createdAt).toDateString()!==new Date(prev.createdAt).toDateString();
              return (
                <div key={msg._id}>
                  {showDate&&<div style={{textAlign:'center',margin:'8px 0'}}><span style={{background:'rgba(255,255,255,0.06)',padding:'3px 12px',borderRadius:999,fontSize:11,color:'rgba(255,255,255,0.35)'}}>{new Date(msg.createdAt).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span></div>}
                  <MsgBubble msg={msg} />
                </div>
              );
            })}
          </div>

          {/* Upload progress */}
          {uploading&&<div style={{margin:'4px 12px',padding:'8px 14px',background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:10,display:'flex',alignItems:'center',gap:10,flexShrink:0}}><div className="spinner spinner-dark" style={{width:14,height:14}}/><span style={{fontSize:13,color:'#60A5FA',flex:1}}>Sending...</span></div>}
          {recording&&<div style={{margin:'4px 12px',padding:'8px 14px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,display:'flex',alignItems:'center',gap:10,flexShrink:0}}><div style={{width:8,height:8,borderRadius:'50%',background:'#EF4444',animation:'pulse 1s infinite'}}/><span style={{fontSize:13,color:'#FC8181',fontWeight:600,flex:1}}>🎤 Recording... {fmt(recordSec)}</span><button onClick={stopRec} style={{padding:'5px 12px',borderRadius:8,background:'#EF4444',border:'none',color:'#fff',fontSize:12,cursor:'pointer'}}>Send</button></div>}

          {/* Input */}
          <div style={{padding:'8px 10px 14px',background:'#13131E',borderTop:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{display:'none'}}/>
            <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
              <button onClick={()=>fileRef.current?.click()} style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>📎</button>
              <div style={{flex:1,background:'rgba(255,255,255,0.06)',borderRadius:22,border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'flex-end',overflow:'hidden'}}>
                <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} placeholder={view==='group'?`Message ${activeGroup?.name}...`:`Reply to ${active?.name?.split(' ')[0]}...`} rows={1} style={{flex:1,padding:'11px 14px',background:'none',border:'none',outline:'none',resize:'none',color:'#E8E8F4',fontFamily:'var(--font-body)',fontSize:'16px',maxHeight:100,lineHeight:1.5}}/>
              </div>
              {input.trim()?(
                <button onClick={sendText} style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#6B0F1A,#A52030)',border:'none',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(155,24,38,0.4)'}}>➤</button>
              ):(
                <button onMouseDown={startRec} onMouseUp={stopRec} onTouchStart={e=>{e.preventDefault();startRec();}} onTouchEnd={e=>{e.preventDefault();stopRec();}} style={{width:44,height:44,borderRadius:'50%',background:recording?'#EF4444':'linear-gradient(135deg,#6B0F1A,#A52030)',border:'none',color:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:recording?'0 0 16px rgba(239,68,68,0.5)':'0 0 12px rgba(155,24,38,0.4)',transition:'all 0.2s'}}>🎤</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Message action sheet */}
      {selectedMsg&&(
        <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.65)',display:'flex',alignItems:'flex-end'}} onClick={()=>setSelectedMsg(null)}>
          <div style={{width:'100%',background:'#1A1A28',borderRadius:'20px 20px 0 0',padding:'8px 0 18px',border:'1px solid rgba(255,255,255,0.08)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'center',gap:16,padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              {EMOJIS.map(e=><button key={e} style={{fontSize:28,background:'none',border:'none',cursor:'pointer'}}>{e}</button>)}
            </div>
            {[
              {icon:'🗑️',label:'Delete for me',action:()=>deleteMsg(selectedMsg,false),color:'#EF4444'},
              (selectedMsg.sender?._id===user._id||selectedMsg.sender===user._id)&&{icon:'🗑️',label:'Delete for everyone',action:()=>deleteMsg(selectedMsg,true),color:'#EF4444'},
              selectedMsg.mediaData&&{icon:'🔗',label:'Copy media link',action:()=>{navigator.clipboard?.writeText(selectedMsg.mediaData||'');toast.success('Link copied!');setSelectedMsg(null);},color:'#60A5FA'},
              {icon:'✕',label:'Cancel',action:()=>setSelectedMsg(null),color:'rgba(255,255,255,0.35)'},
            ].filter(Boolean).map((a,i)=><button key={i} onClick={a.action} style={{width:'100%',padding:'14px 22px',background:'none',border:'none',color:a.color,fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:12}}><span style={{fontSize:18}}>{a.icon}</span>{a.label}</button>)}
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}
