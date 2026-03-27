import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { useStore } from '../../store/useStore';
import { uploadMedia } from '../../utils/mediaUpload';
import toast from 'react-hot-toast';

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDay = d => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};
const timeLeft = exp => {
  const ms = new Date(exp) - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

/* ─── Styles ──────────────────────────────────────────────────────── */
const av = (s, bg) => ({ width: s, height: s, borderRadius: '50%', background: bg || 'linear-gradient(135deg,#2A3942,#3B4A54)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(s * 0.38), fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0 });
const avImg = { width: '100%', height: '100%', objectFit: 'cover' };
const inputBarStyle = { display: 'flex', alignItems: 'flex-end', gap: 8, padding: '6px 10px 8px', background: '#1F2C34', flexShrink: 0 };
const textareaStyle = { flex: 1, background: '#2A3942', border: 'none', borderRadius: 24, padding: '10px 14px', color: '#E9EDEF', fontSize: 15, outline: 'none', resize: 'none', maxHeight: 120, lineHeight: 1.4, minHeight: 40, fontFamily: "'Segoe UI',system-ui,sans-serif" };
const sendBtnStyle = { width: 46, height: 46, borderRadius: '50%', background: '#00A884', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const iconBtnStyle = { width: 42, height: 42, borderRadius: '50%', background: '#2A3942', border: 'none', color: '#8696A0', fontSize: 19, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

/* ─── VoiceMsg ────────────────────────────────────────────────────── */
function VoiceMsg({ src }) {
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const [dur, setDur] = useState(0);
  const ref = useRef(null);
  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
      <audio ref={ref} src={src}
        onTimeUpdate={e => setProg(e.target.currentTime / e.target.duration * 100)}
        onLoadedMetadata={e => setDur(e.target.duration)}
        onEnded={() => { setPlaying(false); setProg(0); }} />
      <button onClick={toggle} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {playing ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${prog}%`, background: '#25D366', transition: 'width .1s' }} />
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
          {dur ? `${Math.floor(dur / 60)}:${String(Math.floor(dur % 60)).padStart(2, '0')}` : '0:00'}
        </div>
      </div>
      <span style={{ fontSize: 18 }}>🎤</span>
    </div>
  );
}

/* ─── RecordingWaveform ───────────────────────────────────────────── */
function RecordingWaveform({ analyserRef, isRecording }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!isRecording) { cancelAnimationFrame(animRef.current); return; }
    const draw = () => {
      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      if (!canvas || !analyser) { animRef.current = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext('2d');
      const bufLen = analyser.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bw = (canvas.width / bufLen) * 2.5;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const h = (data[i] / 255) * canvas.height;
        const alpha = 0.5 + data[i] / 512;
        ctx.fillStyle = `rgba(37,211,102,${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - h, Math.max(bw - 1, 1), h, 2);
        ctx.fill();
        x += bw;
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isRecording]);

  return <canvas ref={canvasRef} width={160} height={36} style={{ borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />;
}

/* ─── Bubble ──────────────────────────────────────────────────────── */
function Bubble({ msg, isMe, showName, onLongPress }) {
  const [big, setBig] = useState(false);
  const pt = useRef(null); const moved = useRef(false);
  const deleted = msg.deletedForEveryone;
  const onTS = () => { moved.current = false; pt.current = setTimeout(() => { if (!moved.current) { navigator.vibrate?.(30); onLongPress(msg); } }, 500); };
  const onTM = () => { moved.current = true; };
  const onTE = () => clearTimeout(pt.current);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 2, paddingLeft: isMe ? 48 : 8, paddingRight: isMe ? 8 : 48 }}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onMouseDown={onTS} onMouseUp={onTE}>
        {!isMe && <div style={{ ...av(28), marginRight: 5, alignSelf: 'flex-end' }}>
          {msg.sender?.profilePic ? <img src={msg.sender.profilePic} style={avImg} alt="" /> : <span style={{ fontSize: 11 }}>{msg.sender?.name?.[0]?.toUpperCase() || 'P'}</span>}
        </div>}
        <div style={{ maxWidth: '75%', padding: '7px 9px 4px', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: isMe ? '#005C4B' : '#1F2C34', boxShadow: '0 1px 2px rgba(0,0,0,0.25)', position: 'relative' }}>
          {!isMe && showName && <div style={{ fontSize: 12, fontWeight: 600, color: '#00A884', marginBottom: 2 }}>{msg.sender?.name || 'Parent'}</div>}
          {deleted ? <span style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', fontSize: 14 }}>🚫 This message was deleted</span> : <>
            {msg.messageType === 'image' && msg.mediaData && <img src={msg.mediaData} style={{ maxWidth: '100%', borderRadius: 8, display: 'block', marginBottom: 3, cursor: 'pointer', maxHeight: 260, objectFit: 'cover' }} onClick={() => setBig(true)} alt="" />}
            {msg.messageType === 'video' && msg.mediaData && <video src={msg.mediaData} controls style={{ maxWidth: '100%', borderRadius: 8, display: 'block', marginBottom: 3, maxHeight: 260 }} />}
            {msg.messageType === 'voice' && msg.mediaData && <VoiceMsg src={msg.mediaData} />}
            {msg.content && <p style={{ margin: 0, fontSize: 15, color: '#E9EDEF', lineHeight: 1.45, wordBreak: 'break-word' }}>{msg.content}</p>}
            {msg.reactions?.length > 0 && <div style={{ position: 'absolute', bottom: -10, right: 6, background: '#2A3942', borderRadius: 10, padding: '2px 7px', fontSize: 13, boxShadow: '0 1px 3px rgba(0,0,0,0.4)', display: 'flex', gap: 2 }}>
              {[...new Set(msg.reactions.map(r => r.emoji))].join('')}
              <span style={{ fontSize: 10, color: '#8696A0', marginLeft: 2 }}>{msg.reactions.length}</span>
            </div>}
          </>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 3 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', whiteSpace: 'nowrap' }}>{fmtTime(msg.createdAt)}</span>
            {isMe && !deleted && <span style={{ fontSize: 12, color: msg.isRead ? '#53BDEB' : 'rgba(255,255,255,0.38)' }}>✓✓</span>}
          </div>
        </div>
      </div>
      {big && msg.mediaData && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 9990, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setBig(false)}>
        <img src={msg.mediaData} style={{ maxWidth: '95vw', maxHeight: '92vh', objectFit: 'contain' }} alt="" />
      </div>}
    </>
  );
}

/* ─── StoryViewer ─────────────────────────────────────────────────── */
function StoryViewer({ groups, groupIdx: initGI, onClose, currentUserId }) {
  const [gi, setGi] = useState(initGI || 0); const [si, setSi] = useState(0); const [pct, setPct] = useState(0); const timer = useRef(null);
  const group = groups[gi]; const story = group?.items[si];
  const advance = useCallback(() => { clearInterval(timer.current); if (si < group.items.length - 1) { setSi(s => s + 1); return; } if (gi < groups.length - 1) { setGi(g => g + 1); setSi(0); return; } onClose(); }, [gi, si, group, groups, onClose]);
  useEffect(() => {
    if (!story) return;
    api.put(`/stories/${story._id}/view`).catch(() => {});
    setPct(0);
    const dur = story.mediaType === 'video' ? 15000 : 5000;
    const step = 100 / (dur / 50);
    timer.current = setInterval(() => setPct(p => { if (p >= 100) { advance(); return 100; } return p + step; }), 50);
    return () => clearInterval(timer.current);
  }, [gi, si]);
  if (!story) return null;
  const tap = e => { const x = e.clientX / window.innerWidth; clearInterval(timer.current); if (x < 0.3) { if (si > 0) setSi(s => s - 1); else if (gi > 0) { setGi(g => g - 1); setSi(0); } } else advance(); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }} onClick={tap}>
      <div style={{ display: 'flex', gap: 3, padding: '12px 12px 0', flexShrink: 0 }}>
        {group.items.map((_, i) => (<div key={i} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', background: '#fff', width: `${i < si ? 100 : i === si ? pct : 0}%` }} /></div>))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <div style={av(38)}>{story.author?.profilePic ? <img src={story.author.profilePic} style={avImg} alt="" /> : <span>{story.author?.name?.[0]?.toUpperCase()}</span>}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{story.author?.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{timeLeft(story.expiresAt)}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); onClose(); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {story.mediaType === 'image' && story.mediaData && <img src={story.mediaData} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="" />}
        {story.mediaType === 'video' && story.mediaData && <video src={story.mediaData} autoPlay playsInline muted loop style={{ maxWidth: '100%', maxHeight: '100%' }} />}
        {story.text && <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(transparent,rgba(0,0,0,0.75))' }}><p style={{ color: '#fff', fontSize: 16, margin: 0, textAlign: 'center' }}>{story.text}</p></div>}
      </div>
      {story.author?._id === currentUserId && <div style={{ padding: '8px 16px', color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}><span>👁</span><span>{story.viewers?.length || 0} views</span></div>}
    </div>
  );
}

/* ─── CreateGroupSheet ────────────────────────────────────────────── */
function CreateGroupSheet({ onClose, onCreated }) {
  const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const [creating, setCreating] = useState(false);
  const create = async () => {
    if (!name.trim()) { toast.error('Enter a group name'); return; }
    setCreating(true);
    try { await api.post('/groups', { name: name.trim(), description: desc.trim() }); toast.success('Group created!'); onCreated(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setCreating(false); }
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#1F2C34', borderRadius: '20px 20px 0 0', padding: '20px 16px 36px', width: '100%', maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#E9EDEF' }}>New Group</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696A0', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Group name (required)" style={{ width: '100%', background: '#2A3942', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: '#E9EDEF', fontSize: 15, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" rows={2} style={{ width: '100%', background: '#2A3942', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: '#E9EDEF', fontSize: 14, outline: 'none', resize: 'none', marginBottom: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
        <p style={{ fontSize: 12, color: '#8696A0', marginBottom: 14 }}>All parents can see and join this group.</p>
        <button onClick={create} disabled={creating} style={{ width: '100%', padding: '14px', background: creating ? '#2A3942' : '#00A884', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15, cursor: creating ? 'default' : 'pointer' }}>{creating ? 'Creating...' : '✓ Create Group'}</button>
      </div>
    </div>
  );
}

/* ─── CreateStory ─────────────────────────────────────────────────── */
function CreateStory({ onClose, onPosted }) {
  const [file, setFile] = useState(null); const [prev, setPrev] = useState(null); const [text, setText] = useState(''); const [posting, setPosting] = useState(false); const ref = useRef(null);
  const pick = e => { const f = e.target.files[0]; if (!f) return; setFile(f); const r = new FileReader(); r.onload = ev => setPrev(ev.target.result); r.readAsDataURL(f); };
  const post = async () => {
    if (!file && !text.trim()) { toast.error('Add photo, video or text'); return; }
    setPosting(true);
    try {
      let md = null, mm = null, mt = 'text';
      if (file) {
        await new Promise((res, rej) => { const r = new FileReader(); r.onload = e => { md = e.target.result; res(); }; r.onerror = rej; r.readAsDataURL(file); });
        mm = file.type; mt = file.type.startsWith('video/') ? 'video' : 'image';
      }
      await api.post('/stories', { mediaData: md, mediaMimeType: mm, mediaType: mt, text: text || null });
      toast.success('Status posted!'); onPosted();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setPosting(false); }
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#1F2C34', borderRadius: '20px 20px 0 0', padding: '20px 16px 36px', width: '100%', maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><span style={{ fontSize: 16, fontWeight: 700, color: '#E9EDEF' }}>New Status</span><button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696A0', fontSize: 20, cursor: 'pointer' }}>✕</button></div>
        <input ref={ref} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={pick} />
        {prev ? <div style={{ position: 'relative', marginBottom: 12, borderRadius: 12, overflow: 'hidden' }}>
          {file?.type.startsWith('video/') ? <video src={prev} style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} muted /> : <img src={prev} style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} alt="" />}
          <button onClick={() => { setFile(null); setPrev(null); }} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer' }}>✕</button>
        </div> : <button onClick={() => ref.current?.click()} style={{ width: '100%', padding: '20px 0', background: '#2A3942', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 12, color: '#8696A0', cursor: 'pointer', fontSize: 14, marginBottom: 12 }}>📷 Add Photo or Video</button>}
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Type a status update..." style={{ width: '100%', background: '#2A3942', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#E9EDEF', fontSize: 14, resize: 'none', outline: 'none', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.4 }} rows={2} />
        <button onClick={post} disabled={posting} style={{ width: '100%', padding: '14px', background: posting ? '#2A3942' : '#00A884', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15, cursor: posting ? 'default' : 'pointer' }}>{posting ? 'Posting...' : '✓ Post Status'}</button>
      </div>
    </div>
  );
}

/* ─── GroupSettings ───────────────────────────────────────────────── */
function GroupSettings({ group, onClose, onUpdated, currentUserId }) {
  const [name, setName] = useState(group.name || '');
  const [desc, setDesc] = useState(group.description || '');
  const [photo, setPhoto] = useState(group.photo || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [perms, setPerms] = useState({ membersCanSend: true, membersCanEdit: false, ...group.permissions });
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('info');
  const photoRef = useRef(null);

  useEffect(() => {
    api.get(`/groups/${group._id}/members`).then(r => setMembers(r.data.members || [])).catch(() => {});
  }, []);

  const pickPhoto = e => {
    const f = e.target.files[0]; if (!f) return;
    setPhotoFile(f);
    const r = new FileReader(); r.onload = ev => setPhoto(ev.target.result); r.readAsDataURL(f);
  };

  const save = async () => {
    if (!name.trim()) { toast.error('Group name is required'); return; }
    setSaving(true);
    try {
      let photoUrl = group.photo;
      if (photoFile) {
        const result = await uploadMedia(photoFile);
        photoUrl = result.url;
      }
      await api.put(`/groups/${group._id}`, { name: name.trim(), description: desc.trim(), photo: photoUrl, permissions: perms });
      toast.success('Group updated!');
      onUpdated();
      onClose();
    } catch (e) { toast.error(e.response?.data?.error || 'Update failed'); }
    finally { setSaving(false); }
  };

  const removeMember = async uid => {
    try {
      await api.delete(`/groups/${group._id}/members/${uid}`);
      setMembers(m => m.filter(x => x._id !== uid));
      toast.success('Member removed');
    } catch { toast.error('Failed to remove member'); }
  };

  const root = { position: 'fixed', inset: 0, background: '#111B21', zIndex: 9500, display: 'flex', flexDirection: 'column', fontFamily: "'Segoe UI',system-ui,sans-serif", color: '#E9EDEF' };

  return (
    <div style={root}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#1F2C34', borderBottom: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696A0', fontSize: 22, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 16, fontWeight: 700 }}>Group Settings</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#1F2C34', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {[['info', '📋 Info'], ['members', `👥 Members (${members.length})`]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '12px 0', background: 'none', border: 'none', color: tab === t ? '#00A884' : '#8696A0', borderBottom: tab === t ? '2px solid #00A884' : '2px solid transparent', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', letterSpacing: .4 }}>{label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {tab === 'info' ? (
          <>
            {/* Photo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,#1565C0,#0D47A1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, overflow: 'hidden', position: 'relative', cursor: 'pointer' }} onClick={() => photoRef.current?.click()}>
                {photo ? <img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span>👥</span>}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22 }}>📷</span>
                </div>
              </div>
              <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickPhoto} />
              <span style={{ fontSize: 12, color: '#8696A0', marginTop: 8 }}>Tap to change photo</span>
            </div>

            <label style={{ fontSize: 12, color: '#00A884', fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: .4 }}>GROUP NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', background: '#2A3942', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: '#E9EDEF', fontSize: 15, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />

            <label style={{ fontSize: 12, color: '#00A884', fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: .4 }}>DESCRIPTION</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} style={{ width: '100%', background: '#2A3942', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: '#E9EDEF', fontSize: 14, outline: 'none', resize: 'none', marginBottom: 24, boxSizing: 'border-box', fontFamily: 'inherit' }} />

            <div style={{ fontSize: 12, color: '#8696A0', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, letterSpacing: .5 }}>Permissions</div>
            {[
              { key: 'membersCanSend', label: 'Members can send messages', icon: '💬' },
              { key: 'membersCanEdit', label: 'Members can edit group info', icon: '✏️' },
            ].map(({ key, label, icon }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span style={{ fontSize: 14 }}>{label}</span>
                </div>
                <div onClick={() => setPerms(p => ({ ...p, [key]: !p[key] }))}
                  style={{ width: 48, height: 26, borderRadius: 13, background: perms[key] ? '#00A884' : '#3B4A54', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 3, left: perms[key] ? 24 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                </div>
              </div>
            ))}

            <button onClick={save} disabled={saving} style={{ width: '100%', padding: 14, background: saving ? '#2A3942' : '#00A884', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15, cursor: saving ? 'default' : 'pointer', marginTop: 24 }}>
              {saving ? 'Saving...' : '✓ Save Changes'}
            </button>
          </>
        ) : (
          <>
            {members.map(m => (
              <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                <div style={{ ...av(44), flexShrink: 0 }}>
                  {m.profilePic ? <img src={m.profilePic} style={avImg} alt="" /> : m.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: '#8696A0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                </div>
                {m._id !== currentUserId && (
                  <button onClick={() => removeMember(m._id)} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            {members.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: '#8696A0' }}>No members yet</div>}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── MicIcon ─────────────────────────────────────────────────────── */
const MicIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="2" width="6" height="12" rx="3" fill="#fff" />
    <path d="M5 11C5 14.866 8.13401 18 12 18C15.866 18 19 14.866 19 11" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="18" x2="12" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <line x1="8" y1="22" x2="16" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* ─── AdminChat (main) ────────────────────────────────────────────── */
export default function AdminChat() {
  const { user } = useStore();
  const [tab, setTab] = useState('chats');
  const [panel, setPanel] = useState('list');
  const [parents, setParents] = useState([]);
  const [selParent, setSelParent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selGroup, setSelGroup] = useState(null);
  const [groupMsgs, setGroupMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [grpInput, setGrpInput] = useState('');
  const [parentTyping, setParentTyping] = useState({});
  const [unread, setUnread] = useState({});
  const [search, setSearch] = useState('');
  const [recording, setRecording] = useState(false);
  const [recObj, setRecObj] = useState(null);
  const [recTime, setRecTime] = useState(0);
  const [menu, setMenu] = useState(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [storyGroups, setStoryGroups] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [storyViewer, setStoryViewer] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const grpFileRef = useRef(null);
  const typingTimer = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const recTimerRef = useRef(null);

  /* ── Data loaders ── */
  const loadParents = useCallback(async () => {
    try { const r = await api.get('/admin/parents'); setParents(r.data.parents || []); } catch (e) { console.error('parents', e); }
  });
  const loadMessages = useCallback(async pid => {
    if (!pid) return;
    try { const r = await api.get(`/chat/messages/${pid}`); setMessages(r.data.messages || []); setUnread(u => ({ ...u, [pid]: 0 })); } catch (e) { console.error('msgs', e); }
  });
  const loadGroups = useCallback(async () => {
    try { const r = await api.get('/groups'); setGroups(r.data.groups || []); } catch (e) { console.error('groups', e); }
  });
  const loadGroupMsgs = useCallback(async gid => {
    try { const r = await api.get(`/groups/${gid}/messages`); setGroupMsgs(r.data.messages || []); } catch (e) { console.error('grpmsgs', e); }
  });
  const loadStories = useCallback(async () => {
    try {
      const r = await api.get('/stories');
      const all = r.data.stories || [];
      const map = {};
      all.forEach(s => { const k = s.author?._id; if (!map[k]) map[k] = { author: s.author, items: [] }; map[k].items.push(s); });
      setMyStories(map[user?._id]?.items || []);
      setStoryGroups(Object.values(map).filter(g => g.author?._id !== user?._id));
    } catch (e) { console.error('stories', e); }
  });

  useEffect(() => { loadParents(); loadGroups(); loadStories(); }, []);
  useEffect(() => { if (selParent) loadMessages(selParent._id); }, [selParent]);

  /* ── Socket events ── */
  useEffect(() => {
    const socket = getSocket(); if (!socket) return;
    const onMsg = msg => {
      const pid = msg.parentId;
      if (selParent?._id === pid) { setMessages(p => [...p, msg]); api.put(`/chat/${msg._id}/read`).catch(() => {}); }
      else setUnread(u => ({ ...u, [pid]: (u[pid] || 0) + 1 }));
    };
    const onTyping = ({ parentId, isTyping }) => setParentTyping(t => ({ ...t, [parentId]: isTyping }));
    const onDel = ({ msgId, forEveryone }) => { if (forEveryone) setMessages(p => p.map(m => m._id === msgId ? { ...m, deletedForEveryone: true } : m)); };
    const onReact = ({ msgId }) => { api.get(`/chat/message/${msgId}`).then(r => setMessages(p => p.map(m => m._id === msgId ? r.data.message : m))).catch(() => {}); };
    const onGrpMsg = msg => {
      if (selGroup?._id === msg.group) setGroupMsgs(p => [...p, msg]);
      setGroups(p => p.map(g => g._id === msg.group ? { ...g, lastMessage: msg.content || '📎', lastMessageTime: msg.createdAt } : g));
    };
    socket.on('new_message', onMsg); socket.on('user_typing', onTyping); socket.on('message_deleted', onDel); socket.on('message_reaction', onReact); socket.on('new_group_message', onGrpMsg); socket.on('new_story', loadStories); socket.on('stories_expired', loadStories);
    return () => { socket.off('new_message', onMsg); socket.off('user_typing', onTyping); socket.off('message_deleted', onDel); socket.off('message_reaction', onReact); socket.off('new_group_message', onGrpMsg); socket.off('new_story', loadStories); socket.off('stories_expired', loadStories); };
  }, [selParent, selGroup, loadStories]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, groupMsgs]);

  /* ── Typing ── */
  const handleInput = e => {
    const val = e.target.value; setInput(val);
    const socket = getSocket();
    if (socket && selParent) {
      socket.emit('typing', { isTyping: true, senderRole: 'admin', parentId: selParent._id });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => socket.emit('typing', { isTyping: false, senderRole: 'admin', parentId: selParent._id }), 1500);
    }
  };

  /* ── Send text ── */
  const sendText = () => {
    const txt = input.trim(); if (!txt || !selParent) return;
    const socket = getSocket(); if (!socket) { toast.error('Not connected'); return; }
    socket.emit('send_message', { senderId: user?._id, senderRole: 'admin', parentId: selParent._id, content: txt, messageType: 'text' });
    setInput('');
  };
  const sendGrpText = () => {
    const txt = grpInput.trim(); if (!txt || !selGroup) return;
    const socket = getSocket(); if (!socket) { toast.error('Not connected'); return; }
    socket.emit('send_group_message', { groupId: selGroup._id, senderId: user?._id, senderRole: 'admin', content: txt, messageType: 'text' });
    setGrpInput('');
  };

  /* ── FIX: Send media via Cloudinary ── */
  const sendMedia = async (file, isGrp = false) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { toast.error('Images/videos only'); return; }
    const socket = getSocket(); if (!socket) { toast.error('Not connected'); return; }

    const tid = toast.loading('Uploading media...');
    try {
      const result = await uploadMedia(file, ({ label }) => toast.loading(label, { id: tid }));
      toast.success('Sent! ✓', { id: tid });
      const p = {
        senderId: user?._id, senderRole: 'admin', content: '',
        messageType: file.type.startsWith('image/') ? 'image' : 'video',
        mediaData: result.url,
        mediaMimeType: file.type,
      };
      if (isGrp && selGroup) socket.emit('send_group_message', { ...p, groupId: selGroup._id });
      else if (selParent) socket.emit('send_message', { ...p, parentId: selParent._id });
    } catch (e) { toast.error('Upload failed: ' + e.message, { id: tid }); }
  };

  /* ── FIX: Voice recording with waveform + Cloudinary ── */
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up AudioContext + AnalyserNode for waveform
      audioCtxRef.current = new AudioContext();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType });
      const ch = [];
      mr.ondataavailable = e => { if (e.data.size > 0) ch.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        audioCtxRef.current?.close();
        analyserRef.current = null;

        const blob = new Blob(ch, { type: mimeType });
        const file = new File([blob], 'voice.webm', { type: mimeType });
        const socket = getSocket(); if (!socket) return;

        const tid = toast.loading('Sending voice message...');
        try {
          const result = await uploadMedia(file);
          toast.success('Voice sent! ✓', { id: tid });
          const p = { senderId: user?._id, senderRole: 'admin', content: '', messageType: 'voice', mediaData: result.url, mediaMimeType: mimeType };
          if (selGroup && panel === 'group') socket.emit('send_group_message', { ...p, groupId: selGroup._id });
          else if (selParent) socket.emit('send_message', { ...p, parentId: selParent._id });
        } catch (e) { toast.error('Voice send failed: ' + e.message, { id: tid }); }
      };

      mr.start(100);
      setRecObj(mr);
      setRecording(true);
      setRecTime(0);
      recTimerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    } catch (err) {
      if (err.name === 'NotAllowedError') toast.error('Microphone permission denied');
      else toast.error('Mic error: ' + err.message);
    }
  };

  const stopRec = () => {
    recObj?.stop();
    setRecording(false);
    setRecObj(null);
    clearInterval(recTimerRef.current);
    setRecTime(0);
  };

  const cancelRec = () => {
    if (recObj) { recObj.onstop = null; recObj.stop(); }
    setRecording(false); setRecObj(null);
    clearInterval(recTimerRef.current); setRecTime(0);
    audioCtxRef.current?.close(); analyserRef.current = null;
    toast('Recording cancelled', { icon: '🗑' });
  };

  /* ── Delete / React ── */
  const doDelete = async (msgId, forAll) => {
    try {
      await api.delete(`/chat/${msgId}`, { data: { forEveryone: forAll } });
      if (forAll) setMessages(p => p.map(m => m._id === msgId ? { ...m, deletedForEveryone: true } : m));
      else setMessages(p => p.filter(m => m._id !== msgId));
      setMenu(null);
    } catch { toast.error('Delete failed'); }
  };
  const doReact = async (msgId, emoji) => { try { await api.put(`/chat/${msgId}/react`, { emoji }); setMenu(null); } catch {} };

  /* ── Utils ── */
  const groupMsgsByDay = arr => arr.reduce((acc, m) => {
    const day = fmtDay(m.createdAt);
    if (!acc.length || acc[acc.length - 1].day !== day) acc.push({ day, msgs: [m] });
    else acc[acc.length - 1].msgs.push(m);
    return acc;
  }, []);

  const filtered = parents.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()));
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  const allSG = [...(myStories.length ? [{ author: user, items: myStories, isMe: true }] : []), ...storyGroups.map(g => ({ ...g, isMe: false }))];

  const root = { display: 'flex', flexDirection: 'column', height: '100dvh', background: '#111B21', color: '#E9EDEF', fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: 'hidden' };
  const mb = { display: 'block', width: '100%', padding: '14px 18px', background: 'none', border: 'none', color: '#E9EDEF', fontSize: 15, textAlign: 'left', cursor: 'pointer' };

  /* ─── Context Menu ─── */
  const CtxMenu = () => !menu ? null : (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setMenu(null)}>
      <div style={{ background: '#233138', borderRadius: 14, overflow: 'hidden', width: 250, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 8px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(e => <button key={e} onClick={() => doReact(menu.msg._id, e)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', padding: '2px 4px' }}>{e}</button>)}
        </div>
        {menu.msg.mediaData && !menu.msg.deletedForEveryone && <button onClick={() => { window.open(menu.msg.mediaData, '_blank'); setMenu(null); }} style={mb}>⬇ Download</button>}
        <button onClick={() => doDelete(menu.msg._id, false)} style={{ ...mb, color: '#FC8181' }}>🗑 Delete for me</button>
        {menu.msg.senderRole === 'admin' && !menu.msg.deletedForEveryone && <button onClick={() => doDelete(menu.msg._id, true)} style={{ ...mb, color: '#FC8181' }}>🗑 Delete for everyone</button>}
        <button onClick={() => setMenu(null)} style={{ ...mb, color: '#8696A0', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>Cancel</button>
      </div>
    </div>
  );

  /* ─── Recording Bar ─── */
  const RecordingBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 8px', background: '#1F2C34', flexShrink: 0 }}>
      <button onClick={cancelRec} style={{ ...iconBtnStyle, color: '#EF4444', background: 'rgba(239,68,68,0.15)' }}>🗑</button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#2A3942', borderRadius: 24, padding: '8px 14px' }}>
        <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 700, minWidth: 36 }}>
          {`${Math.floor(recTime / 60)}:${String(recTime % 60).padStart(2, '0')}`}
        </span>
        <RecordingWaveform analyserRef={analyserRef} isRecording={recording} />
        <span style={{ fontSize: 11, color: '#8696A0' }}>Recording...</span>
      </div>
      <button onMouseUp={stopRec} onTouchEnd={stopRec} style={{ ...sendBtnStyle, background: '#EF4444' }}>⏹</button>
    </div>
  );

  /* ─── DM panel ─── */
  if (panel === 'dm' && selParent) return (
    <div style={root}>
      <CtxMenu />
      {showGroupSettings && selGroup && <GroupSettings group={selGroup} onClose={() => setShowGroupSettings(false)} onUpdated={() => { loadGroups(); loadGroupMsgs(selGroup._id); }} currentUserId={user?._id} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1F2C34', flexShrink: 0, borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => { setPanel('list'); setSelParent(null); setMessages([]); }} style={{ background: 'none', border: 'none', color: '#8696A0', fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0' }}>←</button>
        <div style={av(38)}>{selParent.profilePic ? <img src={selParent.profilePic} style={avImg} alt="" /> : <span>{selParent.name?.[0]?.toUpperCase()}</span>}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{selParent.name}</div>
          {parentTyping[selParent._id] ? <div style={{ fontSize: 12, color: '#00A884' }}>typing...</div> : <div style={{ fontSize: 12, color: '#8696A0' }}>Parent</div>}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0 4px' }}>
        {messages.length === 0 && <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8696A0' }}><div style={{ fontSize: 48, marginBottom: 10 }}>💬</div><div>No messages yet</div></div>}
        {groupMsgsByDay(messages).map((grp, gi) => (
          <div key={gi}>
            <div style={{ textAlign: 'center', margin: '8px 0' }}><span style={{ background: '#1F2C34', padding: '4px 12px', borderRadius: 8, fontSize: 11, color: '#8696A0', border: '0.5px solid rgba(255,255,255,0.06)' }}>{grp.day}</span></div>
            {grp.msgs.map(m => { const isMe = m.senderRole === 'admin'; return <Bubble key={m._id} msg={m} isMe={isMe} showName={false} onLongPress={msg => setMenu({ msg })} />; })}
          </div>))}
        <div ref={bottomRef} />
      </div>
      {recording ? <RecordingBar /> : (
        <div style={inputBarStyle}>
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { sendMedia(e.target.files[0]); e.target.value = ''; }} />
          <button onClick={() => fileRef.current?.click()} style={iconBtnStyle}>📎</button>
          <textarea value={input} onChange={handleInput} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }} placeholder="Message" rows={1} style={textareaStyle} />
          {input.trim()
            ? <button onClick={sendText} style={sendBtnStyle}>➤</button>
            : <button style={{ ...sendBtnStyle, background: '#00A884' }} onMouseDown={startRec} onTouchStart={e => { e.preventDefault(); startRec(); }}><MicIcon /></button>}
        </div>
      )}
    </div>
  );

  /* ─── Group panel ─── */
  if (panel === 'group' && selGroup) return (
    <div style={root}>
      <CtxMenu />
      {showGroupSettings && <GroupSettings group={selGroup} onClose={() => setShowGroupSettings(false)} onUpdated={() => { loadGroups(); if (selGroup) loadGroupMsgs(selGroup._id); setSelGroup(g => ({ ...g })); }} currentUserId={user?._id} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1F2C34', flexShrink: 0, borderBottom: '0.5px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
        onClick={() => setShowGroupSettings(true)}>
        <button onClick={e => { e.stopPropagation(); setPanel('list'); setSelGroup(null); setGroupMsgs([]); }} style={{ background: 'none', border: 'none', color: '#8696A0', fontSize: 22, cursor: 'pointer', padding: '0 8px 0 0' }}>←</button>
        <div style={{ ...av(38), background: 'linear-gradient(135deg,#1565C0,#0D47A1)' }}>{selGroup.photo ? <img src={selGroup.photo} style={avImg} alt="" /> : <span style={{ fontSize: 16 }}>👥</span>}</div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selGroup.name}</div>
          <div style={{ fontSize: 12, color: '#8696A0' }}>{selGroup.members?.length || 0} members · Tap for settings</div>
        </div>
        <span style={{ color: '#8696A0', fontSize: 18 }}>⚙</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0 4px' }}>
        {groupMsgs.length === 0 && <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8696A0' }}><div style={{ fontSize: 48, marginBottom: 10 }}>👥</div><div>No messages yet</div></div>}
        {groupMsgsByDay(groupMsgs).map((grp, gi) => (
          <div key={gi}>
            <div style={{ textAlign: 'center', margin: '8px 0' }}><span style={{ background: '#1F2C34', padding: '4px 12px', borderRadius: 8, fontSize: 11, color: '#8696A0', border: '0.5px solid rgba(255,255,255,0.06)' }}>{grp.day}</span></div>
            {grp.msgs.map(m => { const isMe = (m.sender?._id || m.sender) === user?._id; return <Bubble key={m._id} msg={m} isMe={isMe} showName={!isMe} onLongPress={msg => setMenu({ msg })} />; })}
          </div>))}
        <div ref={bottomRef} />
      </div>
      {recording ? <RecordingBar /> : (
        <div style={inputBarStyle}>
          <input ref={grpFileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { sendMedia(e.target.files[0], true); e.target.value = ''; }} />
          <button onClick={() => grpFileRef.current?.click()} style={iconBtnStyle}>📎</button>
          <textarea value={grpInput} onChange={e => setGrpInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGrpText(); } }} placeholder="Message" rows={1} style={textareaStyle} />
          {grpInput.trim()
            ? <button onClick={sendGrpText} style={sendBtnStyle}>➤</button>
            : <button style={{ ...sendBtnStyle, background: '#00A884' }} onMouseDown={startRec} onTouchStart={e => { e.preventDefault(); startRec(); }}><MicIcon /></button>}
        </div>
      )}
    </div>
  );

  /* ─── List + Updates ─── */
  return (
    <div style={root}>
      {showNewGroup && <CreateGroupSheet onClose={() => setShowNewGroup(false)} onCreated={() => { setShowNewGroup(false); loadGroups(); }} />}
      {showCreate && <CreateStory onClose={() => setShowCreate(false)} onPosted={() => { setShowCreate(false); loadStories(); }} />}
      {storyViewer != null && <StoryViewer groups={allSG} groupIdx={storyViewer} onClose={() => setStoryViewer(null)} currentUserId={user?._id} />}

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#1F2C34', flexShrink: 0, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => setTab('chats')} style={{ flex: 1, padding: '13px 0', textAlign: 'center', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: tab === 'chats' ? '#00A884' : '#8696A0', borderBottom: tab === 'chats' ? '2px solid #00A884' : '2px solid transparent', background: 'none', border: 'none', textTransform: 'uppercase', letterSpacing: .5, position: 'relative' }}>
          💬 Chats {totalUnread > 0 && <span style={{ position: 'absolute', top: 8, right: '20%', background: '#00A884', color: '#fff', borderRadius: 10, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>{totalUnread}</span>}
        </button>
        <button onClick={() => setTab('updates')} style={{ flex: 1, padding: '13px 0', textAlign: 'center', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: tab === 'updates' ? '#00A884' : '#8696A0', borderBottom: tab === 'updates' ? '2px solid #00A884' : '2px solid transparent', background: 'none', border: 'none', textTransform: 'uppercase', letterSpacing: .5 }}>
          🔵 Updates
        </button>
      </div>

      {tab === 'updates' ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '8px 16px 4px', fontSize: 12, color: '#8696A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>My status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }} onClick={myStories.length ? () => setStoryViewer(0) : () => setShowCreate(true)}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', padding: 2, background: myStories.length ? 'linear-gradient(135deg,#25D366,#128C7E)' : 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ ...av(50), borderRadius: '50%' }}>{user?.profilePic ? <img src={user.profilePic} style={avImg} alt="" /> : <span>{user?.name?.[0]?.toUpperCase()}</span>}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); setShowCreate(true); }} style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: '#00A884', border: '2px solid #111B21', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>My status</div>
              <div style={{ fontSize: 13, color: '#8696A0' }}>{myStories.length ? `${myStories.length} update${myStories.length > 1 ? 's' : ''} · Tap to view` : 'Tap to add status update'}</div>
            </div>
          </div>
          {storyGroups.length > 0 && <>
            <div style={{ padding: '8px 16px 4px', fontSize: 12, color: '#8696A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5 }}>Recent updates</div>
            {storyGroups.map((g, gi) => (
              <div key={g.author?._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }} onClick={() => setStoryViewer(gi + 1)}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', padding: 2, background: 'linear-gradient(135deg,#25D366,#128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ ...av(50), borderRadius: '50%' }}>{g.author?.profilePic ? <img src={g.author.profilePic} style={avImg} alt="" /> : <span>{g.author?.name?.[0]?.toUpperCase()}</span>}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{g.author?.name}</div>
                  <div style={{ fontSize: 13, color: '#8696A0' }}>{timeLeft(g.items[g.items.length - 1]?.expiresAt)}</div>
                </div>
              </div>
            ))}
          </>}
          {!storyGroups.length && !myStories.length && <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8696A0' }}><div style={{ fontSize: 52, marginBottom: 12 }}>📷</div><div style={{ fontSize: 15, fontWeight: 600 }}>No status updates</div></div>}
        </div>
      ) : (
        <>
          <div style={{ padding: '8px 12px', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search parents..." style={{ flex: 1, padding: '9px 14px', background: '#2A3942', border: 'none', borderRadius: 20, color: '#E9EDEF', fontSize: 14, outline: 'none' }} />
            <button onClick={() => setShowNewGroup(true)} style={{ ...iconBtnStyle, background: '#00A884', color: '#fff' }} title="New Group">👥</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {groups.length > 0 && <div style={{ padding: '6px 16px 3px', fontSize: 12, color: '#8696A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, background: 'rgba(0,0,0,0.12)' }}>Groups</div>}
            {groups.map(g => (
              <div key={g._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}
                onClick={() => { setSelGroup(g); loadGroupMsgs(g._id); setPanel('group'); }}>
                <div style={{ ...av(52), background: 'linear-gradient(135deg,#1565C0,#0D47A1)', flexShrink: 0 }}>{g.photo ? <img src={g.photo} style={avImg} alt="" /> : <span style={{ fontSize: 22 }}>👥</span>}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                    {g.lastMessageTime && <span style={{ fontSize: 12, color: '#8696A0', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8 }}>{fmtTime(g.lastMessageTime)}</span>}
                  </div>
                  <span style={{ fontSize: 13, color: '#8696A0', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.lastMessage || `${g.members?.length || 0} members`}</span>
                </div>
              </div>
            ))}

            <div style={{ padding: '6px 16px 3px', fontSize: 12, color: '#8696A0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, background: 'rgba(0,0,0,0.12)' }}>Parents</div>
            {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8696A0' }}><div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>No parents found</div>}
            {filtered.map(p => {
              const u = unread[p._id] || 0; const typing = parentTyping[p._id];
              return (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}
                  onClick={() => { setSelParent(p); setPanel('dm'); }}>
                  <div style={{ ...av(52), flexShrink: 0 }}>{p.profilePic ? <img src={p.profilePic} style={avImg} alt="" /> : <span>{p.name?.[0]?.toUpperCase()}</span>}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      {u > 0 && <span style={{ background: '#00A884', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{u}</span>}
                    </div>
                    <span style={{ fontSize: 13, color: typing ? '#00A884' : '#8696A0' }}>{typing ? 'typing...' : p.email}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <style>{`*::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}
