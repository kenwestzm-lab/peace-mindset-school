// Audio trimmer - trims audio to max 30 seconds using Web Audio API
// Works in browser, no server needed

export const trimAudioTo30Seconds = (file, maxSeconds = 30) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) throw new Error("No AudioContext");
        const audioCtx = new AudioCtx();
        const arrayBuffer = e.target.result;
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const duration = audioBuffer.duration;

        if (duration <= maxSeconds) {
          const r = new FileReader();
          r.onload = ev => resolve({ data: ev.target.result, duration, trimmed: false, mimeType: file.type });
          r.readAsDataURL(file);
          return;
        }

        const sampleRate = audioBuffer.sampleRate;
        const numChannels = audioBuffer.numberOfChannels;
        const targetLen = Math.floor(maxSeconds * sampleRate);
        const offlineCtx = new OfflineAudioContext(numChannels, targetLen, sampleRate);
        const src = offlineCtx.createBufferSource();
        src.buffer = audioBuffer;
        src.connect(offlineCtx.destination);
        src.start(0);
        const rendered = await offlineCtx.startRendering();

        // Convert to WAV
        const wavBlob = bufferToWav(rendered);
        const r = new FileReader();
        r.onload = ev => resolve({ data: ev.target.result, duration: maxSeconds, trimmed: true, originalDuration: Math.round(duration), mimeType: "audio/wav" });
        r.readAsDataURL(wavBlob);
      } catch (err) {
        // Fallback: return as-is
        const r = new FileReader();
        r.onload = ev => resolve({ data: ev.target.result, duration: 0, trimmed: false, mimeType: file.type });
        r.readAsDataURL(file);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

const bufferToWav = (buf) => {
  const nc = buf.numberOfChannels, sr = buf.sampleRate, len = buf.length;
  const ab = new ArrayBuffer(44 + len * nc * 2);
  const v = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0,"RIFF"); v.setUint32(4,36+len*nc*2,true); ws(8,"WAVE"); ws(12,"fmt ");
  v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,nc,true);
  v.setUint32(24,sr,true); v.setUint32(28,sr*nc*2,true); v.setUint16(32,nc*2,true);
  v.setUint16(34,16,true); ws(36,"data"); v.setUint32(40,len*nc*2,true);
  let off = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < nc; c++) {
    const s = Math.max(-1, Math.min(1, buf.getChannelData(c)[i]));
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true); off += 2;
  }
  return new Blob([ab], { type: "audio/wav" });
};

export const formatDuration = (s) => {
  const sec = Math.round(s);
  return Math.floor(sec/60) + ":" + String(sec%60).padStart(2,"0");
};
