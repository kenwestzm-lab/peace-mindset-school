import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../utils/socket';
import toast from 'react-hot-toast';

// Show browser notification for incoming call
async function showCallNotification(fromName) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    if (Notification.permission === 'granted') {
      const n = new Notification('📞 Incoming Call', {
        body: fromName + ' is calling you...',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'incoming-call',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        silent: false,
      });
      n.onclick = () => { window.focus(); n.close(); };
      // Auto close after 35s
      setTimeout(() => n.close(), 35000);
      return n;
    }
  } catch(e) { console.warn('Notification error:', e); }
  return null;
}

const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 10,
};

const AUDIO_C = { audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true, sampleRate:48000 }, video:false };

// Get mic with retry - releases any locked streams first
async function getMic() {
  // First stop any existing streams that might be locking the mic
  try {
    const existing = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    existing.getTracks().forEach(t => t.stop());
  } catch {}
  await new Promise(r => setTimeout(r, 300));
  return navigator.mediaDevices.getUserMedia(AUDIO_C);
}
const VIDEO_C = { audio: { echoCancellation:true, noiseSuppression:true }, video: { width:{ideal:1280}, height:{ideal:720}, facingMode:'user' } };

function makeRingtone() {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    let stopped = false;
    const play = () => {
      if(stopped) return;
      [[523,0],[587,0.15],[659,0.3],[698,0.45]].forEach(([f,t]) => {
        const o=ctx.createOscillator(), g=ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value=f; o.type='sine';
        g.gain.setValueAtTime(0, ctx.currentTime+t);
        g.gain.linearRampToValueAtTime(0.3, ctx.currentTime+t+0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+t+0.4);
        o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+0.4);
      });
      setTimeout(play, 2200);
    };
    play();
    return { stop:()=>{ stopped=true; setTimeout(()=>{ try{ctx.close();}catch{} },600); } };
  } catch { return {stop:()=>{}}; }
}

const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

// WhatsApp-style icons
const Ic = {
  Mute: ({on}) => <svg viewBox="0 0 24 24" width="24" height="24" fill={on?'#128C7E':'#fff'}>
    {on ? <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
    : <><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></>}
  </svg>,
  Speaker: ({on}) => <svg viewBox="0 0 24 24" width="24" height="24" fill={on?'#128C7E':'#fff'}>
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>,
  Video: ({on}) => <svg viewBox="0 0 24 24" width="24" height="24" fill={on?'#128C7E':'#fff'}>
    {on ? <path d="M21 6.5l-4-4-5.66 5.66 5.66 5.66L21 9.5v-3zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2zM15 16H5V8h1.73l8 8H15v.01z"/>
    : <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>}
  </svg>,
  End: () => <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" transform="rotate(135 12 12)"/>
  </svg>,
  Accept: () => <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff">
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
  </svg>,
};

function Avatar({name, pic, size=110}) {
  return (
    <div style={{width:size,height:size,borderRadius:'50%',overflow:'hidden',background:'linear-gradient(135deg,#25D366,#128C7E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.4,fontWeight:700,color:'#fff',flexShrink:0}}>
      {pic ? <img src={pic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : name?.[0]?.toUpperCase()||'?'}
    </div>
  );
}

function CtrlBtn({icon, label, active, onClick, disabled}) {
  return (
    <div style={{textAlign:'center',cursor:disabled?'not-allowed':'pointer'}} onClick={disabled?null:onClick}>
      <div style={{
        width:56,height:56,borderRadius:'50%',
        background: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
        display:'flex',alignItems:'center',justifyContent:'center',
        margin:'0 auto 6px',
        border: active ? '2px solid #25D366' : '1px solid rgba(255,255,255,0.2)',
        opacity: disabled ? 0.4 : 1,
        backdropFilter:'blur(8px)',
        transition:'all 0.15s'
      }}>
        {icon}
      </div>
      <div style={{color:'rgba(255,255,255,0.75)',fontSize:11,fontWeight:500}}>{label}</div>
    </div>
  );
}

function CallUI({name, pic, status, duration, isRinging, isConnected,
  isMuted, isSpeaker, isVideo, onHangup, onAccept, onReject,
  onMute, onSpeaker, onVideo, remoteAudio, localVideo, remoteVideo}) {

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:9999,
      background: isVideo ? '#000' : 'linear-gradient(180deg,#0a1628 0%,#0d2137 50%,#0a1628 100%)',
      display:'flex',flexDirection:'column',
      fontFamily:"'Segoe UI',sans-serif",
      userSelect:'none'
    }}>
      {/* Remote video fullscreen */}
      {isVideo && <video ref={remoteVideo} autoPlay playsInline style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>}

      {/* Local video PiP */}
      {isVideo && <video ref={localVideo} autoPlay playsInline muted style={{position:'absolute',top:16,right:12,width:90,height:130,objectFit:'cover',borderRadius:10,border:'2px solid rgba(255,255,255,0.3)',zIndex:2}}/>}

      <audio ref={remoteAudio} autoPlay playsInline style={{display:'none'}}/>

      {/* Dark overlay for readability */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,transparent 35%,transparent 55%,rgba(0,0,0,0.75) 100%)',zIndex:1,pointerEvents:'none'}}/>

      {/* TOP — name + status */}
      <div style={{position:'relative',zIndex:3,paddingTop:56,paddingBottom:8,textAlign:'center'}}>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',letterSpacing:1.5,marginBottom:4,textTransform:'uppercase'}}>Peace Mindset School</div>
        <div style={{fontSize:24,fontWeight:700,color:'#fff',marginBottom:6}}>{name}</div>
        <div style={{fontSize:14,color: isConnected ? '#25D366' : 'rgba(255,255,255,0.6)',fontWeight:500}}>
          {isConnected ? `🟢  ${fmt(duration)}` : status}
        </div>
      </div>

      {/* CENTER — avatar with ripple */}
      {!isVideo && (
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:3}}>
          <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {!isConnected && [1,2,3].map(i=>(
              <div key={i} style={{
                position:'absolute',
                width:110+i*44,height:110+i*44,
                borderRadius:'50%',
                border:'1px solid rgba(37,211,102,0.25)',
                animation:`rpl ${1.6+i*0.4}s ease-out infinite ${i*0.35}s`
              }}/>
            ))}
            <Avatar name={name} pic={pic} size={110}/>
          </div>
        </div>
      )}
      {isVideo && <div style={{flex:1}}/>}

      {/* BOTTOM — controls */}
      <div style={{position:'relative',zIndex:3,paddingBottom:48}}>
        {isRinging ? (
          <div style={{display:'flex',justifyContent:'center',gap:72,padding:'0 24px 8px'}}>
            <div style={{textAlign:'center'}}>
              <button onClick={onReject} style={{width:68,height:68,borderRadius:'50%',background:'#E53935',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px',boxShadow:'0 6px 24px rgba(229,57,53,0.5)'}}>
                <Ic.End/>
              </button>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:13}}>Decline</div>
            </div>
            <div style={{textAlign:'center'}}>
              <button onClick={onAccept} style={{width:68,height:68,borderRadius:'50%',background:'#25D366',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px',boxShadow:'0 6px 24px rgba(37,211,102,0.55)',animation:'pulse 1.3s ease-in-out infinite'}}>
                <Ic.Accept/>
              </button>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:13}}>Accept</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{display:'flex',justifyContent:'space-around',padding:'0 32px',marginBottom:32}}>
              <CtrlBtn icon={<Ic.Mute on={isMuted}/>} label={isMuted?'Unmute':'Mute'} active={isMuted} onClick={onMute}/>
              <CtrlBtn icon={<Ic.Speaker on={isSpeaker}/>} label={isSpeaker?'Earpiece':'Speaker'} active={isSpeaker} onClick={onSpeaker}/>
              <CtrlBtn icon={<Ic.Video on={isVideo}/>} label={isVideo?'Stop Video':'Video'} active={isVideo} onClick={onVideo}/>
            </div>
            <div style={{display:'flex',justifyContent:'center'}}>
              <button onClick={onHangup} style={{width:68,height:68,borderRadius:'50%',background:'linear-gradient(135deg,#E53935,#C62828)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 28px rgba(229,57,53,0.5)'}}>
                <Ic.End/>
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes rpl{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.6);opacity:0}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
      `}</style>
    </div>
  );
}

export function OutgoingCall({toUserId, toName, toProfilePic, myName, myUserId, onEnd}) {
  const [status, setStatus] = useState('Calling...');
  const [duration, setDuration] = useState(0);
  const [connected, setConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const videoStreamRef = useRef(null);
  const remoteAudio = useRef(null);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const timerRef = useRef(null);
  const peerSocket = useRef(null);
  const pending = useRef([]);
  const ended = useRef(false);

  const end = (skipEmit=false) => {
    if(ended.current) return; ended.current=true;
    clearInterval(timerRef.current);
    try{localStreamRef.current?.getTracks().forEach(t=>t.stop());}catch{}
    try{videoStreamRef.current?.getTracks().forEach(t=>t.stop());}catch{}
    try{pcRef.current?.close();}catch{}
    if(!skipEmit && peerSocket.current) getSocket()?.emit('call_end',{toSocketId:peerSocket.current});
  };

  const hangup = () => { end(); setStatus('Call ended'); setTimeout(onEnd,800); };

  const toggleMute = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if(t){t.enabled=!t.enabled; setIsMuted(!t.enabled);}
  };

  const toggleSpeaker = () => {
    setIsSpeaker(s=>{
      const next=!s;
      const a=remoteAudio.current;
      if(a){if(a.setSinkId) a.setSinkId(next?'speaker':'default').catch(()=>{}); a.volume=next?1:0.85;}
      toast.success(next?'🔊 Speaker':'📱 Earpiece');
      return next;
    });
  };

  const toggleVideo = async () => {
    if(!isVideo){
      try{
        const vs = await navigator.mediaDevices.getUserMedia(VIDEO_C);
        videoStreamRef.current=vs;
        const vt=vs.getVideoTracks()[0];
        if(localVideo.current){localVideo.current.srcObject=vs; localVideo.current.play().catch(()=>{});}
        const sender=pcRef.current?.getSenders().find(s=>s.track?.kind==='video');
        if(sender) sender.replaceTrack(vt);
        else pcRef.current?.addTrack(vt,vs);
        setIsVideo(true);
      }catch{toast.error('Camera unavailable');}
    }else{
      videoStreamRef.current?.getTracks().forEach(t=>t.stop());
      if(localVideo.current) localVideo.current.srcObject=null;
      setIsVideo(false);
    }
  };

  useEffect(()=>{
    const s=getSocket();
    if(!s){toast.error('Not connected');onEnd();return;}
    (async()=>{
      try{
        const stream=await getMic();
        localStreamRef.current=stream;
        const pc=new RTCPeerConnection(ICE);
        pcRef.current=pc;
        stream.getTracks().forEach(t=>pc.addTrack(t,stream));

        pc.ontrack=e=>{
          if(!e.streams[0]) return;
          if(remoteAudio.current){remoteAudio.current.srcObject=e.streams[0];remoteAudio.current.play().catch(()=>{});}
          if(remoteVideo.current&&e.track.kind==='video') remoteVideo.current.srcObject=e.streams[0];
        };

        pc.onicecandidate=e=>{
          if(!e.candidate) return;
          if(peerSocket.current) s.emit('call_ice',{toSocketId:peerSocket.current,candidate:e.candidate});
          else pending.current.push(e.candidate);
        };

        pc.onconnectionstatechange=()=>{
          if(pc.connectionState==='connected'){setConnected(true);setStatus('Connected');clearInterval(timerRef.current);timerRef.current=setInterval(()=>setDuration(d=>d+1),1000);}
          if(pc.connectionState==='failed'){toast.error('Connection failed');pc.restartIce();}
          if(pc.connectionState==='disconnected') setTimeout(()=>{if(pc.connectionState==='disconnected')hangup();},5000);
        };
        pc.oniceconnectionstatechange=()=>{if(pc.iceConnectionState==='failed')pc.restartIce();};

        const offer=await pc.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:true});
        await pc.setLocalDescription(offer);
        s.emit('call_request',{toUserId,fromName:myName,fromUserId:myUserId,offer});

        s.on('call_answered',async({answer,fromSocketId})=>{
          peerSocket.current=fromSocketId;
          try{await pc.setRemoteDescription(new RTCSessionDescription(answer));pending.current.forEach(c=>s.emit('call_ice',{toSocketId:fromSocketId,candidate:c}));pending.current=[];}catch{}
        });
        s.on('call_ice',async({candidate})=>{try{if(pc.remoteDescription)await pc.addIceCandidate(new RTCIceCandidate(candidate));else pending.current.push(candidate);}catch{}});
        s.on('call_rejected',()=>{toast.error(toName+' declined');end(true);setStatus('Declined');setTimeout(onEnd,1200);});
        s.on('call_ended',()=>{end(true);setStatus('Call ended');setTimeout(onEnd,800);});
        s.on('call_unavailable',()=>{toast.error(toName+' is currently offline');end(true);setStatus('User offline');setTimeout(onEnd,2000);});
        s.on('call_no_answer',()=>{toast.error('No answer');end(true);setStatus('No answer');setTimeout(onEnd,1500);});
      }catch(err){toast.error('Mic error: '+err.message);onEnd();}
    })();
    return()=>{
      const s=getSocket();
      s?.off('call_answered');s?.off('call_ice');s?.off('call_rejected');
      s?.off('call_ended');s?.off('call_unavailable');s?.off('call_no_answer');
      end();
    };
  },[]);

  return <CallUI name={toName} pic={toProfilePic} status={status} duration={duration}
    isConnected={connected} isRinging={false} isMuted={isMuted} isSpeaker={isSpeaker} isVideo={isVideo}
    onHangup={hangup} onMute={toggleMute} onSpeaker={toggleSpeaker} onVideo={toggleVideo}
    remoteAudio={remoteAudio} localVideo={localVideo} remoteVideo={remoteVideo}/>;
}

export function IncomingCall({fromSocketId, fromName, fromProfilePic, offer, onEnd}) {
  const [status, setStatus] = useState('Incoming voice call');
  const [duration, setDuration] = useState(0);
  const [connected, setConnected] = useState(false);
  const [ringing, setRinging] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const videoStreamRef = useRef(null);
  const remoteAudio = useRef(null);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const timerRef = useRef(null);
  const ringRef = useRef(null);
  const ended = useRef(false);
  const pending = useRef([]);

  const end = (skipEmit=false) => {
    if(ended.current) return; ended.current=true;
    clearInterval(timerRef.current);
    try{ringRef.current?.stop();ringRef.current?._notif?.close();}catch{}
    try{localStreamRef.current?.getTracks().forEach(t=>t.stop());}catch{}
    try{videoStreamRef.current?.getTracks().forEach(t=>t.stop());}catch{}
    try{pcRef.current?.close();}catch{}
    if(!skipEmit) getSocket()?.emit('call_end',{toSocketId:fromSocketId});
  };

  const reject = () => { getSocket()?.emit('call_reject',{toSocketId:fromSocketId});end(true);setTimeout(onEnd,500); };
  const hangup = () => { end();setStatus('Call ended');setTimeout(onEnd,800); };

  const toggleMute = () => {
    const t=localStreamRef.current?.getAudioTracks()[0];
    if(t){t.enabled=!t.enabled;setIsMuted(!t.enabled);}
  };

  const toggleSpeaker = () => {
    setIsSpeaker(s=>{
      const next=!s;
      const a=remoteAudio.current;
      if(a){if(a.setSinkId)a.setSinkId(next?'speaker':'default').catch(()=>{});a.volume=next?1:0.85;}
      toast.success(next?'🔊 Speaker':'📱 Earpiece');
      return next;
    });
  };

  const toggleVideo = async () => {
    if(!isVideo){
      try{
        const vs=await navigator.mediaDevices.getUserMedia(VIDEO_C);
        videoStreamRef.current=vs;
        const vt=vs.getVideoTracks()[0];
        if(localVideo.current){localVideo.current.srcObject=vs;localVideo.current.play().catch(()=>{});}
        const sender=pcRef.current?.getSenders().find(s=>s.track?.kind==='video');
        if(sender)sender.replaceTrack(vt);else pcRef.current?.addTrack(vt,vs);
        setIsVideo(true);
      }catch{toast.error('Camera unavailable');}
    }else{
      videoStreamRef.current?.getTracks().forEach(t=>t.stop());
      if(localVideo.current)localVideo.current.srcObject=null;
      setIsVideo(false);
    }
  };

  const accept = async () => {
    try{ringRef.current?.stop();ringRef.current?._notif?.close();}catch{}
    setRinging(false); setStatus('Connecting...');
    const s=getSocket();
    try{
      const stream=await getMic();
      localStreamRef.current=stream;
      const pc=new RTCPeerConnection(ICE);
      pcRef.current=pc;
      stream.getTracks().forEach(t=>pc.addTrack(t,stream));

      pc.ontrack=e=>{
        if(!e.streams[0])return;
        if(remoteAudio.current){remoteAudio.current.srcObject=e.streams[0];remoteAudio.current.play().catch(()=>{});}
        if(remoteVideo.current&&e.track.kind==='video')remoteVideo.current.srcObject=e.streams[0];
      };

      pc.onicecandidate=e=>{if(e.candidate)s?.emit('call_ice',{toSocketId:fromSocketId,candidate:e.candidate});};

      pc.onconnectionstatechange=()=>{
        if(pc.connectionState==='connected'){setConnected(true);setStatus('Connected');clearInterval(timerRef.current);timerRef.current=setInterval(()=>setDuration(d=>d+1),1000);}
        if(pc.connectionState==='failed'){toast.error('Connection failed');pc.restartIce();}
      };
      pc.oniceconnectionstatechange=()=>{if(pc.iceConnectionState==='failed')pc.restartIce();};

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      for(const c of pending.current){try{await pc.addIceCandidate(new RTCIceCandidate(c));}catch{}}
      pending.current=[];
      const answer=await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s?.emit('call_answer',{toSocketId:fromSocketId,answer});
    }catch(err){toast.error('Mic error: '+err.message);reject();}
  };

  useEffect(()=>{
    ringRef.current=makeRingtone();
    // Show push notification
    showCallNotification(fromName).then(n => { if(n) ringRef.current._notif=n; });
    const s=getSocket();
    const onIce=async({candidate})=>{
      try{if(pcRef.current?.remoteDescription)await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));else pending.current.push(candidate);}catch{}
    };
    const onEnded=()=>{end(true);setStatus('Call ended');setTimeout(onEnd,800);};
    s?.on('call_ice',onIce);
    s?.on('call_ended',onEnded);
    return()=>{s?.off('call_ice',onIce);s?.off('call_ended',onEnded);end();};
  },[]);

  return <CallUI name={fromName} pic={fromProfilePic} status={status} duration={duration}
    isConnected={connected} isRinging={ringing} isMuted={isMuted} isSpeaker={isSpeaker} isVideo={isVideo}
    onHangup={hangup} onAccept={accept} onReject={reject}
    onMute={toggleMute} onSpeaker={toggleSpeaker} onVideo={toggleVideo}
    remoteAudio={remoteAudio} localVideo={localVideo} remoteVideo={remoteVideo}/>;
}
