import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../utils/socket';
import toast from 'react-hot-toast';

const STUN = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

function CallUI({ avatar, name, statusLine, children }) {
  return (
    <div style={{position:'fixed',inset:0,background:'linear-gradient(160deg,#0a1628 0%,#1a2a1a 100%)',zIndex:9999,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:24}}>
      <div style={{width:96,height:96,borderRadius:'50%',background:'linear-gradient(135deg,#9B1826,#C02035)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,fontWeight:700,color:'#fff',boxShadow:'0 0 0 12px rgba(155,24,38,0.15),0 0 0 24px rgba(155,24,38,0.08)'}}>
        {avatar}
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:24,fontWeight:700,color:'#fff',marginBottom:8}}>{name}</div>
        <div style={{fontSize:15,color:'rgba(255,255,255,0.6)'}}>{statusLine}</div>
      </div>
      {children}
    </div>
  );
}

function HangupBtn({ onClick, label }) {
  return (
    <div style={{textAlign:'center'}}>
      <button onClick={onClick} style={{width:68,height:68,borderRadius:'50%',background:'#E53935',border:'none',color:'#fff',fontSize:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 24px rgba(229,57,53,0.5)',margin:'0 auto'}}>
        &#128245;
      </button>
      {label && <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginTop:6}}>{label}</div>}
    </div>
  );
}

function AcceptBtn({ onClick }) {
  return (
    <div style={{textAlign:'center'}}>
      <button onClick={onClick} style={{width:68,height:68,borderRadius:'50%',background:'#00A884',border:'none',color:'#fff',fontSize:28,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 24px rgba(0,168,132,0.5)',margin:'0 auto'}}>
        &#128222;
      </button>
      <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginTop:6}}>Accept</div>
    </div>
  );
}

export function OutgoingCall({ toUserId, toName, myName, myUserId, onEnd }) {
  const [status, setStatus] = useState('calling');
  const [secs, setSecs] = useState(0);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerRef = useRef(null);
  const peerSocketRef = useRef(null);
  const endedRef = useRef(false);

  const fmtTime = s => Math.floor(s/60)+':'+(s%60+'').padStart(2,'0');

  const doEnd = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearInterval(timerRef.current);
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    streamRef.current = null;
    const s = getSocket();
    if (peerSocketRef.current) s?.emit('call_end', { toSocketId: peerSocketRef.current });
    setTimeout(onEnd, 600);
  };

  useEffect(() => {
    const s = getSocket();
    if (!s) { toast.error('Not connected to server'); onEnd(); return; }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 }, video: false });
        streamRef.current = stream;

        const pc = new RTCPeerConnection(STUN);
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
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          if (state === 'connected') {
            setStatus('connected');
            timerRef.current = setInterval(() => setSecs(n => n + 1), 1000);
          }
          if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            setStatus('ended');
            doEnd();
          }
        };

        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        s.emit('call_request', { toUserId, fromName: myName, fromUserId: myUserId, offer });

        s.on('call_answered', async ({ answer, fromSocketId }) => {
          peerSocketRef.current = fromSocketId;
          try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); } catch {}
        });

        s.on('call_ice', async ({ candidate }) => {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
        });

        s.on('call_rejected', () => {
          toast.error(toName + ' declined the call');
          setStatus('ended');
          doEnd();
        });

        s.on('call_ended', () => {
          setStatus('ended');
          doEnd();
        });

        s.on('call_unavailable', () => {
          toast.error(toName + ' is offline');
          setStatus('ended');
          doEnd();
        });

      } catch (err) {
        toast.error('Microphone error: ' + err.message);
        onEnd();
      }
    })();

    return () => {
      s.off('call_answered');
      s.off('call_ice');
      s.off('call_rejected');
      s.off('call_ended');
      s.off('call_unavailable');
      doEnd();
    };
  }, []);

  const statusLine = status === 'calling' ? 'Calling...' : status === 'connected' ? ('Connected  ' + fmtTime(secs)) : 'Call ended';

  return (
    <CallUI avatar={toName?.[0]?.toUpperCase() || '?'} name={toName} statusLine={statusLine}>
      <audio ref={remoteAudioRef} autoPlay playsInline style={{display:'none'}} />
      <HangupBtn onClick={doEnd} label="End call" />
    </CallUI>
  );
}

export function IncomingCall({ fromSocketId, fromName, offer, onEnd }) {
  const [status, setStatus] = useState('ringing');
  const [secs, setSecs] = useState(0);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const timerRef = useRef(null);
  const ringRef = useRef(null);
  const endedRef = useRef(false);

  const fmtTime = s => Math.floor(s/60)+':'+(s%60+'').padStart(2,'0');

  const doEnd = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearInterval(timerRef.current);
    try { ringRef.current?.stop(); } catch {}
    try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch {}
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    streamRef.current = null;
    setTimeout(onEnd, 600);
  };

  const reject = () => {
    getSocket()?.emit('call_reject', { toSocketId: fromSocketId });
    doEnd();
  };

  const accept = async () => {
    try { ringRef.current?.stop(); } catch {}
    const s = getSocket();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 }, video: false });
      streamRef.current = stream;

      const pc = new RTCPeerConnection(STUN);
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
        if (state === 'connected') {
          setStatus('connected');
          timerRef.current = setInterval(() => setSecs(n => n + 1), 1000);
        }
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setStatus('ended');
          doEnd();
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s?.emit('call_answer', { toSocketId: fromSocketId, answer });
      setStatus('connected');

    } catch (err) {
      toast.error('Microphone error: ' + err.message);
      reject();
    }
  };

  useEffect(() => {
    // Ringtone via Web Audio
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      let stopped = false;
      const ring = () => {
        if (stopped) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = 480;
        g.gain.setValueAtTime(0.4, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
        setTimeout(ring, 1400);
      };
      ring();
      ringRef.current = { stop: () => { stopped = true; try { ctx.close(); } catch {} } };
    } catch {}

    const s = getSocket();
    const onIce = async ({ candidate }) => {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    };
    const onEnded = () => { setStatus('ended'); doEnd(); };
    s?.on('call_ice', onIce);
    s?.on('call_ended', onEnded);

    return () => {
      s?.off('call_ice', onIce);
      s?.off('call_ended', onEnded);
      doEnd();
    };
  }, []);

  const statusLine = status === 'ringing' ? 'Incoming voice call...' : status === 'connected' ? ('Connected  ' + fmtTime(secs)) : 'Call ended';

  return (
    <CallUI avatar={fromName?.[0]?.toUpperCase() || '?'} name={fromName} statusLine={statusLine}>
      <audio ref={remoteAudioRef} autoPlay playsInline style={{display:'none'}} />
      {status === 'ringing' && (
        <div style={{display:'flex',gap:48}}>
          <HangupBtn onClick={reject} label="Decline" />
          <AcceptBtn onClick={accept} />
        </div>
      )}
      {status === 'connected' && <HangupBtn onClick={doEnd} label="End call" />}
    </CallUI>
  );
}
