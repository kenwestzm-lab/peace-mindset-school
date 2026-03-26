import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '';
const fmtDay  = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now()-new Date(d))/86400000);
  if (diff===0) return 'Today'; if (diff===1) return 'Yesterday';
  return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
};
const timeLeft = (exp) => {
  const ms = new Date(exp)-Date.now(); if (ms<=0) return 'Expired';
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000);
  return h>0?`${h}h ${m}m left`:`${m}m left`;
};

// ─── Story Viewer ─────────────────────────────────────────────────────────────
function StoryViewer({groups,groupIdx:initGI,onClose,currentUserId}){
  const [gi,setGi]=useState(initGI||0);
  const [si,setSi]=useState(0);
  const [pct,setPct]=useState(0);
  const timer=useRef(null);
  const group=groups[gi]; const story=group?.items[si];
  const advance=useCallback(()=>{
    clearInterval(timer.current);
    if(si<group.items.length-1){setSi(s=>s+1);return;}
    if(gi<groups.length-1){setGi(g=>g+1);setSi(0);return;}
    onClose();
  },[gi,si,group,groups,onClose]);
  useEffect(()=>{
    if(!story)return;
    api.put(`/stories/${story._id}/view`).catch(()=>{});
    setPct(0);
    const dur=story.mediaType==='video'?15000:5000;
    const step=100/(dur/50);
    timer.current=setInterval(()=>setPct(p=>{if(p>=100){advance();return 100;}return p+step;}),50);
    return()=>clearInterval(timer.current);
  },[gi,si]);
  if(!story)return null;
  const tap=(e)=>{const x=e.clientX/window.innerWidth;clearInterval(timer.current);if(x<0.3){if(si>0)setSi(s=>s-1);else if(gi>0){setGi(g=>g-1);setSi(0);}}else advance();};
  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:9999,display:'flex',flexDirection:'column'}} onClick={tap}>
      <div style={{display:'flex',gap:3,padding:'12px 12px 0',flexShrink:0}}>
        {group.items.map((_,i)=>(
          <div key={i} style={{flex:1,height:3,background:'rgba(255,255,255,0.3)',borderRadius:2,overflow:'hidden'}}>
            <div style={{height:'100%',background:'#fff',width:`${i<si?100:i===si?pct:0}%`}}/>
          </div>))}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',flexShrink:0}} onClick={e=>e.stopPropagation()}>
        <div style={av(38)}>{story.author?.profilePic?<img src={story.author.profilePic} style={avImg} alt=""/>:<span>{story.author?.name?.[0]?.toUpperCase()}</span>}</div>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:'#fff'}}>{story.author?.name}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.6)'}}>{timeLeft(story.expiresAt)}</div></div>
        <button onClick={e=>{e.stopPropagation();onClose();}} style={{background:'none',border:'none',color:'#fff',fontSize:22,cursor:'pointer'}}>✕</button>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',position:'relative'}}>
        {story.mediaType==='image'&&story.mediaData&&<img src={story.mediaData} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt=""/>}
        {story.mediaType==='video'&&story.mediaData&&<video src={story.mediaData} autoPlay playsInline muted loop style={{maxWidth:'100%',maxHeight:'100%'}}/>}
        {story.text&&<div style={{position:'absolute',bottom:60,left:0,right:0,padding:'16px 20px',background:'linear-gradient(transparent,rgba(0,0,0,0.75))'}}><p style={{color:'#fff',fontSize:16,margin:0,textAlign:'center'}}>{story.text}</p></div>}
      </div>
      {story.author?._id===currentUserId&&<div style={{padding:'8px 16px',color:'rgba(255,255,255,0.7)',fontSize:13,display:'flex',gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}><span>👁</span><span>{story.viewers?.length||0} views</span></div>}
    </div>);
}

// ─── Voice Msg ────────────────────────────────────────────────────────────────
function VoiceMsg({src}){
  const [playing,setPlaying]=useState(false);
  const [prog,setProg]=useState(0);
  const [dur,setDur]=useState(0);
  const ref=useRef(null);
  const toggle=()=>{if(!ref.current)return;if(playing){ref.current.pause();setPlaying(false);}else{ref.current.play();setPlaying(true);}};
  return(
    <div style={{display:'flex',alignItems:'center',gap:8,minWidth:180}}>
      <audio ref={ref} src={src} onTimeUpdate={e=>setProg(e.target.currentTime/e.target.duration*100)} onLoadedMetadata={e=>setDur(e.target.duration)} onEnded={()=>{setPlaying(false);setProg(0);}}/>
      <button onClick={toggle} style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{playing?'⏸':'▶'}</button>
      <div style={{flex:1}}>
        <div style={{height:3,background:'rgba(255,255,255,0.2)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',width:`${prog}%`,background:'#25D366',transition:'width .1s'}}/></div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',marginTop:3}}>{dur?`${Math.floor(dur/60)}:${String(Math.floor(dur%60)).padStart(2,'0')}`:'0:00'}</div>
      </div>
      <span style={{fontSize:18}}>🎤</span>
    </div>);
}

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({msg,isMe,onLongPress}){
  const [big,setBig]=useState(false);
  const pt=useRef(null); const moved=useRef(false);
  const deleted=msg.deletedForEveryone;
  const onTS=()=>{moved.current=false;pt.current=setTimeout(()=>{if(!moved.current){navigator.vibrate?.(30);onLongPress(msg);}},500);};
  const onTM=()=>{moved.current=true;}; const onTE=()=>clearTimeout(pt.current);
  return(
    <>
      <div style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',marginBottom:2,paddingLeft:isMe?48:8,paddingRight:isMe?8:48}}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onMouseDown={onTS} onMouseUp={onTE}>
        {!isMe&&<div style={{...av(28),flexShrink:0,marginRight:5,alignSelf:'flex-end'}}>{msg.sender?.profilePic?<img src={msg.sender.profilePic} style={avImg} alt=""/>:<span style={{fontSize:11}}>{msg.sender?.name?.[0]?.toUpperCase()||'A'}</span>}</div>}
        <div style={{maxWidth:'75%',padding:'7px 9px 4px',borderRadius:isMe?'12px 12px 2px 12px':'12px 12px 12px 2px',background:isMe?'#005C4B':'#1F2C34',boxShadow:'0 1px 2px rgba(0,0,0,0.25)',position:'relative'}}>
          {deleted
            ?<span style={{color:'rgba(255,255,255,0.35)',fontStyle:'italic',fontSize:14}}>🚫 This message was deleted</span>
            :<>
              {msg.messageType==='image'&&msg.mediaData&&<img src={msg.mediaData} style={{maxWidth:'100%',borderRadius:8,display:'block',marginBottom:3,cursor:'pointer',maxHeight:260,objectFit:'cover'}} onClick={()=>setBig(true)} alt=""/>}
              {msg.messageType==='video'&&msg.mediaData&&<video src={msg.mediaData} controls style={{maxWidth:'100%',borderRadius:8,display:'block',marginBottom:3,maxHeight:260}}/>}
              {msg.messageType==='voice'&&msg.mediaData&&<VoiceMsg src={msg.mediaData}/>}
              {msg.content&&<p style={{margin:0,fontSize:15,color:'#E9EDEF',lineHeight:1.45,wordBreak:'break-word'}}>{msg.content}</p>}
              {msg.reactions?.length>0&&<div style={{position:'absolute',bottom:-10,right:6,background:'#2A3942',borderRadius:10,padding:'2px 7px',fontSize:13,boxShadow:'0 1px 3px rgba(0,0,0,0.4)',display:'flex',gap:2}}>{[...new Set(msg.reactions.map(r=>r.emoji))].join('')}<span style={{fontSize:10,color:'#8696A0',marginLeft:2}}>{msg.reactions.length}</span></div>}
            </>}
          <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:3,marginTop:3}}>
            <span style={{fontSize:10,color:'rgba(255,255,255,0.38)',whiteSpace:'nowrap'}}>{fmtTime(msg.createdAt)}</span>
            {isMe&&!deleted&&<span style={{fontSize:12,color:msg.isRead?'#53BDEB':'rgba(255,255,255,0.38)'}}>✓✓</span>}
          </div>
        </div>
      </div>
      {big&&msg.mediaData&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.96)',zIndex:9990,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setBig(false)}><img src={msg.mediaData} style={{maxWidth:'95vw',maxHeight:'92vh',objectFit:'contain'}} alt=""/></div>}
    </>);
}

// ─── Create Story ─────────────────────────────────────────────────────────────
function CreateStory({onClose,onPosted}){
  const [file,setFile]=useState(null);
  const [prev,setPrev]=useState(null);
  const [text,setText]=useState('');
  const [posting,setPosting]=useState(false);
  const ref=useRef(null);
  const pick=e=>{const f=e.target.files[0];if(!f)return;setFile(f);const r=new FileReader();r.onload=ev=>setPrev(ev.target.result);r.readAsDataURL(f);};
  const post=async()=>{
    if(!file&&!text.trim()){toast.error('Add photo, video or text');return;}
    setPosting(true);
    try{
      let md=null,mm=null,mt='text';
      if(file){await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>{md=e.target.result;res();};r.onerror=rej;r.readAsDataURL(file);});mm=file.type;mt=file.type.startsWith('video/')?'video':'image';}
      await api.post('/stories',{mediaData:md,mediaMimeType:mm,mediaType:mt,text:text||null});
      toast.success('Status posted!');onPosted();
    }catch(e){toast.error(e.response?.data?.error||'Failed');}finally{setPosting(false);}
  };
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.65)',zIndex:9000,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'#1F2C34',borderRadius:'20px 20px 0 0',padding:'20px 16px 36px',width:'100%',maxWidth:500}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <span style={{fontSize:16,fontWeight:700,color:'#E9EDEF'}}>New Status</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#8696A0',fontSize:20,cursor:'pointer'}}>✕</button>
        </div>
        <input ref={ref} type="file" accept="image/*,video/*" style={{display:'none'}} onChange={pick}/>
        {prev?<div style={{position:'relative',marginBottom:12,borderRadius:12,overflow:'hidden'}}>
            {file?.type.startsWith('video/')?<video src={prev} style={{width:'100%',maxHeight:200,objectFit:'cover'}} muted/>:<img src={prev} style={{width:'100%',maxHeight:200,objectFit:'cover'}} alt=""/>}
            <button onClick={()=>{setFile(null);setPrev(null);}} style={{position:'absolute',top:6,right:6,width:26,height:26,borderRadius:'50%',background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',fontSize:14,cursor:'pointer'}}>✕</button>
          </div>
          :<button onClick={()=>ref.current?.click()} style={{width:'100%',padding:'20px 0',background:'#2A3942',border:'2px dashed rgba(255,255,255,0.12)',borderRadius:12,color:'#8696A0',cursor:'pointer',fontSize:14,marginBottom:12}}>📷 Add Photo or Video</button>}
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Type a status update..." style={{width:'100%',background:'#2A3942',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 12px',color:'#E9EDEF',fontSize:14,resize:'none',outline:'none',marginBottom:12,boxSizing:'border-box',fontFamily:'inherit',lineHeight:1.4}} rows={2}/>
        <button onClick={post} disabled={posting} style={{width:'100%',padding:'14px',background:posting?'#2A3942':'#00A884',border:'none',borderRadius:12,color:'#fff',fontWeight:700,fontSize:15,cursor:posting?'default':'pointer'}}>{posting?'Posting...':'✓ Post Status'}</button>
      </div>
    </div>);
}

// Shared style helpers
const av=(s)=>({width:s,height:s,borderRadius:'50%',background:'linear-gradient(135deg,#2A3942,#3B4A54)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.round(s*0.38),fontWeight:700,color:'#fff',overflow:'hidden',flexShrink:0});
const avImg={width:'100%',height:'100%',objectFit:'cover'};
const inputBarStyle={display:'flex',alignItems:'flex-end',gap:8,padding:'6px 10px 8px',background:'#1F2C34',flexShrink:0};
const textareaStyle={flex:1,background:'#2A3942',border:'none',borderRadius:24,padding:'10px 14px',color:'#E9EDEF',fontSize:15,outline:'none',resize:'none',maxHeight:120,lineHeight:1.4,minHeight:40,fontFamily:"'Segoe UI',system-ui,sans-serif"};
const sendBtnStyle={width:46,height:46,borderRadius:'50%',background:'#00A884',border:'none',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0};
const iconBtnStyle={width:42,height:42,borderRadius:'50%',background:'#2A3942',border:'none',color:'#8696A0',fontSize:19,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ParentChat(){
  const {user}=useStore();
  const [view,setView]=useState('list'); // list | chat | group | updates
  const [messages,setMessages]=useState([]);
  const [groups,setGroups]=useState([]);
  const [selGroup,setSelGroup]=useState(null);
  const [groupMsgs,setGroupMsgs]=useState([]);
  const [input,setInput]=useState('');
  const [grpInput,setGrpInput]=useState('');
  const [adminTyping,setAdminTyping]=useState(false);
  const [recording,setRecording]=useState(false);
  const [recObj,setRecObj]=useState(null);
  const [menu,setMenu]=useState(null);
  const [unread,setUnread]=useState(0);
  const [lastMsg,setLastMsg]=useState(null);
  const [storyGroups,setStoryGroups]=useState([]);
  const [myStories,setMyStories]=useState([]);
  const [storyViewer,setStoryViewer]=useState(null);
  const [showCreate,setShowCreate]=useState(false);
  const bottomRef=useRef(null);
  const fileRef=useRef(null);
  const grpFileRef=useRef(null);
  const typingTimer=useRef(null);

  const loadMessages=useCallback(async()=>{
    try{const r=await api.get('/chat/messages');const msgs=r.data.messages||[];setMessages(msgs);setLastMsg(msgs[msgs.length-1]||null);}catch(e){console.error('msgs',e);}
  },[]);
  const loadGroups=useCallback(async()=>{
    try{const r=await api.get('/groups');setGroups(r.data.groups||[]);}catch(e){console.error('groups',e);}
  },[]);
  const loadGroupMsgs=useCallback(async(gid)=>{
    try{const r=await api.get(`/groups/${gid}/messages`);setGroupMsgs(r.data.messages||[]);}catch(e){console.error('grpmsgs',e);}
  },[]);
  const loadStories=useCallback(async()=>{
    try{const r=await api.get('/stories');const all=r.data.stories||[];const map={};all.forEach(s=>{const k=s.author?._id;if(!map[k])map[k]={author:s.author,items:[]};map[k].items.push(s);});setMyStories(map[user?._id]?.items||[]);setStoryGroups(Object.values(map).filter(g=>g.author?._id!==user?._id));}catch(e){console.error('stories',e);}
  },[user?._id]);

  useEffect(()=>{loadMessages();loadGroups();loadStories();},[]);

  useEffect(()=>{
    const socket=getSocket(); if(!socket)return;
    const onMsg=(msg)=>{setMessages(p=>{const u=[...p,msg];setLastMsg(u[u.length-1]);return u;});if(view!=='chat')setUnread(n=>n+1);else api.put(`/chat/${msg._id}/read`).catch(()=>{});};
    const onTyping=({isTyping})=>setAdminTyping(isTyping);
    const onDel=({msgId,forEveryone})=>{if(forEveryone)setMessages(p=>p.map(m=>m._id===msgId?{...m,deletedForEveryone:true}:m));};
    const onReact=({msgId})=>{api.get(`/chat/message/${msgId}`).then(r=>setMessages(p=>p.map(m=>m._id===msgId?r.data.message:m))).catch(()=>{});};
    const onGrpMsg=(msg)=>{if(selGroup?._id===msg.group)setGroupMsgs(p=>[...p,msg]);setGroups(p=>p.map(g=>g._id===msg.group?{...g,lastMessage:msg.content||'📎 Media',lastMessageTime:msg.createdAt}:g));};
    socket.on('new_message',onMsg); socket.on('admin_typing',onTyping); socket.on('message_deleted',onDel); socket.on('message_reaction',onReact); socket.on('new_group_message',onGrpMsg); socket.on('new_story',loadStories); socket.on('stories_expired',loadStories);
    return()=>{socket.off('new_message',onMsg);socket.off('admin_typing',onTyping);socket.off('message_deleted',onDel);socket.off('message_reaction',onReact);socket.off('new_group_message',onGrpMsg);socket.off('new_story',loadStories);socket.off('stories_expired',loadStories);};
  },[view,selGroup,loadStories]);

  useEffect(()=>{if(view==='chat'){setUnread(0);messages.forEach(m=>{if(!m.isRead&&m.senderRole!=='parent')api.put(`/chat/${m._id}/read`).catch(()=>{});}});}},[view]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[messages,groupMsgs]);

  // CRITICAL FIX: direct input handler — no socket calls blocking state update
  const handleInput=(e)=>{
    const val=e.target.value;
    setInput(val); // state update first, always
    const socket=getSocket();
    if(socket){
      socket.emit('typing',{isTyping:true,senderRole:'parent',parentId:user?._id});
      clearTimeout(typingTimer.current);
      typingTimer.current=setTimeout(()=>socket.emit('typing',{isTyping:false,senderRole:'parent',parentId:user?._id}),1500);
    }
  };

  const sendText=()=>{
    const txt=input.trim(); if(!txt)return;
    const socket=getSocket();
    if(socket)socket.emit('send_message',{senderId:user?._id,senderRole:'parent',parentId:user?._id,content:txt,messageType:'text'});
    else toast.error('Not connected to server');
    setInput('');
  };

  const sendGrpText=()=>{
    const txt=grpInput.trim(); if(!txt||!selGroup)return;
    const socket=getSocket();
    if(socket)socket.emit('send_group_message',{groupId:selGroup._id,senderId:user?._id,senderRole:'parent',content:txt,messageType:'text'});
    setGrpInput('');
  };

  const sendMedia=async(file,isGrp=false)=>{
    if(!file)return;
    if(!file.type.startsWith('image/')&&!file.type.startsWith('video/')){toast.error('Images and videos only');return;}
    toast('Sending…',{icon:'📎',duration:1500});
    const reader=new FileReader();
    reader.onload=e=>{
      const socket=getSocket(); if(!socket){toast.error('Not connected');return;}
      const p={senderId:user?._id,senderRole:'parent',content:'',messageType:file.type.startsWith('image/')?'image':'video',mediaData:e.target.result,mediaMimeType:file.type};
      if(isGrp&&selGroup)socket.emit('send_group_message',{...p,groupId:selGroup._id});
      else socket.emit('send_message',{...p,parentId:user?._id});
    };
    reader.readAsDataURL(file);
  };

  const startRec=async()=>{
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const mr=new MediaRecorder(stream);const ch=[];mr.ondataavailable=e=>ch.push(e.data);mr.onstop=()=>{const blob=new Blob(ch,{type:'audio/webm'});const reader=new FileReader();reader.onload=e=>{const socket=getSocket();if(!socket)return;socket.emit('send_message',{senderId:user?._id,senderRole:'parent',parentId:user?._id,content:'',messageType:'voice',mediaData:e.target.result,mediaMimeType:'audio/webm'});};reader.readAsDataURL(blob);stream.getTracks().forEach(t=>t.stop());};mr.start();setRecObj(mr);setRecording(true);}catch{toast.error('Microphone denied');}
  };
  const stopRec=()=>{recObj?.stop();setRecording(false);setRecObj(null);};

  const doDelete=async(msgId,forAll,isGrp=false)=>{
    try{await api.delete(`/chat/${msgId}`,{data:{forEveryone:forAll}});if(forAll){if(isGrp)setGroupMsgs(p=>p.map(m=>m._id===msgId?{...m,deletedForEveryone:true}:m));else setMessages(p=>p.map(m=>m._id===msgId?{...m,deletedForEveryone:true}:m));}else{if(isGrp)setGroupMsgs(p=>p.filter(m=>m._id!==msgId));else setMessages(p=>p.filter(m=>m._id!==msgId));}setMenu(null);}catch{toast.error('Delete failed');}
  };
  const doReact=async(msgId,emoji)=>{try{await api.put(`/chat/${msgId}/react`,{emoji});setMenu(null);}catch{toast.error('React failed');}};
  const joinGroup=async(gid)=>{try{await api.put(`/groups/${gid}/join`);await loadGroups();toast.success('Joined!');}catch(e){toast.error(e.response?.data?.error||'Failed');}};

  const groupMsgsByDay=(arr)=>arr.reduce((acc,m)=>{const day=fmtDay(m.createdAt);if(!acc.length||acc[acc.length-1].day!==day)acc.push({day,msgs:[m]});else acc[acc.length-1].msgs.push(m);return acc;},[]);

  const joined=groups.filter(g=>g.members?.some(m=>(m._id||m)===user?._id));
  const avail =groups.filter(g=>!g.members?.some(m=>(m._id||m)===user?._id));
  const allSG=[...(myStories.length?[{author:user,items:myStories,isMe:true}]:[]),...storyGroups.map(g=>({...g,isMe:false}))];

  const CtxMenu=()=>!menu?null:(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:8000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setMenu(null)}>
      <div style={{background:'#233138',borderRadius:14,overflow:'hidden',width:250,boxShadow:'0 8px 32px rgba(0,0,0,0.6)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-around',padding:'10px 8px',borderBottom:'0.5px solid rgba(255,255,255,0.08)'}}>
          {['❤️','👍','😂','😮','😢','🙏'].map(e=><button key={e} onClick={()=>doReact(menu.msg._id,e)} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',padding:'2px 4px'}}>{e}</button>)}
        </div>
        {menu.msg.mediaData&&!menu.msg.deletedForEveryone&&<button onClick={()=>{const a=document.createElement('a');a.href=menu.msg.mediaData;a.download='media';a.click();setMenu(null);}} style={mb}>⬇ Download</button>}
        <button onClick={()=>doDelete(menu.msg._id,false,menu.isGrp)} style={{...mb,color:'#FC8181'}}>🗑 Delete for me</button>
        {(menu.msg.senderRole==='parent'||(menu.msg.sender?._id||menu.msg.sender)===user?._id)&&!menu.msg.deletedForEveryone&&<button onClick={()=>doDelete(menu.msg._id,true,menu.isGrp)} style={{...mb,color:'#FC8181'}}>🗑 Delete for everyone</button>}
        <button onClick={()=>setMenu(null)} style={{...mb,color:'#8696A0',borderTop:'0.5px solid rgba(255,255,255,0.06)'}}>Cancel</button>
      </div>
    </div>);

  const root={display:'flex',flexDirection:'column',height:'100dvh',background:'#111B21',color:'#E9EDEF',fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:'hidden'};
  const mb={display:'block',width:'100%',padding:'14px 18px',background:'none',border:'none',color:'#E9EDEF',fontSize:15,textAlign:'left',cursor:'pointer'};

  // ── UPDATES ────────────────────────────────────────────────────────────────
  if(view==='updates')return(
    <div style={root}>
      {showCreate&&<CreateStory onClose={()=>setShowCreate(false)} onPosted={()=>{setShowCreate(false);loadStories();}}/>}
      {storyViewer!=null&&<StoryViewer groups={allSG} groupIdx={storyViewer} onClose={()=>setStoryViewer(null)} currentUserId={user?._id}/>}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'#1F2C34',flexShrink:0}}>
        <button onClick={()=>setView('list')} style={{background:'none',border:'none',color:'#8696A0',fontSize:22,cursor:'pointer',padding:'0 8px 0 0'}}>←</button>
        <span style={{fontSize:17,fontWeight:700}}>Status</span>
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        <div style={{padding:'8px 16px 4px',fontSize:12,color:'#8696A0',fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>My status</div>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',cursor:'pointer',borderBottom:'0.5px solid rgba(255,255,255,0.05)'}} onClick={myStories.length?()=>setStoryViewer(0):()=>setShowCreate(true)}>
          <div style={{position:'relative',flexShrink:0}}>
            <div style={{width:54,height:54,borderRadius:'50%',padding:2,background:myStories.length?'linear-gradient(135deg,#25D366,#128C7E)':'rgba(255,255,255,0.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{...av(50),borderRadius:'50%'}}>{user?.profilePic?<img src={user.profilePic} style={avImg} alt=""/>:<span>{user?.name?.[0]?.toUpperCase()}</span>}</div>
            </div>
            <button onClick={e=>{e.stopPropagation();setShowCreate(true);}} style={{position:'absolute',bottom:0,right:0,width:20,height:20,borderRadius:'50%',background:'#00A884',border:'2px solid #111B21',color:'#fff',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>+</button>
          </div>
          <div><div style={{fontSize:15,fontWeight:600}}>{user?.name||'Me'}</div><div style={{fontSize:13,color:'#8696A0'}}>{myStories.length?`${myStories.length} update${myStories.length>1?'s':''}·Tap to view`:'Tap to add status update'}</div></div>
        </div>
        {storyGroups.length>0&&<><div style={{padding:'8px 16px 4px',fontSize:12,color:'#8696A0',fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>Recent updates</div>
          {storyGroups.map((g,gi)=>(
            <div key={g.author?._id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',cursor:'pointer',borderBottom:'0.5px solid rgba(255,255,255,0.04)'}} onClick={()=>setStoryViewer(gi+1)}>
              <div style={{width:54,height:54,borderRadius:'50%',padding:2,background:'linear-gradient(135deg,#25D366,#128C7E)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <div style={{...av(50),borderRadius:'50%'}}>{g.author?.profilePic?<img src={g.author.profilePic} style={avImg} alt=""/>:<span>{g.author?.name?.[0]?.toUpperCase()}</span>}</div>
              </div>
              <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600}}>{g.author?.name}</div><div style={{fontSize:13,color:'#8696A0'}}>{timeLeft(g.items[g.items.length-1]?.expiresAt)}</div></div>
            </div>))}
        </>}
        {!storyGroups.length&&!myStories.length&&<div style={{textAlign:'center',padding:'60px 20px',color:'#8696A0'}}><div style={{fontSize:52,marginBottom:12}}>📷</div><div style={{fontSize:16,fontWeight:600,marginBottom:6}}>No status updates</div><div style={{fontSize:13}}>Tap + to share your first status</div></div>}
      </div>
    </div>);

  // ── GROUP CHAT ─────────────────────────────────────────────────────────────
  if(view==='group'&&selGroup){
    const isMember=selGroup.members?.some(m=>(m._id||m)===user?._id);
    return(
      <div style={root}>
        <CtxMenu/>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#1F2C34',flexShrink:0,borderBottom:'0.5px solid rgba(255,255,255,0.06)'}}>
          <button onClick={()=>{setView('list');setSelGroup(null);setGroupMsgs([]);}} style={{background:'none',border:'none',color:'#8696A0',fontSize:22,cursor:'pointer',padding:'0 8px 0 0'}}>←</button>
          <div style={{...av(38),background:'linear-gradient(135deg,#1565C0,#0D47A1)'}}>{selGroup.photo?<img src={selGroup.photo} style={avImg} alt=""/>:<span style={{fontSize:16}}>👥</span>}</div>
          <div style={{flex:1,overflow:'hidden'}}><div style={{fontSize:15,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selGroup.name}</div><div style={{fontSize:12,color:'#8696A0'}}>{selGroup.members?.length||0} members</div></div>
        </div>
        {!isMember
          ?<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,gap:16,textAlign:'center'}}>
            <div style={{fontSize:56}}>👥</div>
            <div style={{fontSize:18,fontWeight:700}}>{selGroup.name}</div>
            <div style={{fontSize:13,color:'#8696A0',maxWidth:260}}>{selGroup.description||'Join this group to participate in conversations with other parents'}</div>
            <button onClick={()=>joinGroup(selGroup._id)} style={{padding:'14px 44px',background:'#00A884',border:'none',borderRadius:24,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>Join Group</button>
          </div>
          :<>
            <div style={{flex:1,overflowY:'auto',padding:'6px 0 4px'}}>
              {groupMsgs.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#8696A0'}}><div style={{fontSize:48,marginBottom:10}}>👥</div><div>No messages yet — say hello!</div></div>}
              {groupMsgsByDay(groupMsgs).map((grp,gi)=>(
                <div key={gi}>
                  <div style={{textAlign:'center',margin:'8px 0'}}><span style={{background:'#1F2C34',padding:'4px 12px',borderRadius:8,fontSize:11,color:'#8696A0',border:'0.5px solid rgba(255,255,255,0.06)'}}>{grp.day}</span></div>
                  {grp.msgs.map(m=>{const isMe=(m.sender?._id||m.sender)===user?._id;return<Bubble key={m._id} msg={m} isMe={isMe} onLongPress={msg=>setMenu({msg,isGrp:true})}/>;})}</div>))}
              <div ref={bottomRef}/>
            </div>
            <div style={inputBarStyle}>
              <input ref={grpFileRef} type="file" accept="image/*,video/*" style={{display:'none'}} onChange={e=>{sendMedia(e.target.files[0],true);e.target.value='';}}/>
              <button onClick={()=>grpFileRef.current?.click()} style={iconBtnStyle}>📎</button>
              <textarea value={grpInput} onChange={e=>setGrpInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendGrpText();}}} placeholder="Message" rows={1} style={textareaStyle}/>
              {grpInput.trim()?<button onClick={sendGrpText} style={sendBtnStyle}>➤</button>
                :<button style={{...sendBtnStyle,background:recording?'#EF4444':'#00A884'}} onMouseDown={startRec} onMouseUp={stopRec} onTouchStart={e=>{e.preventDefault();startRec();}} onTouchEnd={stopRec}>{recording?'⏹':'🎤'}</button>}
            </div>
          </>}
      </div>);
  }

  // ── DM CHAT ────────────────────────────────────────────────────────────────
  if(view==='chat')return(
    <div style={root}>
      <CtxMenu/>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#1F2C34',flexShrink:0,borderBottom:'0.5px solid rgba(255,255,255,0.06)'}}>
        <button onClick={()=>setView('list')} style={{background:'none',border:'none',color:'#8696A0',fontSize:22,cursor:'pointer',padding:'0 8px 0 0'}}>←</button>
        <div style={{...av(38),background:'linear-gradient(135deg,#9B1826,#C02035)'}}><span style={{fontSize:16}}>🏫</span></div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>School Admin</div>
          {adminTyping?<div style={{fontSize:12,color:'#00A884'}}>typing...</div>:<div style={{fontSize:12,color:'#8696A0'}}>Peace Mindset Private School</div>}
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'6px 0 4px'}}>
        {messages.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#8696A0'}}><div style={{fontSize:48,marginBottom:10}}>💬</div><div>Send a message to the school admin</div></div>}
        {groupMsgsByDay(messages).map((grp,gi)=>(
          <div key={gi}>
            <div style={{textAlign:'center',margin:'8px 0'}}><span style={{background:'#1F2C34',padding:'4px 12px',borderRadius:8,fontSize:11,color:'#8696A0',border:'0.5px solid rgba(255,255,255,0.06)'}}>{grp.day}</span></div>
            {grp.msgs.map(m=>{const isMe=m.senderRole==='parent';return<Bubble key={m._id} msg={m} isMe={isMe} onLongPress={msg=>setMenu({msg,isGrp:false})}/>;})}</div>))}
        <div ref={bottomRef}/>
      </div>
      <div style={inputBarStyle}>
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{display:'none'}} onChange={e=>{sendMedia(e.target.files[0]);e.target.value='';}}/>
        <button onClick={()=>fileRef.current?.click()} style={iconBtnStyle}>📎</button>
        <textarea
          value={input}
          onChange={handleInput}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();}}}
          placeholder="Message"
          rows={1}
          style={textareaStyle}
        />
        {input.trim()
          ?<button onClick={sendText} style={sendBtnStyle}>➤</button>
          :<button style={{...sendBtnStyle,background:recording?'#EF4444':'#00A884'}} onMouseDown={startRec} onMouseUp={stopRec} onTouchStart={e=>{e.preventDefault();startRec();}} onTouchEnd={stopRec}>{recording?'⏹':'🎤'}</button>}
      </div>
    </div>);

  // ── CHAT LIST ──────────────────────────────────────────────────────────────
  return(
    <div style={root}>
      {showCreate&&<CreateStory onClose={()=>setShowCreate(false)} onPosted={()=>{setShowCreate(false);loadStories();}}/>}
      {storyViewer!=null&&<StoryViewer groups={allSG} groupIdx={storyViewer} onClose={()=>setStoryViewer(null)} currentUserId={user?._id}/>}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#1F2C34',flexShrink:0}}>
        <span style={{fontSize:20,fontWeight:700}}>Chats</span>
        <button onClick={()=>setView('updates')} style={{background:'none',border:'none',color:'#8696A0',fontSize:22,cursor:'pointer'}}>🔵</button>
      </div>
      {/* Stories row */}
      {allSG.length>0&&(
        <div style={{display:'flex',gap:10,overflowX:'auto',padding:'10px 12px',borderBottom:'0.5px solid rgba(255,255,255,0.06)',scrollbarWidth:'none'}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,flexShrink:0,cursor:'pointer',width:58}} onClick={()=>setShowCreate(true)}>
            <div style={{position:'relative',width:54,height:54}}>
              <div style={{...av(54),border:'2px solid #2A3942'}}>{user?.profilePic?<img src={user.profilePic} style={avImg} alt=""/>:<span>{user?.name?.[0]?.toUpperCase()}</span>}</div>
              <div style={{position:'absolute',bottom:0,right:0,width:18,height:18,borderRadius:'50%',background:'#00A884',border:'2px solid #111B21',color:'#fff',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>+</div>
            </div>
            <span style={{fontSize:10,color:'#8696A0',textAlign:'center',maxWidth:58,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>My status</span>
          </div>
          {allSG.map((g,gi)=>(
            <div key={g.author?._id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,flexShrink:0,cursor:'pointer',width:58}} onClick={()=>setStoryViewer(gi)}>
              <div style={{width:54,height:54,borderRadius:'50%',padding:2,background:'linear-gradient(135deg,#25D366,#128C7E)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{...av(50),borderRadius:'50%'}}>{g.author?.profilePic?<img src={g.author.profilePic} style={avImg} alt=""/>:<span>{g.author?.name?.[0]?.toUpperCase()}</span>}</div>
              </div>
              <span style={{fontSize:10,color:'#8696A0',textAlign:'center',maxWidth:58,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.author?.name?.split(' ')[0]}</span>
            </div>))}
        </div>)}
      <div style={{flex:1,overflowY:'auto'}}>
        {/* DM */}
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',borderBottom:'0.5px solid rgba(255,255,255,0.04)'}} onClick={()=>setView('chat')}>
          <div style={{...av(52),background:'linear-gradient(135deg,#9B1826,#C02035)',flexShrink:0}}><span style={{fontSize:22}}>🏫</span></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
              <span style={{fontSize:15,fontWeight:600}}>School Admin</span>
              {lastMsg&&<span style={{fontSize:12,color:unread?'#00A884':'#8696A0',whiteSpace:'nowrap'}}>{fmtTime(lastMsg.createdAt)}</span>}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:'#8696A0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,marginRight:8}}>
                {adminTyping?<span style={{color:'#00A884'}}>typing...</span>:lastMsg?(lastMsg.messageType==='voice'?'🎤 Voice message':lastMsg.messageType==='image'?'📷 Photo':lastMsg.messageType==='video'?'🎬 Video':(lastMsg.content||'')):'Tap to message the school'}
              </span>
              {unread>0&&<span style={{background:'#00A884',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:11,fontWeight:700,flexShrink:0}}>{unread}</span>}
            </div>
          </div>
        </div>
        {/* Joined groups */}
        {joined.length>0&&<div style={{padding:'8px 16px 4px',fontSize:12,color:'#8696A0',fontWeight:600,textTransform:'uppercase',letterSpacing:.5,background:'rgba(0,0,0,0.12)'}}>Groups</div>}
        {joined.map(g=>(
          <div key={g._id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',borderBottom:'0.5px solid rgba(255,255,255,0.04)'}} onClick={()=>{setSelGroup(g);loadGroupMsgs(g._id);setView('group');}}>
            <div style={{...av(52),background:'linear-gradient(135deg,#1565C0,#0D47A1)',flexShrink:0}}>{g.photo?<img src={g.photo} style={avImg} alt=""/>:<span style={{fontSize:22}}>👥</span>}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span style={{fontSize:15,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.name}</span>
                {g.lastMessageTime&&<span style={{fontSize:12,color:'#8696A0',whiteSpace:'nowrap',flexShrink:0,marginLeft:8}}>{fmtTime(g.lastMessageTime)}</span>}
              </div>
              <span style={{fontSize:13,color:'#8696A0',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.lastMessage||`${g.members?.length||0} members`}</span>
            </div>
          </div>))}
        {/* Available groups */}
        {avail.length>0&&<><div style={{padding:'8px 16px 4px',fontSize:12,color:'#8696A0',fontWeight:600,textTransform:'uppercase',letterSpacing:.5,background:'rgba(0,0,0,0.12)'}}>Available Groups</div>
          {avail.map(g=>(
            <div key={g._id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',borderBottom:'0.5px solid rgba(255,255,255,0.04)'}} onClick={()=>{setSelGroup(g);loadGroupMsgs(g._id);setView('group');}}>
              <div style={{...av(52),background:'linear-gradient(135deg,#2A3942,#3B4A54)',flexShrink:0}}>{g.photo?<img src={g.photo} style={avImg} alt=""/>:<span style={{fontSize:22}}>👥</span>}</div>
              <div style={{flex:1,minWidth:0}}>
                <span style={{fontSize:15,fontWeight:600,display:'block'}}>{g.name}</span>
                <span style={{fontSize:13,color:'#8696A0'}}>{g.members?.length||0} members · Tap to join</span>
              </div>
              <button onClick={e=>{e.stopPropagation();joinGroup(g._id);}} style={{padding:'6px 14px',background:'#00A884',border:'none',borderRadius:16,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>Join</button>
            </div>))}</>}
      </div>
      <div style={{display:'flex',background:'#1F2C34',borderTop:'0.5px solid rgba(255,255,255,0.08)',flexShrink:0}}>
        <button style={{flex:1,padding:'10px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:2,fontSize:11,color:'#00A884',background:'none',border:'none',cursor:'pointer'}}>💬<span>Chats</span></button>
        <button onClick={()=>setView('updates')} style={{flex:1,padding:'10px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:2,fontSize:11,color:'#8696A0',background:'none',border:'none',cursor:'pointer'}}>🔵<span>Updates</span></button>
      </div>
      <style>{`*::-webkit-scrollbar{display:none}`}</style>
    </div>);
}
