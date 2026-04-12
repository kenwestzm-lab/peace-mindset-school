import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../utils/socket';
import toast from 'react-hot-toast';

// ICE servers with FREE TURN server (handles 4G/mobile NAT)
const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Free TURN servers - handles mobile networks
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
  },
  video: false,
};

// ── Shared Call Screen UI ────────────────────────────────────────────────────
function CallScreen({
  name, avatar, statusLine, duration,
  onHangup, onMute, onSpeaker,
  isMuted, isSpeaker, isConnected, isRinging,
  onAccept, onReject,
  remoteAudioRef,
}) {
  const fmtDur = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:9999,
      background:'linear-gradient(180deg,#075E54 0%,#128C7E 40%,#075E54 100%)',
      display:'flex',flexDirection:'column',alignItems:'center',
      fontFamily:"'Segoe UI',system-ui,sans-serif"
    }}>
      <audio ref={remoteAudioRef} autoPlay playsInline style={{display:'none'}}/>

      {/* Top bar */}
      <div style={{width:'100%',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>Peace Mindset School</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>
          {isConnected ? '🔒 Encrypted' : ''}
        </div>
      </div>

      {/* Avatar + name */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
        {/* Animated ring when ringing */}
        <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
          {(isRinging||!isConnected) && (
            <>
              <div style={{
                position:'absolute',width:160,height:160,borderRadius:'50%',
                background:'rgba(255,255,255,0.08)',
                animation:'ring 2s ease-out infinite'
              }}/>
              <div style={{
                position:'absolute',width:140,height:140,borderRadius:'50%',
                background:'rgba(255,255,255,0.12)',
                animation:'ring 2s ease-out infinite 0.4s'
              }}/>
            </>
          )}
          <div style={{
            width:110,height:110,borderRadius:'50%',
            background:'linear-gradient(135deg,#25D366,#128C7E)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontSize:46,fontWeight:700,color:'#fff',
            border:'3px solid rgba(255,255,255,0.3)',
            overflow:'hidden',position:'relative',zIndex:1,flexShrink:0
          }}>
            {avatar}
          </div>
        </div>

        <div style={{textAlign:'center'}}>
          <div style={{fontSize:26,fontWeight:700,color:'#fff',marginBottom:6,letterSpacing:0.3}}>{name}</div>
          <div style={{fontSize:15,color:'rgba(255,255,255,0.75)'}}>
            {isConnected ? `⏱ ${fmtDur(duration)}` : statusLine}
          </div>
        </div>
      </div>

      {/* Buttons */}
      {isRinging ? (
        /* Incoming call - accept/reject */
        <div style={{display:'flex',gap:60,paddingBottom:60,flexShrink:0}}>
          <div style={{textAlign:'center'}}>
            <button onClick={onReject} style={{
              width:72,height:72,borderRadius:'50%',background:'#E53935',border:'none',
              color:'#fff',fontSize:30,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 6px 24px rgba(229,57,53,0.6)',margin:'0 auto 8px'
            }}>&#128245;</button>
            <div style={{color:'rgba(255,255,255,0.7)',fontSize:13}}>Decline</div>
          </div>
          <div style={{textAlign:'center'}}>
            <button onClick={onAccept} style={{
              width:72,height:72,borderRadius:'50%',background:'#25D366',border:'none',
              color:'#fff',fontSize:30,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 6px 24px rgba(37,211,102,0.6)',margin:'0 auto 8px',
              animation:'pulse 1.5s ease-in-out infinite'
            }}>&#128222;</button>
            <div style={{color:'rgba(255,255,255,0.7)',fontSize:13}}>Accept</div>
          </div>
        </div>
      ) : (
        /* Active call controls */
        <div style={{paddingBottom:50,flexShrink:0,width:'100%',padding:'0 30px 50px'}}>
          {/* Top row controls */}
          <div style={{display:'flex',justifyContent:'space-around',marginBottom:40}}>
            <div style={{textAlign:'center'}}>
              <button onClick={onMute} style={{
                width:60,height:60,borderRadius:'50%',
                background:isMuted?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.15)',
                border:'none',color:isMuted?'#075E54':'#fff',fontSize:22,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px'
              }}>
                {isMuted ? '🔇' : '🎤'}
              </button>
              <div style={{color:'rgba(255,255,255,0.7)',fontSize:12}}>{isMuted?'Unmute':'Mute'}</div>
            </div>

            <div style={{textAlign:'center'}}>
              <button onClick={onSpeaker} style={{
                width:60,height:60,borderRadius:'50%',
                background:isSpeaker?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.15)',
                border:'none',color:isSpeaker?'#075E54':'#fff',fontSize:22,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px'
              }}>
                &#128266;
              </button>
              <div style={{color:'rgba(255,255,255,0.7)',fontSize:12}}>{isSpeaker?'Speaker On':'Speaker'}</div>
            </div>

            <div style={{textAlign:'center'}}>
              <button style={{
                width:60,height:60,borderRadius:'50%',
                background:'rgba(255,255,255,0.15)',
                border:'none',color:'#fff',fontSize:22,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 6px',
                opacity:0.5
              }}>
                &#128250;
              </button>
              <div style={{color:'rgba(255,255,255,0.5)',fontSize:12}}>Video</div>
            </div>
          </div>

          {/* Hangup */}
          <div style={{display:'flex',justifyContent:'center'}}>
            <button onClick={onHangup} style={{
              width:72,height:72,borderRadius:'50%',background:'#E53935',border:'none',
              color:'#fff',fontSize:28,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 6px 24px rgba(229,57,53,0.5)'
            }}>&#128245;</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}

// ── Outgoing Call ────────────────────────────────────────────────────────────
export function OutgoingCall({ toUserId, toName, myName, myUserId, onEnd }) {
  const [status, setStatus] = useState('calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerRef = useRef(null);
  const peerSocketRef = useRef(null);
  const endedRef = useRef(false);
  const pendingCandidates = useRef([]);

  const cleanup = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearInterval(timerRef.current);
    try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    if (peerSocketRef.current) {
      getSocket()?.emit('call_end', { toSocketId: peerSocketRef.current });
    }
  };

  const hangup = () => {
    cleanup();
    setStatus('ended');
    setTimeout(onEnd, 800);
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  };

  const toggleSpeaker = () => {
    const audio = remoteAudioRef.current;
    if (audio) {
      setIsSpeaker(s => {
        // On mobile, setSinkId controls speaker vs earpiece
        if (audio.setSinkId) {
          audio.setSinkId(!s ? 'speaker' : 'default').catch(() => {});
        }
        audio.volume = !s ? 1 : 0.8;
        return !s;
      });
    }
  };

  useEffect(() => {
    const s = getSocket();
    if (!s) { toast.error('Not connected'); onEnd(); return; }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection(ICE);
        pcRef.current = pc;

        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        pc.ontrack = e => {
          if (remoteAudioRef.current && e.streams[0]) {
            remoteAudioRef.current.srcObject = e.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          }
        };

        pc.onicecandidate = e => {
          if (e.candidate && peerSocketRef.current) {
            s.emit('call_ice', { toSocketId: peerSocketRef.current, candidate: e.candidate });
          } else if (e.candidate && !peerSocketRef.current) {
            pendingCandidates.current.push(e.candidate);
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          console.log('📞 Connection state:', state);
          if (state === 'connected') {
            setStatus('connected');
            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
          }
          if (state === 'failed') {
            toast.error('Call connection failed. Check your network.');
            hangup();
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log('🧊 ICE state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'failed') {
            pc.restartIce();
          }
        };

        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        s.emit('call_request', { toUserId, fromName: myName, fromUserId: myUserId, offer });

        s.on('call_answered', async ({ answer, fromSocketId }) => {
          peerSocketRef.current = fromSocketId;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            // Send any pending ICE candidates
            for (const c of pendingCandidates.current) {
              s.emit('call_ice', { toSocketId: fromSocketId, candidate: c });
            }
            pendingCandidates.current = [];
          } catch (e) { console.error('setRemoteDescription error:', e); }
        });

        s.on('call_ice', async ({ candidate }) => {
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          } catch (e) { console.warn('ICE candidate error:', e); }
        });

        s.on('call_rejected', () => {
          toast.error(toName + ' declined');
          cleanup(); setStatus('ended'); setTimeout(onEnd, 1000);
        });

        s.on('call_ended', () => {
          cleanup(); setStatus('ended'); setTimeout(onEnd, 800);
        });

        s.on('call_unavailable', () => {
          toast.error(toName + ' is offline');
          cleanup(); setStatus('ended'); setTimeout(onEnd, 1000);
        });

      } catch (err) {
        console.error('Call error:', err);
        toast.error('Mic error: ' + err.message);
        onEnd();
      }
    })();

    return () => {
      s.off('call_answered'); s.off('call_ice');
      s.off('call_rejected'); s.off('call_ended'); s.off('call_unavailable');
      cleanup();
    };
  }, []);

  const avatar = toName?.[0]?.toUpperCase() || '?';
  const statusLine = status === 'calling' ? 'Calling...' : status === 'ended' ? 'Call ended' : '';

  return (
    <CallScreen
      name={toName} avatar={avatar}
      statusLine={statusLine} duration={duration}
      isConnected={status==='connected'} isRinging={false}
      isMuted={isMuted} isSpeaker={isSpeaker}
      onHangup={hangup} onMute={toggleMute} onSpeaker={toggleSpeaker}
      remoteAudioRef={remoteAudioRef}
    />
  );
}

// ── Incoming Call ────────────────────────────────────────────────────────────
export function IncomingCall({ fromSocketId, fromName, offer, onEnd }) {
  const [status, setStatus] = useState('ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerRef = useRef(null);
  const ringRef = useRef(null);
  const endedRef = useRef(false);

  const cleanup = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearInterval(timerRef.current);
    try { ringRef.current?.stop(); } catch {}
    try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
  };

  const reject = () => {
    getSocket()?.emit('call_reject', { toSocketId: fromSocketId });
    cleanup(); setStatus('ended'); setTimeout(onEnd, 500);
  };

  const hangup = () => {
    getSocket()?.emit('call_end', { toSocketId: fromSocketId });
    cleanup(); setStatus('ended'); setTimeout(onEnd, 800);
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  };

  const toggleSpeaker = () => {
    const audio = remoteAudioRef.current;
    if (audio) {
      setIsSpeaker(s => {
        if (audio.setSinkId) audio.setSinkId(!s ? 'speaker' : 'default').catch(() => {});
        audio.volume = !s ? 1 : 0.8;
        return !s;
      });
    }
  };

  const accept = async () => {
    try { ringRef.current?.stop(); } catch {}
    const s = getSocket();
    try {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.ontrack = e => {
        if (remoteAudioRef.current && e.streams[0]) {
          remoteAudioRef.current.srcObject = e.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      pc.onicecandidate = e => {
        if (e.candidate) s?.emit('call_ice', { toSocketId: fromSocketId, candidate: e.candidate });
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('📞 ICE callee state:', state);
        if (state === 'connected') {
          setStatus('connected');
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        }
        if (state === 'failed') {
          toast.error('Connection failed');
          hangup();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') pc.restartIce();
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s?.emit('call_answer', { toSocketId: fromSocketId, answer });
      setStatus('connecting');

    } catch (err) {
      toast.error('Mic error: ' + err.message);
      reject();
    }
  };

  useEffect(() => {
    // Ringtone
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      let stopped = false;
      const playRing = () => {
        if (stopped) return;
        [440, 480].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.connect(g); g.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          g.gain.setValueAtTime(0, ctx.currentTime + i*0.1);
          g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i*0.1 + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
          osc.start(ctx.currentTime + i*0.1);
          osc.stop(ctx.currentTime + 0.8);
        });
        setTimeout(playRing, 1500);
      };
      playRing();
      ringRef.current = { stop: () => { stopped = true; setTimeout(() => ctx.close(), 500); } };
    } catch {}

    const s = getSocket();
    const onIce = async ({ candidate }) => {
      try {
        if (pcRef.current?.remoteDescription) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch {}
    };
    const onEnded = () => { cleanup(); setStatus('ended'); setTimeout(onEnd, 800); };
    s?.on('call_ice', onIce);
    s?.on('call_ended', onEnded);

    return () => {
      s?.off('call_ice', onIce);
      s?.off('call_ended', onEnded);
      cleanup();
    };
  }, []);

  const avatar = fromName?.[0]?.toUpperCase() || '?';
  const statusLine = status === 'ringing' ? 'Incoming voice call...'
    : status === 'connecting' ? 'Connecting...'
    : status === 'ended' ? 'Call ended' : '';

  return (
    <CallScreen
      name={fromName} avatar={avatar}
      statusLine={statusLine} duration={duration}
      isConnected={status==='connected'}
      isRinging={status==='ringing'}
      isMuted={isMuted} isSpeaker={isSpeaker}
      onHangup={hangup} onMute={toggleMute} onSpeaker={toggleSpeaker}
      onAccept={accept} onReject={reject}
      remoteAudioRef={remoteAudioRef}
    />
  );
}
