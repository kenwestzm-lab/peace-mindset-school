import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../utils/socket';
import toast from 'react-hot-toast';

const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceCandidatePoolSize: 10,
};

const AUDIO = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 }, video: false };
const VIDEO = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 }, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } };

// ── Gold SVG Icons ────────────────────────────────────────────────────────────
const IconMic = ({ off }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill={off ? '#111' : '#D4AF37'}>
    {off
      ? <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
      : <><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></>
    }
  </svg>
);

const IconSpeaker = ({ on }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill={on ? '#111' : '#D4AF37'}>
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>
);

const IconVideo = ({ off }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill={off ? '#111' : '#D4AF37'}>
    {off
      ? <path d="M21 6.5l-4-4-5.66 5.66 5.66 5.66L21 9.5v-3zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2zM15 16H5V8h1.73l8 8H15v.01z"/>
      : <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    }
  </svg>
);

const IconScreen = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="#D4AF37">
    <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 16V6h16v10H4z"/>
    <path d="M9.5 14.5l3-3.8 2.3 2.8 1.7-2 2.5 3z" opacity=".5"/>
  </svg>
);

const IconHangup = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff">
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
  </svg>
);

const IconAccept = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff">
    <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
  </svg>
);

// ── Ringtone generator ────────────────────────────────────────────────────────
function makeRingtone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let stopped = false;
    const play = () => {
      if (stopped) return;
      const notes = [523, 587, 659, 698];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f; o.type = 'sine';
        const t = ctx.currentTime + i * 0.12;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.25, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.start(t); o.stop(t + 0.35);
      });
      setTimeout(play, 2000);
    };
    play();
    return { stop: () => { stopped = true; setTimeout(() => { try { ctx.close(); } catch {} }, 500); } };
  } catch { return { stop: () => {} }; }
}

// ── Main Call Screen ──────────────────────────────────────────────────────────
function CallScreen({
  name, profilePic, statusLine, duration,
  onHangup, onMute, onSpeaker, onVideo, onScreenShare,
  isMuted, isSpeaker, isVideoOn, isSharing,
  isConnected, isRinging, onAccept, onReject,
  remoteAudioRef, localVideoRef, remoteVideoRef,
}) {
  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const hasVideo = isVideoOn || isSharing;

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background: hasVideo ? '#000' : 'linear-gradient(180deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)',
      display:'flex', flexDirection:'column', alignItems:'center',
      fontFamily:"'Segoe UI',system-ui,sans-serif", overflow:'hidden'
    }}>
      {/* Remote video */}
      {hasVideo && (
        <video ref={remoteVideoRef} autoPlay playsInline
          style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',zIndex:0}}/>
      )}

      {/* Local video (PiP) */}
      {isVideoOn && (
        <video ref={localVideoRef} autoPlay playsInline muted
          style={{position:'absolute',top:20,right:16,width:100,height:140,objectFit:'cover',borderRadius:12,border:'2px solid rgba(212,175,55,0.6)',zIndex:2}}/>
      )}

      <audio ref={remoteAudioRef} autoPlay playsInline style={{display:'none'}}/>

      {/* Overlay gradient for text readability */}
      <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.6) 0%,transparent 40%,transparent 60%,rgba(0,0,0,0.8) 100%)',zIndex:1,pointerEvents:'none'}}/>

      {/* Top bar */}
      <div style={{width:'100%',padding:'52px 20px 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,position:'relative',zIndex:3}}>
        <div style={{fontSize:13,color:'rgba(212,175,55,0.8)',fontWeight:600,letterSpacing:1}}>PEACE MINDSET SCHOOL</div>
        {isConnected && <div style={{fontSize:12,color:'rgba(212,175,55,0.8)',display:'flex',alignItems:'center',gap:4}}>
          <span style={{fontSize:10}}>🔒</span> HD Encrypted
        </div>}
      </div>

      {/* Avatar + info */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,position:'relative',zIndex:3}}>
        {!hasVideo && (
          <>
            {/* Pulsing rings */}
            {!isConnected && (
              <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:8}}>
                {[1,2,3].map(i=>(
                  <div key={i} style={{
                    position:'absolute',
                    width:110+i*40, height:110+i*40,
                    borderRadius:'50%',
                    border:'1px solid rgba(212,175,55,0.3)',
                    animation:`ripple ${1.5+i*0.4}s ease-out infinite ${i*0.3}s`
                  }}/>
                ))}
                <div style={{
                  width:110, height:110, borderRadius:'50%',
                  background: profilePic ? 'transparent' : 'linear-gradient(135deg,#D4AF37,#B8860B)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:44, fontWeight:700, color:'#fff',
                  border:'3px solid rgba(212,175,55,0.5)',
                  overflow:'hidden', flexShrink:0, boxShadow:'0 0 30px rgba(212,175,55,0.3)'
                }}>
                  {profilePic
                    ? <img src={profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                    : name?.[0]?.toUpperCase()
                  }
                </div>
              </div>
            )}
            <div style={{textAlign:'center',marginTop: isConnected ? 0 : 8}}>
              <div style={{fontSize:28,fontWeight:700,color:'#fff',letterSpacing:0.5,textShadow:'0 2px 8px rgba(0,0,0,0.5)'}}>{name}</div>
              <div style={{fontSize:15,color:'rgba(212,175,55,0.9)',marginTop:6,fontWeight:500}}>
                {isConnected ? `⏱ ${fmt(duration)}` : statusLine}
              </div>
            </div>
          </>
        )}
        {hasVideo && isConnected && (
          <div style={{textAlign:'center',marginTop:80}}>
            <div style={{fontSize:20,fontWeight:700,color:'#fff',textShadow:'0 2px 8px rgba(0,0,0,0.8)'}}>{name}</div>
            <div style={{fontSize:14,color:'rgba(212,175,55,0.9)'}}>{fmt(duration)}</div>
          </div>
        )}
      </div>

      {/* Buttons */}
      {isRinging ? (
        <div style={{paddingBottom:60,flexShrink:0,position:'relative',zIndex:3}}>
          <div style={{textAlign:'center',color:'rgba(255,255,255,0.7)',fontSize:14,marginBottom:40,fontStyle:'italic'}}>
            Incoming voice call...
          </div>
          <div style={{display:'flex',gap:64,justifyContent:'center'}}>
            <div style={{textAlign:'center'}}>
              <button onClick={onReject} style={{
                width:70,height:70,borderRadius:'50%',background:'#E53935',border:'none',
                cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                margin:'0 auto 8px',boxShadow:'0 6px 24px rgba(229,57,53,0.6)'
              }}>
                <IconHangup/>
              </button>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:13}}>Decline</div>
            </div>
            <div style={{textAlign:'center'}}>
              <button onClick={onAccept} style={{
                width:70,height:70,borderRadius:'50%',background:'#25D366',border:'none',
                cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                margin:'0 auto 8px',boxShadow:'0 6px 24px rgba(37,211,102,0.6)',
                animation:'pulse 1.2s ease-in-out infinite'
              }}>
                <IconAccept/>
              </button>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:13}}>Accept</div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{paddingBottom:45,flexShrink:0,width:'100%',padding:'0 24px 45px',position:'relative',zIndex:3}}>
          {/* Top controls row */}
          <div style={{display:'flex',justifyContent:'space-around',marginBottom:36}}>
            {[
              { label: isMuted?'Unmute':'Mute', icon:<IconMic off={isMuted}/>, onClick:onMute, active:isMuted },
              { label: isSpeaker?'Earpiece':'Speaker', icon:<IconSpeaker on={isSpeaker}/>, onClick:onSpeaker, active:isSpeaker },
              { label: isVideoOn?'Video Off':'Video', icon:<IconVideo off={isVideoOn}/>, onClick:onVideo, active:isVideoOn },
              { label: isSharing?'Stop Share':'Screen', icon:<IconScreen/>, onClick:onScreenShare, active:isSharing },
            ].map(({label,icon,onClick,active})=>(
              <div key={label} style={{textAlign:'center'}}>
                <button onClick={onClick} style={{
                  width:58,height:58,borderRadius:'50%',
                  background: active ? 'rgba(212,175,55,0.9)' : 'rgba(255,255,255,0.12)',
                  border: active ? '2px solid #D4AF37' : '1px solid rgba(212,175,55,0.2)',
                  cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  margin:'0 auto 6px',
                  backdropFilter:'blur(10px)',
                  boxShadow: active ? '0 4px 16px rgba(212,175,55,0.4)' : 'none',
                  transition:'all 0.2s'
                }}>
                  {icon}
                </button>
                <div style={{color:'rgba(255,255,255,0.65)',fontSize:11,fontWeight:500}}>{label}</div>
              </div>
            ))}
          </div>

          {/* Hangup */}
          <div style={{display:'flex',justifyContent:'center'}}>
            <button onClick={onHangup} style={{
              width:70,height:70,borderRadius:'50%',background:'linear-gradient(135deg,#E53935,#C62828)',
              border:'none',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 6px 28px rgba(229,57,53,0.55)'
            }}>
              <IconHangup/>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ripple { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.5);opacity:0} }
        @keyframes pulse { 0%,100%{transform:scale(1);box-shadow:0 6px 24px rgba(37,211,102,0.6)} 50%{transform:scale(1.1);box-shadow:0 8px 32px rgba(37,211,102,0.8)} }
      `}</style>
    </div>
  );
}

// ── Shared call logic hook ────────────────────────────────────────────────────
function useCallLogic({ isOutgoing, toSocketId, toUserId, fromName, myName, myUserId, offer, onEnd }) {
  const [status, setStatus] = useState(isOutgoing ? 'calling' : 'ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const peerSocketRef = useRef(toSocketId || null);
  const pendingRef = useRef([]);
  const endedRef = useRef(false);
  const ringRef = useRef(null);

  const cleanup = (skipEmit = false) => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearInterval(timerRef.current);
    try { ringRef.current?.stop(); } catch {}
    try { localStreamRef.current?.getTracks().forEach(t=>t.stop()); } catch {}
    try { screenStreamRef.current?.getTracks().forEach(t=>t.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    if (!skipEmit && peerSocketRef.current) {
      getSocket()?.emit('call_end', { toSocketId: peerSocketRef.current });
    }
  };

  const hangup = () => { cleanup(); setStatus('ended'); setTimeout(onEnd, 800); };

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setDuration(d=>d+1), 1000);
  };

  const createPC = (stream) => {
    const pc = new RTCPeerConnection(ICE);
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = e => {
      if (e.streams[0]) {
        if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = e.streams[0]; remoteAudioRef.current.play().catch(()=>{}); }
        if (remoteVideoRef.current && e.track.kind === 'video') remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = e => {
      if (!e.candidate) return;
      if (peerSocketRef.current) getSocket()?.emit('call_ice', { toSocketId: peerSocketRef.current, candidate: e.candidate });
      else pendingRef.current.push(e.candidate);
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') { setStatus('connected'); startTimer(); }
      if (s === 'failed') { toast.error('Connection failed - check network'); pc.restartIce(); }
      if (s === 'disconnected') setTimeout(() => { if (pc.connectionState === 'disconnected') hangup(); }, 5000);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    return pc;
  };

  const addIce = async (candidate) => {
    try {
      if (pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      else pendingRef.current.push(candidate);
    } catch {}
  };

  const flushPending = () => {
    const s = getSocket();
    pendingRef.current.forEach(c => s?.emit('call_ice', { toSocketId: peerSocketRef.current, candidate: c }));
    pendingRef.current = [];
  };

  // Outgoing: initiate call
  const startOutgoing = async () => {
    const s = getSocket();
    if (!s) { toast.error('Not connected'); onEnd(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO);
      localStreamRef.current = stream;
      const pc = createPC(stream);

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      s.emit('call_request', { toUserId, fromName: myName, fromUserId: myUserId, offer });

      s.on('call_answered', async ({ answer, fromSocketId }) => {
        peerSocketRef.current = fromSocketId;
        try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); flushPending(); } catch {}
      });
      s.on('call_ice', ({ candidate }) => addIce(candidate));
      s.on('call_rejected', () => { toast.error(fromName + ' declined'); cleanup(true); setStatus('ended'); setTimeout(onEnd, 1000); });
      s.on('call_ended', () => { cleanup(true); setStatus('ended'); setTimeout(onEnd, 800); });
      s.on('call_unavailable', () => { toast.error('User is offline'); cleanup(true); setStatus('ended'); setTimeout(onEnd, 1000); });
    } catch (err) { toast.error('Mic error: ' + err.message); onEnd(); }
  };

  // Incoming: accept call
  const accept = async () => {
    try { ringRef.current?.stop(); } catch {}
    const s = getSocket();
    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO);
      localStreamRef.current = stream;
      const pc = createPC(stream);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      // Flush any pending candidates received before accept
      for (const c of pendingRef.current) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
      pendingRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s?.emit('call_answer', { toSocketId: toSocketId, answer });
      setStatus('connecting');
    } catch (err) { toast.error('Mic error: ' + err.message); reject(); }
  };

  const reject = () => {
    getSocket()?.emit('call_reject', { toSocketId });
    cleanup(true); setStatus('ended'); setTimeout(onEnd, 500);
  };

  // Toggle video
  const toggleVideo = async () => {
    if (!isVideoOn) {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia(VIDEO);
        const vTrack = vStream.getVideoTracks()[0];
        if (localVideoRef.current) { localVideoRef.current.srcObject = vStream; localVideoRef.current.play().catch(()=>{}); }
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s=>s.track?.kind==='video');
          if (sender) sender.replaceTrack(vTrack);
          else pcRef.current.addTrack(vTrack, vStream);
        }
        screenStreamRef.current = vStream;
        setIsVideoOn(true);
      } catch { toast.error('Camera unavailable'); }
    } else {
      screenStreamRef.current?.getVideoTracks().forEach(t=>t.stop());
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      setIsVideoOn(false);
    }
  };

  // Screen share
  const toggleScreen = async () => {
    if (!isSharing) {
      try {
        const sStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const sTrack = sStream.getVideoTracks()[0];
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s=>s.track?.kind==='video');
          if (sender) sender.replaceTrack(sTrack);
          else pcRef.current.addTrack(sTrack, sStream);
        }
        sTrack.onended = () => setIsSharing(false);
        setIsSharing(true);
        toast.success('Screen sharing started');
      } catch { toast.error('Screen share unavailable on mobile'); }
    } else {
      const sender = pcRef.current?.getSenders().find(s=>s.track?.kind==='video');
      sender?.track?.stop();
      setIsSharing(false);
    }
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  };

  const toggleSpeaker = () => {
    const audio = remoteAudioRef.current;
    if (audio) {
      const next = !isSpeaker;
      if (audio.setSinkId) audio.setSinkId(next ? 'speaker' : 'default').catch(()=>{});
      audio.volume = next ? 1 : 0.85;
      setIsSpeaker(next);
      toast.success(next ? '🔊 Speaker on' : '📱 Earpiece');
    }
  };

  return {
    status, duration, isMuted, isSpeaker, isVideoOn, isSharing,
    remoteAudioRef, localVideoRef, remoteVideoRef,
    ringRef, pcRef, peerSocketRef, pendingRef,
    hangup, accept, reject, toggleMute, toggleSpeaker, toggleVideo, toggleScreen,
    startOutgoing, addIce, cleanup,
    setStatus,
  };
}

// ── OutgoingCall Component ────────────────────────────────────────────────────
export function OutgoingCall({ toUserId, toName, toProfilePic, myName, myUserId, onEnd }) {
  const logic = useCallLogic({ isOutgoing: true, toUserId, fromName: toName, myName, myUserId, onEnd });

  useEffect(() => {
    logic.startOutgoing();
    return () => {
      const s = getSocket();
      s?.off('call_answered'); s?.off('call_ice');
      s?.off('call_rejected'); s?.off('call_ended'); s?.off('call_unavailable');
      logic.cleanup();
    };
  }, []);

  return (
    <CallScreen
      name={toName} profilePic={toProfilePic}
      statusLine="Calling..." duration={logic.duration}
      isConnected={logic.status==='connected'} isRinging={false}
      isMuted={logic.isMuted} isSpeaker={logic.isSpeaker}
      isVideoOn={logic.isVideoOn} isSharing={logic.isSharing}
      onHangup={logic.hangup} onMute={logic.toggleMute}
      onSpeaker={logic.toggleSpeaker} onVideo={logic.toggleVideo}
      onScreenShare={logic.toggleScreen}
      remoteAudioRef={logic.remoteAudioRef}
      localVideoRef={logic.localVideoRef}
      remoteVideoRef={logic.remoteVideoRef}
    />
  );
}

// ── IncomingCall Component ────────────────────────────────────────────────────
export function IncomingCall({ fromSocketId, fromName, fromProfilePic, offer, onEnd }) {
  const logic = useCallLogic({ isOutgoing: false, toSocketId: fromSocketId, fromName, offer, onEnd });

  useEffect(() => {
    logic.ringRef.current = makeRingtone();
    const s = getSocket();
    const onIce = ({ candidate }) => logic.addIce(candidate);
    const onEnded = () => { logic.cleanup(true); logic.setStatus('ended'); setTimeout(onEnd, 800); };
    s?.on('call_ice', onIce);
    s?.on('call_ended', onEnded);
    return () => {
      s?.off('call_ice', onIce);
      s?.off('call_ended', onEnded);
      logic.cleanup();
    };
  }, []);

  const statusLine = logic.status === 'ringing' ? 'Incoming voice call'
    : logic.status === 'connecting' ? 'Connecting...' : 'Call ended';

  return (
    <CallScreen
      name={fromName} profilePic={fromProfilePic}
      statusLine={statusLine} duration={logic.duration}
      isConnected={logic.status==='connected'}
      isRinging={logic.status==='ringing'}
      isMuted={logic.isMuted} isSpeaker={logic.isSpeaker}
      isVideoOn={logic.isVideoOn} isSharing={logic.isSharing}
      onHangup={logic.hangup} onMute={logic.toggleMute}
      onSpeaker={logic.toggleSpeaker} onVideo={logic.toggleVideo}
      onScreenShare={logic.toggleScreen}
      onAccept={logic.accept} onReject={logic.reject}
      remoteAudioRef={logic.remoteAudioRef}
      localVideoRef={logic.localVideoRef}
      remoteVideoRef={logic.remoteVideoRef}
    />
  );
}
