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
const fmtDur = (s) => (!s||!isFinite(s)||isNaN(s)) ? "0:00" : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

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

function VoiceMsg({src,isMe,msgDuration}){
  const [playing,setPlaying]=useState(false);
  const [prog,setProg]=useState(0);
  const [dur,setDur]=useState(msgDuration||0);
  const [cur,setCur]=useState(0);
  const ref=useRef(null);
  const toggle=()=>{
    if(!ref.current)return;
    if(playing){ref.current.pause();setPlaying(false);}
    else{
      ref.current.play().catch(e=>{
        // Try to load from cache if network fails
        console.warn('Voice play error:',e);
        toast.error('Tap again to play voice note');
      });
      setPlaying(true);
    }
  };
  const waveBars=[3,5,8,12,16,20,18,14,10,7,5,8,13,18,22,17,12,8,5,3];
  return(
    <div style={{display:'flex',alignItems:'center',gap:10,minWidth:200,padding:'2px 0'}}>
      <audio ref={ref} src={src} preload="metadata"
        onTimeUpdate={e=>{const t=e.target;setProg(t.currentTime/(t.duration||1)*100);setCur(t.currentTime);}}
        onLoadedMetadata={e=>{if(e.target.duration&&isFinite(e.target.duration))setDur(e.target.duration);}}
        onEnded={()=>{setPlaying(false);setProg(0);setCur(0);}}/>
      <button onClick={toggle} style={{width:40,height:40,borderRadius:'50%',background:isMe?'rgba(255,255,255,0.2)':'rgba(0,168,132,0.3)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        {playing
          ?<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          :<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
      </button>
      <div style={{flex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:2,height:28,marginBottom:3}}>
          {waveBars.map((h,i)=>{
            const filled=(i/waveBars.length)*100<=prog;
            return <div key={i} style={{width:3,height:`${h}px`,borderRadius:2,background:filled?(isMe?'#fff':'#00A884'):'rgba(255,255,255,0.3)',transition:'background 0.1s'}}/>;
          })}
        </div>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.55)'}}>{fmtDur(playing?cur:dur)}</div>
      </div>
      <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="#8696A0"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
      </div>
    </div>);
}

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
        {!isMe&&<div style={{...av(28),flexShrink:0,marginRight:5,alignSelf:'flex-end',cursor:msg.sender?.profilePic?'pointer':'default'}} onClick={()=>msg.sender?.profilePic&&setViewPic(msg.sender.profilePic)}>{msg.sender?.profilePic?<img src={msg.sender.profilePic} style={avImg} alt=""/>:<span style={{fontSize:11}}>{msg.sender?.name?.[0]?.toUpperCase()||'A'}</span>}</div>}
        <div style={{maxWidth:'75%',padding:'7px 9px 4px',borderRadius:isMe?'12px 12px 2px 12px':'12px 12px 12px 2px',background:isMe?'#005C4B':'#1F2C34',boxShadow:'0 1px 2px rgba(0,0,0,0.25)',position:'relative'}}>
          {deleted
            ?<span style={{color:'rgba(255,255,255,0.35)',fontStyle:'italic',fontSize:14}}>🚫 This message was deleted</span>
            :<>
              {msg.messageType==='image'&&msg.mediaData&&<img src={msg.mediaData} style={{maxWidth:'100%',borderRadius:8,display:'block',marginBottom:3,cursor:'pointer',maxHeight:260,objectFit:'cover'}} onClick={()=>setBig(true)} alt=""/>}
              {msg.messageType==='video'&&msg.mediaData&&<video src={msg.mediaData} controls playsInline style={{maxWidth:'100%',borderRadius:8,display:'block',marginBottom:3,maxHeight:260}}/>}
              {msg.messageType==='voice'&&msg.mediaData&&<VoiceMsg src={msg.mediaData} isMe={isMe} msgDuration={msg.duration}/>}
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

function VoiceRecBar({onCancel,onSend}){
  const [secs,setSecs]=useState(0);
  const [bars,setBars]=useState(Array(20).fill(4));
  const interval=useRef(null);
  const animRef=useRef(null);
  useEffect(()=>{
    interval.current=setInterval(()=>setSecs(s=>s+1),1000);
    const animate=()=>{setBars(b=>[...b.slice(1),Math.floor(Math.random()*18)+4]);animRef.current=requestAnimationFrame(animate);};
    animRef.current=requestAnimationFrame(animate);
    return()=>{clearInterval(interval.current);cancelAnimationFrame(animRef.current);};
  },[]);
  return(
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'#1F2C34',flexShrink:0,borderTop:'0.5px solid rgba(255,255,255,0.06)'}}>
      {/* Cancel/Delete */}
      <button onClick={onCancel} style={{width:42,height:42,borderRadius:'50%',background:'rgba(239,68,68,0.15)',border:'none',color:'#EF4444',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>
      {/* Recording info */}
      <div style={{flex:1,display:'flex',alignItems:'center',gap:8,background:'#2A3942',borderRadius:24,padding:'8px 12px',minWidth:0}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:'#EF4444',flexShrink:0,animation:'blink 1s infinite'}}/>
        <span style={{fontSize:14,color:'#EF4444',fontWeight:700,minWidth:34,flexShrink:0}}>{fmtDur(secs)}</span>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:1.5,height:26,overflow:'hidden'}}>
          {bars.map((h,i)=><div key={i} style={{width:3,height:`${h}px`,borderRadius:2,background:'#00A884',flexShrink:0}}/>)}
        </div>
      </div>
      {/* Send button - always visible */}
      <button onClick={onSend} style={{width:46,height:46,borderRadius:'50%',background:'#00A884',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 8px rgba(0,168,132,0.4)'}}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
    </div>
  );
}

const av=(s)=>({width:s,height:s,borderRadius:'50%',background:'linear-gradient(135deg,#2A3942,#3B4A54)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.round(s*0.38),fontWeight:700,color:'#fff',overflow:'hidden',flexShrink:0});
const avImg={width:'100%',height:'100%',objectFit:'cover'};
const inputBarStyle={display:'flex',alignItems:'flex-end',gap:8,padding:'6px 10px 8px',background:'#1F2C34',flexShrink:0,position:'sticky',bottom:0,zIndex:10};
const textareaStyle={flex:1,background:'#2A3942',border:'none',borderRadius:24,padding:'10px 14px',color:'#E9EDEF',fontSize:15,outline:'none',resize:'none',maxHeight:120,lineHeight:1.4,minHeight:40,fontFamily:"'Segoe UI',system-ui,sans-serif"};
const sendBtnStyle={width:46,height:46,borderRadius:'50%',background:'#00A884',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0};
const iconBtnStyle={width:42,height:42,borderRadius:'50%',background:'#2A3942',border:'none',color:'#8696A0',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0};
const mb={display:'block',width:'100%',padding:'14px 18px',background:'none',border:'none',color:'#E9EDEF',fontSize:15,textAlign:'left',cursor:'pointer'};

const MicIcon=()=><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>;
const SendIcon=()=><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>;
const ClipIcon=()=><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>;

export default function ParentChat(){
  const {user}=useStore();
  const [view,setView]=useState('list');
  const [messages,setMessages]=useState([]);
  const [groups,setGroups]=useState([]);
  const [selGroup,setSelGroup]=useState(null);
  const [groupMsgs,setGroupMsgs]=useState([]);
  const [input,setInput]=useState('');
  const [grpInput,setGrpInput]=useState('');
  const [adminTyping,setAdminTyping]=useState(false);
  const [adminOnline,setAdminOnline]=useState(false);
  const [recording,setRecording]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [menu,setMenu]=useState(null);
  const [unread,setUnread]=useState(0);
  const [viewPic,setViewPic]=useState(null); // Full screen profile pic viewer
  const [autoDeleteSecs,setAutoDeleteSecs]=useState(0); // Disappearing messages
  const [lastMsg,setLastMsg]=useState(null);
  const [storyGroups,setStoryGroups]=useState([]);
  const [myStories,setMyStories]=useState([]);
  const [storyViewer,setStoryViewer]=useState(null);
  const [showCreate,setShowCreate]=useState(false);
  const bottomRef=useRef(null);
  const fileRef=useRef(null);
  const grpFileRef=useRef(null);
  const typingTimer=useRef(null);
  const recMR=useRef(null);
  const recAutoTimer=useRef(null);
  const recChunksRef=useRef([]);
  const recMimeRef=useRef('audio/webm');

  const loadMessages=useCallback(async()=>{try{const r=await api.get('/chat/messages');const msgs=r.data.messages||[];setMessages(msgs);setLastMsg(msgs[msgs.length-1]||null);}catch(e){console.error(e);}},[]);
  const loadGroups=useCallback(async()=>{try{const r=await api.get('/groups');setGroups(r.data.groups||[]);}catch(e){console.error(e);}},[]);
  const loadGroupMsgs=useCallback(async(gid)=>{
    try{
      const socket=getSocket();
      if(socket) socket.emit('join_group', gid);
      const r=await api.get(`/groups/${gid}/messages`);
      setGroupMsgs(r.data.messages||[]);
    }catch(e){console.error(e);}
  },[]);
  const loadStories=useCallback(async()=>{
    try{const r=await api.get('/stories');const all=r.data.stories||[];const map={};
    all.forEach(s=>{const k=s.author?._id;if(!map[k])map[k]={author:s.author,items:[]};map[k].items.push(s);});
    setMyStories(map[user?._id]?.items||[]);setStoryGroups(Object.values(map).filter(g=>g.author?._id!==user?._id));}catch(e){console.error(e);}
  },[user?._id]);

  useEffect(()=>{loadMessages();loadGroups();loadStories();},[]);

  useEffect(()=>{
    const socket=getSocket(); if(!socket)return;
    const onMsg=(msg)=>{
      setMessages(p=>{
        // Remove optimistic temp message if exists
        const filtered=p.filter(m=>!m._id?.startsWith('tmp_'));
        // Avoid true duplicates
        if(filtered.find(m=>m._id===msg._id)) return filtered;
        const u=[...filtered,msg];
        setLastMsg(u[u.length-1]);
        return u;
      });
      if(view!=='chat')setUnread(n=>n+1);
      else api.put(`/chat/${msg._id}/read`).catch(()=>{});
    };
    const onTyping=({isTyping})=>setAdminTyping(isTyping);
    const onDel=({msgId,forEveryone})=>{if(forEveryone)setMessages(p=>p.map(m=>m._id===msgId?{...m,deletedForEveryone:true}:m));};
    const onReact=({msgId})=>{api.get(`/chat/message/${msgId}`).then(r=>setMessages(p=>p.map(m=>m._id===msgId?r.data.message:m))).catch(()=>{});};
    const onGrpMsg=(msg)=>{if(selGroup?._id===msg.group)setGroupMsgs(p=>[...p,msg]);setGroups(p=>p.map(g=>g._id===msg.group?{...g,lastMessage:msg.content||'📎 Media',lastMessageTime:msg.createdAt}:g));};
    const onGrpPhoto=({groupId,photo})=>{
      setGroups(p=>p.map(g=>g._id===groupId?{...g,photo}:g));
      setSelGroup(sg=>sg&&sg._id===groupId?{...sg,photo}:sg);
    };
    socket.on('new_message',onMsg);socket.on('admin_typing',onTyping);socket.on('message_deleted',onDel);
    socket.on('message_reaction',onReact);socket.on('new_group_message',onGrpMsg);
    socket.on('group_photo_updated',onGrpPhoto);socket.on('group_updated',({groupId,photo,name})=>{
      if(photo||name) setGroups(p=>p.map(g=>g._id===groupId?{...g,...(photo&&{photo}),...(name&&{name})}:g));
      if(photo||name) setSelGroup(sg=>sg&&sg._id===groupId?{...sg,...(photo&&{photo}),...(name&&{name})}:sg);
    });
    socket.on('new_story',loadStories);socket.on('stories_expired',loadStories);
    socket.on('admin_online',()=>setAdminOnline(true));socket.on('admin_offline',()=>setAdminOnline(false));
    socket.on('call_incoming',(data)=>setIncomingCall(data));
    socket.on('admin_user_id',({adminUserId:id})=>setAdminUserId(id));
    return()=>{
      socket.off('new_message',onMsg);socket.off('admin_typing',onTyping);socket.off('message_deleted',onDel);
      socket.off('message_reaction',onReact);socket.off('new_group_message',onGrpMsg);
      socket.off('group_photo_updated',onGrpPhoto);socket.off('group_updated');
      socket.off('group_photo_updated',onGrpPhoto);socket.off('group_updated');
      socket.off('new_story',loadStories);socket.off('stories_expired',loadStories);
      socket.off('admin_online');socket.off('admin_offline');
    };
  },[view,selGroup,loadStories]);

  useEffect(()=>{if(view==='chat'){setUnread(0);messages.forEach(m=>{if(!m.isRead&&m.senderRole!=='parent')api.put(`/chat/${m._id}/read`).catch(()=>{});});}},[view]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[messages,groupMsgs]);

  const handleInput=(e)=>{
    setInput(e.target.value);
    const socket=getSocket();
    if(socket){socket.emit('typing',{isTyping:true,senderRole:'parent',parentId:user?._id});clearTimeout(typingTimer.current);typingTimer.current=setTimeout(()=>socket.emit('typing',{isTyping:false,senderRole:'parent',parentId:user?._id}),1500);}
  };

  const sendText=()=>{
    const txt=input.trim();if(!txt)return;
    const socket=getSocket();if(!socket){toast.error('Not connected');return;}
    socket.emit('send_message',{
      senderId:user?._id,senderRole:'parent',parentId:user?._id,
      content:txt,messageType:'text',
      autoDeleteSeconds:autoDeleteSecs>0?autoDeleteSecs:undefined,
    });
    setInput('');
  };
  const sendGrpText=()=>{const txt=grpInput.trim();if(!txt||!selGroup)return;const socket=getSocket();if(socket)socket.emit('send_group_message',{groupId:selGroup._id,senderId:user?._id,senderRole:'parent',content:txt,messageType:'text'});setGrpInput('');};

  const sendMedia=async(file,isGrp=false)=>{
    if(!file)return;
    if(!file.type.startsWith('image/')&&!file.type.startsWith('video/')){toast.error('Images and videos only');return;}
    if(file.size>25*1024*1024){toast.error('Max 25MB');return;}
    setUploading(true);
    const tid=toast.loading(`Uploading ${file.type.startsWith('image/')?'photo':'video'}…`);
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(file);});
      const resp=await api.post('/media/upload',{mediaData:b64,mimeType:file.type,folder:'peace-mindset/chat'});
      const url=resp.data.url;
      const socket=getSocket();if(!socket){toast.error('Not connected',{id:tid});return;}
      const payload={senderId:user?._id,senderRole:'parent',content:'',messageType:file.type.startsWith('image/')?'image':'video',mediaData:url,mediaMimeType:file.type};
      if(isGrp&&selGroup)socket.emit('send_group_message',{...payload,groupId:selGroup._id});
      else socket.emit('send_message',{...payload,parentId:user?._id});
      // Optimistic update - show message immediately in UI
      const optimistic={_id:'tmp_'+Date.now(),sender:{_id:user?._id,name:user?.name,profilePic:user?.profilePic},senderRole:'parent',parentId:user?._id,...payload,createdAt:new Date().toISOString(),isRead:false};
      if(!isGrp) setMessages(p=>[...p,optimistic]);
      else setGroupMsgs(p=>[...p,optimistic]);
      toast.success('Sent!',{id:tid});
    }catch(e){toast.error(e.response?.data?.error||'Upload failed',{id:tid});}
    finally{setUploading(false);}
  };

  const startRec=async()=>{
    try{
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast.error('Mic not supported. Use Chrome browser.');return;}
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
      const mt=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':MediaRecorder.isTypeSupported('audio/mp4')?'audio/mp4':'audio/ogg';
      recMimeRef.current=mt;recChunksRef.current=[];
      const mr=new MediaRecorder(stream,{mimeType:mt});
      mr.ondataavailable=e=>{if(e.data.size>0)recChunksRef.current.push(e.data);};
      mr.start(100);recMR.current=mr;setRecording(true);
      // No time limit on voice recording
    }catch(err){console.error(err);toast.error('Mic blocked! Tap the 🔒 lock icon in your browser address bar → Site settings → Microphone → Allow',{duration:6000});}
  };

  const stopRecAndSend=async()=>{
    if(!recMR.current)return;
    const mr=recMR.current;
    mr.stream.getTracks().forEach(t=>t.stop());
    await new Promise(res=>{mr.onstop=res;mr.stop();});
    setRecording(false);recMR.current=null;
    const chunks=recChunksRef.current;
    if(!chunks.length){toast.error('No audio recorded');return;}
    const blob=new Blob(chunks,{type:recMimeRef.current});
    if(blob.size<100){toast.error('Recording too short');return;}
    const tid=toast.loading('Sending voice note…');
    try{
      const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(blob);});
      let url=b64;
      try{const resp=await api.post('/media/upload',{mediaData:b64,mimeType:recMimeRef.current,folder:'peace-mindset/voice'});url=resp.data.url;}catch(uploadErr){console.warn('Cloudinary down, sending base64');}
      const socket=getSocket();if(!socket){toast.error('Not connected',{id:tid});return;}
      // Calculate actual duration from recorded blob
      let voiceDuration = secs || 0;
      try {
        const tmpAudio = new Audio(url);
        await new Promise(res => { tmpAudio.onloadedmetadata = () => { if(isFinite(tmpAudio.duration)) voiceDuration = Math.round(tmpAudio.duration); res(); }; tmpAudio.onerror = res; setTimeout(res, 2000); });
      } catch {}
      const vPayload={senderId:user?._id,senderRole:'parent',parentId:user?._id,content:'',messageType:'voice',mediaData:url,mediaMimeType:recMimeRef.current,duration:voiceDuration,autoDeleteSeconds:autoDeleteSecs>0?autoDeleteSecs:undefined};
      if(view==='group'&&selGroup){
        socket.emit('send_group_message',{...vPayload,groupId:selGroup._id,senderId:user?._id,senderRole:'parent'});
        const vO={_id:'tmp_'+Date.now(),sender:{_id:user?._id,name:user?.name,profilePic:user?.profilePic},senderRole:'parent',content:'',messageType:'voice',mediaData:url,createdAt:new Date().toISOString()};
        setGroupMsgs(p=>[...p,vO]);
        toast.success('Voice note sent!',{id:tid});
      } else {
        socket.emit('send_message',vPayload);
        const vOptimistic={_id:'tmp_'+Date.now(),sender:{_id:user?._id,name:user?.name,profilePic:user?.profilePic},senderRole:'parent',parentId:user?._id,content:'',messageType:'voice',mediaData:url,createdAt:new Date().toISOString(),isRead:false};
        setMessages(p=>[...p,vOptimistic]);
        toast.success('Voice note sent!',{id:tid});
      }
    }catch(e){console.error('Voice send error:',e); toast.error('Voice failed: '+( e?.response?.data?.error||e?.message||'Check connection'),{id:tid});}
  };

  const cancelRec=()=>{
    if(!recMR.current)return;
    recMR.current.stream.getTracks().forEach(t=>t.stop());
    try{recMR.current.stop();}catch{}
    recMR.current=null;recChunksRef.current=[];setRecording(false);clearTimeout(recAutoTimer.current);toast('Recording cancelled');
  };

  const doDelete=async(msgId,forAll,isGrp=false)=>{
    try{await api.delete(`/chat/${msgId}`,{data:{forEveryone:forAll}});
    if(forAll){if(isGrp)setGroupMsgs(p=>p.map(m=>m._id===msgId?{...m,deletedForEveryone:true}:m));else setMessages(p=>p.map(m=>m._id===msgId?{...m,deletedForEveryone:true}:m));}
    else{if(isGrp)setGroupMsgs(p=>p.filter(m=>m._id!==msgId));else setMessages(p=>p.filter(m=>m._id!==msgId));}
    setMenu(null);}catch{toast.error('Delete failed');}
  };
  const doReact=async(msgId,emoji)=>{try{await api.put(`/chat/${msgId}/react`,{emoji});setMenu(null);}catch{toast.error('React failed');}};
  const joinGroup=async(gid)=>{try{await api.put(`/groups/${gid}/join`);await loadGroups();toast.success('Joined!');}catch(e){toast.error(e.response?.data?.error||'Failed');}};
  const groupMsgsByDay=(arr)=>arr.reduce((acc,m)=>{const day=fmtDay(m.createdAt);if(!acc.length||acc[acc.length-1].day!==day)acc.push({day,msgs:[m]});else acc[acc.length-1].msgs.push(m);return acc;},[]);

  const joined=groups.filter(g=>g.members?.some(m=>(m._id||m)===user?._id));
  const avail=groups.filter(g=>!g.members?.some(m=>(m._id||m)===user?._id));
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

  // ── Disappearing message timer options ─────────────────────
  const timerOptions=[
    {label:'Off',secs:0},
    {label:'30s',secs:30},
    {label:'1m',secs:60},
    {label:'5m',secs:300},
    {label:'1h',secs:3600},
    {label:'24h',secs:86400},
    {label:'7d',secs:604800},
  ];

  const InputBar=({isGrp=false})=>{
    const val=isGrp?grpInput:input;
    const onChange=isGrp?e=>setGrpInput(e.target.value):handleInput;
    const onSend=isGrp?sendGrpText:sendText;
    const fRef=isGrp?grpFileRef:fileRef;
    return recording?<VoiceRecBar onCancel={cancelRec} onSend={stopRecAndSend}/>:(
      <>
      {/* Disappearing message timer */}
      {!isGrp && autoDeleteSecs > 0 && (
        <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',background:'rgba(251,146,60,0.1)',borderTop:'1px solid rgba(251,146,60,0.2)',flexShrink:0}}>
          <span style={{fontSize:11,color:'#FB923C'}}>⏱ Messages disappear after {timerOptions.find(t=>t.secs===autoDeleteSecs)?.label}</span>
          <button onClick={()=>setAutoDeleteSecs(0)} style={{background:'none',border:'none',color:'#FB923C',fontSize:13,cursor:'pointer',padding:0}}>✕</button>
        </div>
      )}
      <div style={inputBarStyle}>
        <input ref={fRef} type="file" accept="image/*,video/*" style={{display:'none'}} onChange={e=>{sendMedia(e.target.files[0],isGrp);e.target.value='';}}/>
        <button onClick={()=>!uploading&&fRef.current?.click()} style={{...iconBtnStyle,opacity:uploading?0.5:1}}><ClipIcon/></button>
        <textarea value={val} onChange={onChange}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSend();}}}
          placeholder="Message" rows={1} style={textareaStyle}/>
        {val.trim()
          ?<button onClick={onSend} style={sendBtnStyle}><SendIcon/></button>
          :<button style={sendBtnStyle} onMouseDown={e=>{e.preventDefault();startRec();}} onTouchStart={e=>{e.preventDefault();startRec();}}><MicIcon/></button>}
      </div>
      </>
    );
  };

  if(activeCall) return null;
  if(incomingCall) return null;

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

  const isMember=selGroup?.members?.some(m=>(m._id||m)===user?._id);
  if(view==='group'&&selGroup){
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
            <div style={{fontSize:56}}>👥</div><div style={{fontSize:18,fontWeight:700}}>{selGroup.name}</div>
            <div style={{fontSize:13,color:'#8696A0',maxWidth:260}}>{selGroup.description||'Join to participate'}</div>
            <button onClick={()=>joinGroup(selGroup._id)} style={{padding:'14px 44px',background:'#00A884',border:'none',borderRadius:24,color:'#fff',fontWeight:700,fontSize:15,cursor:'pointer'}}>Join Group</button>
          </div>
          :<>
            <div style={{flex:1,overflowY:'auto',padding:'6px 0 4px'}}>
              {groupMsgs.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#8696A0'}}><div style={{fontSize:48,marginBottom:10}}>👥</div><div>No messages yet</div></div>}
              {groupMsgsByDay(groupMsgs).map((grp,gi)=>(
                <div key={gi}>
                  <div style={{textAlign:'center',margin:'8px 0'}}><span style={{background:'#1F2C34',padding:'4px 12px',borderRadius:8,fontSize:11,color:'#8696A0',border:'0.5px solid rgba(255,255,255,0.06)'}}>{grp.day}</span></div>
                  {grp.msgs.map(m=>{const isMe=(m.sender?._id||m.sender)===user?._id;return<Bubble key={m._id} msg={m} isMe={isMe} onLongPress={msg=>setMenu({msg,isGrp:true})}/>;})}</div>))}
              <div ref={bottomRef}/>
            </div>
                        {recording?<VoiceRecBar onCancel={cancelRec} onSend={stopRecAndSend}/>:(
            <div style={inputBarStyle}>
              <input ref={grpFileRef} type="file" accept="image/*,video/*" style={{display:'none'}} onChange={e=>{sendMedia(e.target.files[0],true);e.target.value='';}}/>
              <button onClick={()=>!uploading&&grpFileRef.current?.click()} style={{...iconBtnStyle,opacity:uploading?0.5:1}}><ClipIcon/></button>
              <textarea value={grpInput} onChange={e=>setGrpInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendGrpText();}}} placeholder="Message" rows={1} style={textareaStyle}/>
              {grpInput.trim()?<button onClick={sendGrpText} style={sendBtnStyle}><SendIcon/></button>:<button style={sendBtnStyle} onMouseDown={e=>{e.preventDefault();startRec();}} onTouchStart={e=>{e.preventDefault();startRec();}}><MicIcon/></button>}
            </div>)}
          </>}
      </div>);
  }

  if(view==='chat')return(
    <div style={root}>
      <CtxMenu/>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'#1F2C34',flexShrink:0,borderBottom:'0.5px solid rgba(255,255,255,0.06)'}}>
        <button onClick={()=>setView('list')} style={{background:'none',border:'none',color:'#8696A0',fontSize:22,cursor:'pointer',padding:'0 8px 0 0'}}>←</button>
        <div style={{position:'relative',flexShrink:0}}>
          <div style={{...av(38),background:'linear-gradient(135deg,#9B1826,#C02035)'}}><span style={{fontSize:16}}>🏫</span></div>
          {adminOnline&&<div style={{position:'absolute',bottom:0,right:0,width:11,height:11,borderRadius:'50%',background:'#25D366',border:'2px solid #1F2C34'}}/>}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>School Admin</div>
          {adminTyping?<div style={{fontSize:12,color:'#00A884'}}>typing…</div>:adminOnline?<div style={{fontSize:12,color:'#25D366'}}>Online</div>:<div style={{fontSize:12,color:'#8696A0'}}>Peace Mindset Private School</div>}
        </div>
        <button onClick={()=>adminUserId?setActiveCall({toUserId:adminUserId,toName:'Peace Mindset School'}):toast.error('School is offline')} title="Voice Call"
          style={{width:38,height:38,borderRadius:'50%',background:'rgba(0,168,132,0.15)',border:'1px solid rgba(0,168,132,0.3)',color:'#00A884',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          📞
        </button>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'6px 0 4px',WebkitOverflowScrolling:'touch'}}>
        {messages.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#8696A0'}}><div style={{fontSize:48,marginBottom:10}}>💬</div><div>Send a message to the school admin</div></div>}
        {groupMsgsByDay(messages).map((grp,gi)=>(
          <div key={gi}>
            <div style={{textAlign:'center',margin:'8px 0'}}><span style={{background:'#1F2C34',padding:'4px 12px',borderRadius:8,fontSize:11,color:'#8696A0',border:'0.5px solid rgba(255,255,255,0.06)'}}>{grp.day}</span></div>
            {grp.msgs.map(m=>{const isMe=m.senderRole==='parent';return<Bubble key={m._id} msg={m} isMe={isMe} onLongPress={msg=>setMenu({msg,isGrp:false})}/>;})}</div>))}
        <div ref={bottomRef}/>
      </div>
              {recording?<VoiceRecBar onCancel={cancelRec} onSend={stopRecAndSend}/>:(
        <div style={inputBarStyle}>
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{display:'none'}} onChange={e=>{sendMedia(e.target.files[0],false);e.target.value='';}}/>
          <button onClick={()=>!uploading&&fileRef.current?.click()} style={{...iconBtnStyle,opacity:uploading?0.5:1}}><ClipIcon/></button>
          <textarea value={input} onChange={handleInput} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();}}} placeholder="Message" rows={1} style={textareaStyle}/>
          {input.trim()?<button onClick={sendText} style={sendBtnStyle}><SendIcon/></button>:<button style={sendBtnStyle} onMouseDown={e=>{e.preventDefault();startRec();}} onTouchStart={e=>{e.preventDefault();startRec();}}><MicIcon/></button>}
        </div>)}
    </div>);

  return(
    <div style={root}>
      {/* Full-screen profile picture viewer */}
      {viewPic && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}} onClick={()=>setViewPic(null)}>
          <img src={viewPic} style={{maxWidth:'92vw',maxHeight:'82vh',objectFit:'contain',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.8)'}} alt="Profile"/>
          <button onClick={()=>setViewPic(null)} style={{padding:'10px 32px',background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:24,color:'#fff',fontSize:14,cursor:'pointer'}}>✕ Close</button>
        </div>
      )}
      {showCreate&&<CreateStory onClose={()=>setShowCreate(false)} onPosted={()=>{setShowCreate(false);loadStories();}}/>}
      {storyViewer!=null&&<StoryViewer groups={allSG} groupIdx={storyViewer} onClose={()=>setStoryViewer(null)} currentUserId={user?._id}/>}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#1F2C34',flexShrink:0}}>
        <span style={{fontSize:20,fontWeight:700}}>Chats</span>
        <button onClick={()=>setView('updates')} style={{background:'none',border:'none',color:'#8696A0',fontSize:22,cursor:'pointer'}}>🔵</button>
      </div>
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
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',borderBottom:'0.5px solid rgba(255,255,255,0.04)'}} onClick={()=>setView('chat')}>
          <div style={{position:'relative',flexShrink:0}}>
            <div style={{...av(52),background:'linear-gradient(135deg,#9B1826,#C02035)'}}><span style={{fontSize:22}}>🏫</span></div>
            {adminOnline&&<div style={{position:'absolute',bottom:2,right:2,width:12,height:12,borderRadius:'50%',background:'#25D366',border:'2px solid #111B21'}}/>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
              <span style={{fontSize:15,fontWeight:600}}>School Admin</span>
              {lastMsg&&<span style={{fontSize:12,color:unread?'#00A884':'#8696A0',whiteSpace:'nowrap'}}>{fmtTime(lastMsg.createdAt)}</span>}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,color:'#8696A0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,marginRight:8}}>
                {adminTyping?<span style={{color:'#00A884'}}>typing…</span>:lastMsg?(lastMsg.messageType==='voice'?'🎤 Voice message':lastMsg.messageType==='image'?'📷 Photo':lastMsg.messageType==='video'?'🎬 Video':(lastMsg.content||'')):'Tap to message the school'}
              </span>
              {unread>0&&<span style={{background:'#00A884',color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:11,fontWeight:700,flexShrink:0}}>{unread}</span>}
            </div>
          </div>
        </div>
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
