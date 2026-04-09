import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../utils/socket';
import toast from 'react-hot-toast';

const STUN = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]};

// ── Outgoing call (caller side) ──────────────────────────────────────
export function OutgoingCall({ toUserId, toName, myName, myUserId, onEnd }) {
  const [status, setStatus] = useState('calling'); // calling | connected | ended
  const [duration, setSec] = useState(0);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const remoteRef = useRef(null);
  const timerRef = useRef(null);
  const peerSocketRef = useRef(null);

  const cleanup = () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current = null;
  };

  const hangUp = () => {
    const s = getSocket();
    if (peerSocketRef.current) s?.emit('call_end', { toSocketId: peerSocketRef.current });
    cleanup();
    setStatus('ended');
    setTimeout(onEnd, 800);
  };

  useEffect(() => {
    const s = getSocket();
    if (!s) { toast.error('Not connected'); onEnd(); return; }

    let pc;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;

        pc = new RTCPeerConnection(STUN);
        pcRef.current = pc;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        pc.ontrack = e => {
          if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
        };

        pc.onicecandidate = e => {
          if (e.candidate && peerSocketRef.current) {
            s.emit('call_ice', { toSocketId: peerSocketRef.current, candidate: e.candidate });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setStatus('connected');
            timerRef.current = setInterval(() => setSec(n => n + 1), 1000);
          }
          if (['disconnected','failed','closed'].includes(pc.connectionState)) {
            hangUp();
          }
        };

        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);

        s.emit('call_request', { toUserId, fromName: myName, fromUserId: myUserId, offer });

        s.on('call_answered', async ({ answer, fromSocketId }) => {
          peerSocketRef.current = fromSocketId;
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        s.on('call_ice', async ({ candidate }) => {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
        });

        s.on('call_rejected', () => {
          setStatus('ended');
          toast.error(`${toName} declined the call`);
          cleanup();
          setTimeout(onEnd, 1200);
        });

        s.on('call_ended', () => {
          setStatus('ended');
          cleanup();
          setTimeout(onEnd, 800);
        });

        s.on('call_unavailable', () => {
          setStatus('ended');
          toast.error(`${toName} is offline`);
          cleanup();
          setTimeout(onEnd, 1000);
        });

      } catch (e) {
        toast.error('Microphone access denied or unavailable');
        onEnd();
      }
    })();

    return () => {
      s?.off('call_answered'); s?.off('call_ice');
      s?.off('call_rejected'); s?.off('call_ended'); s?.off('call_unavailable');
      cleanup();
    };
  }, []);

  const fmtDur = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div style={{position:'fixed',inset:0,background:'linear-gradient(160deg,#0a1628,#1a2a1a)',zIndex:9000,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}>
      <audio ref={remoteRef} autoPlay playsInline style={{display:'none'}}/>
      <div style={{width:90,height:90,borderRadius:'50%',background:'linear-gradient(135deg,#1565C0,#0D47A1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,fontWeight:700,color:'#fff',boxShadow:'0 0 0 8px rgba(21,101,192,0.2),0 0 0 16px rgba(21,101,192,0.1)'}}>
        {toName?.[0]?.toUpperCase()}
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:22,fontWeight:700,color:'#fff',marginBottom:6}}>{toName}</div>
        <div style={{fontSize:14,color:'rgba(255,255,255,0.6)'}}>
          {status==='calling' && '📞 Calling...'}
          {status==='connected' && `🟢 ${fmtDur(duration)}`}
          {status==='ended' && '📵 Call ended'}
        </div>
      </div>
      <button onClick={hangUp} style={{width:64,height:64,borderRadius:'50%',background:'#E53935',border:'none',color:'#fff',fontSize:26,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginTop:20,boxShadow:'0 4px 20px rgba(229,57,53,0.5)'}}>
        📵
      </button>
    </div>
  );
}

// ── Incoming call (callee side) ──────────────────────────────────────
export function IncomingCall({ fromSocketId, fromName, offer, onEnd }) {
  const [status, setStatus] = useState('ringing');
  const [duration, setSec] = useState(0);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const remoteRef = useRef(null);
  const timerRef = useRef(null);
  const ringtoneRef = useRef(null);

  const cleanup = () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current = null;
    ringtoneRef.current?.pause();
  };

  const reject = () => {
    const s = getSocket();
    s?.emit('call_reject', { toSocketId: fromSocketId });
    cleanup();
    setStatus('ended');
    setTimeout(onEnd, 500);
  };

  const accept = async () => {
    ringtoneRef.current?.pause();
    const s = getSocket();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const pc = new RTCPeerConnection(STUN);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.ontrack = e => {
        if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
      };

      pc.onicecandidate = e => {
        if (e.candidate) s?.emit('call_ice', { toSocketId: fromSocketId, candidate: e.candidate });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setStatus('connected');
          timerRef.current = setInterval(() => setSec(n => n + 1), 1000);
        }
        if (['disconnected','failed','closed'].includes(pc.connectionState)) {
          hangUp();
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      s?.emit('call_answer', { toSocketId: fromSocketId, answer });

      s?.on('call_ice', async ({ candidate }) => {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      });

      s?.on('call_ended', () => { cleanup(); setStatus('ended'); setTimeout(onEnd, 800); });

      setStatus('connected');

    } catch (e) {
      toast.error('Microphone access denied');
      reject();
    }
  };

  const hangUp = () => {
    const s = getSocket();
    s?.emit('call_end', { toSocketId: fromSocketId });
    cleanup();
    setStatus('ended');
    setTimeout(onEnd, 800);
  };

  useEffect(() => {
    // Play ringtone using Web Audio API (no file needed)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playRing = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      };
      const interval = setInterval(playRing, 1200);
      ringtoneRef.current = { pause: () => { clearInterval(interval); ctx.close(); } };
    } catch {}

    return () => { ringtoneRef.current?.pause(); };
  }, []);

  const fmtDur = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <div style={{position:'fixed',inset:0,background:'linear-gradient(160deg,#0a1628,#1a1a2e)',zIndex:9000,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}>
      <audio ref={remoteRef} autoPlay playsInline style={{display:'none'}}/>
      <div style={{width:90,height:90,borderRadius:'50%',background:'linear-gradient(135deg,#9B1826,#C02035)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,fontWeight:700,color:'#fff',boxShadow:status==='ringing'?'0 0 0 8px rgba(155,24,38,0.3),0 0 0 16px rgba(155,24,38,0.15)':'0 0 0 8px rgba(0,168,132,0.3)'}}>
        {fromName?.[0]?.toUpperCase()}
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:22,fontWeight:700,color:'#fff',marginBottom:6}}>{fromName}</div>
        <div style={{fontSize:14,color:'rgba(255,255,255,0.6)'}}>
          {status==='ringing' && '📞 Incoming voice call...'}
          {status==='connected' && `🟢 ${fmtDur(duration)}`}
          {status==='ended' && '📵 Call ended'}
        </div>
      </div>

      {status === 'ringing' && (
        <div style={{display:'flex',gap:40,marginTop:20}}>
          <div style={{textAlign:'center'}}>
            <button onClick={reject} style={{width:64,height:64,borderRadius:'50%',background:'#E53935',border:'none',color:'#fff',fontSize:26,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(229,57,53,0.5)'}}>
              📵
            </button>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginTop:6}}>Decline</div>
          </div>
          <div style={{textAlign:'center'}}>
            <button onClick={accept} style={{width:64,height:64,borderRadius:'50%',background:'#00A884',border:'none',color:'#fff',fontSize:26,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 20px rgba(0,168,132,0.5)'}}>
              📞
            </button>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginTop:6}}>Accept</div>
          </div>
        </div>
      )}

      {status === 'connected' && (
        <button onClick={hangUp} style={{width:64,height:64,borderRadius:'50%',background:'#E53935',border:'none',color:'#fff',fontSize:26,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginTop:20,boxShadow:'0 4px 20px rgba(229,57,53,0.5)'}}>
          📵
        </button>
      )}
    </div>
  );
}
