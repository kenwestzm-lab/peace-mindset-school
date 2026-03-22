import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { uploadMedia } from '../../utils/mediaUpload';
import toast from 'react-hot-toast';

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

function StoryViewer({ stories, startIdx, onClose, userId, onLike, onDelete }) {
  const [idx, setIdx] = useState(startIdx || 0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const story = stories[idx];
  const isMyStory = story?.author?._id === userId || story?.author === userId;
  const mediaUrl = story?.mediaData || story?.mediaUrl;

  useEffect(() => {
    setProgress(0);
    if (story?._id) api.put(`/stories/${story._id}/view`).catch(() => {});
    if (story?.mediaType !== 'video') {
      const start = Date.now(); const dur = 6000;
      const tick = () => {
        const pct = Math.min(100, ((Date.now()-start)/dur)*100);
        setProgress(pct);
        if (pct < 100) rafRef.current = requestAnimationFrame(tick);
        else { if (idx < stories.length-1) setIdx(i=>i+1); else onClose(); }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [idx]);

  if (!story) return null;

  return (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:9999, display:'flex', flexDirection:'column' }}>
      {/* Progress */}
      <div style={{ display:'flex', gap:3, padding:'12px 12px 0', flexShrink:0 }}>
        {stories.map((_,i) => (
          <div key={i} style={{ flex:1, height:3, background:'rgba(255,255,255,0.25)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'#fff', width:`${i<idx?100:i===idx?progress:0}%`, transition:'none' }}/>
          </div>
        ))}
      </div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#9B1826,#C02035)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff' }}>
          {story.author?.profilePic ? <img src={story.author.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : story.author?.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#fff' }}>{story.author?.name}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>{timeLeft(story.expiresAt)}</div>
        </div>
        {isMyStory && <button onClick={()=>{onDelete(story._id);onClose();}} style={{ background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.4)', color:'#FC8181', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:12 }}>🗑 Delete</button>}
        <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', fontSize:24, cursor:'pointer', padding:4 }}>✕</button>
      </div>
      {/* Content */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}
        onClick={e => {
          const w = e.currentTarget.offsetWidth;
          if (e.clientX < w*0.3) { if(idx>0) setIdx(i=>i-1); }
          else if (e.clientX > w*0.7) { if(idx<stories.length-1) setIdx(i=>i+1); else onClose(); }
        }}>
        {story.mediaType==='image'&&mediaUrl&&<img src={mediaUrl} alt="" style={{ maxWidth:'100%', maxHeight:'80vh', objectFit:'contain' }}/>}
        {story.mediaType==='video'&&mediaUrl&&<video src={mediaUrl} autoPlay controls playsInline style={{ maxWidth:'100%', maxHeight:'80vh' }} onEnded={()=>{if(idx<stories.length-1)setIdx(i=>i+1);else onClose();}}/>}
        {story.mediaType==='text'&&<div style={{ width:'100%', height:'80vh', background:story.bgColor||'#6B0F1A', display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
          <p style={{ fontSize:26, color:'#fff', textAlign:'center', fontWeight:600, lineHeight:1.5 }}>{story.text}</p>
        </div>}
        {story.audioUrl&&story.mediaType!=='text'&&<audio src={story.audioUrl} autoPlay loop style={{ display:'none' }}/>}
        {story.text&&story.mediaType!=='text'&&<div style={{ position:'absolute', bottom:16, left:0, right:0, padding:'0 20px' }}>
          <p style={{ color:'#fff', textAlign:'center', fontSize:15, background:'rgba(0,0,0,0.5)', padding:'8px 16px', borderRadius:12 }}>{story.text}</p>
        </div>}
      </div>
      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 20px 28px', flexShrink:0 }}>
        <button onClick={()=>onLike(story._id)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:14 }}>
          <span style={{ fontSize:22 }}>❤️</span>{story.likes?.length||0}
        </button>
        <div style={{ marginLeft:'auto', fontSize:12, color:'rgba(255,255,255,0.5)' }}>👁 {story.views?.length||0} views</div>
      </div>
    </div>
  );
}

export default function AdminStories() {
  const { user } = useStore();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null); // { stories, idx }
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [bgColor, setBgColor] = useState('#6B0F1A');
  const [media, setMedia] = useState(null);
  const [audio, setAudio] = useState(null);
  const [uploadProg, setUploadProg] = useState(null);
  const fileRef = useRef(null);
  const audioRef = useRef(null);

  const load = async () => {
    try { const r=await api.get('/stories'); setStories(r.data.stories||[]); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const s = getSocket();
    if (s) {
      s.on('new_story', load);
      s.on('story_deleted', load);
      s.on('stories_expired', load);
      s.on('story_liked', load);
    }
    return () => { s?.off('new_story'); s?.off('story_deleted'); s?.off('stories_expired'); s?.off('story_liked'); };
  }, []);

  const handleMediaFile = async e => {
    const f = e.target.files[0]; if(!f) return;
    const isImg = f.type.startsWith('image/'), isVid = f.type.startsWith('video/');
    if (!isImg && !isVid) { toast.error('Images and videos only'); return; }
    if (f.size > 200*1024*1024) { toast.error('Max 200MB for stories'); return; }
    try {
      setUploadProg({ pct:5, label:'Processing...' });
      const result = await uploadMedia(f, p => setUploadProg(p));
      setMedia({ url:result.url, type:isImg?'image':'video', mimeType:result.mimeType, sizeKB:result.sizeKB });
      setUploadProg(null);
      toast.success(`✅ ${isImg?'Photo':'Video'} ready`);
    } catch(e) { toast.error('Failed: '+e.message); setUploadProg(null); }
    e.target.value='';
  };

  const handleAudioFile = async e => {
    const f = e.target.files[0]; if(!f) return;
    if (!f.type.startsWith('audio/')) { toast.error('Audio files only'); return; }
    if (f.size > 20*1024*1024) { toast.error('Max 20MB audio'); return; }
    try {
      setUploadProg({ pct:10, label:'Uploading audio...' });
      const result = await uploadMedia(f, p => setUploadProg(p));
      setAudio({ url:result.url, name:f.name, mimeType:result.mimeType });
      setUploadProg(null);
      toast.success('🎵 Audio ready');
    } catch(e) { toast.error('Audio upload failed'); setUploadProg(null); }
    e.target.value='';
  };

  const post = async () => {
    if (!storyText.trim() && !media) { toast.error('Add text or media'); return; }
    setCreating(true);
    try {
      await api.post('/stories', {
        mediaType: media ? media.type : 'text',
        mediaData: media?.url || null,
        mediaMimeType: media?.mimeType || null,
        audioUrl: audio?.url || null,
        audioName: audio?.name || null,
        text: storyText.trim() || null,
        bgColor,
      });
      toast.success('Story posted! Disappears in 24h');
      setShowCreate(false); setStoryText(''); setMedia(null); setAudio(null); setBgColor('#6B0F1A');
      load();
    } catch(e) { toast.error(e.response?.data?.error||'Failed to post'); }
    finally { setCreating(false); }
  };

  const handleLike = async id => { try { await api.put(`/stories/${id}/like`); load(); } catch {} };
  const handleDelete = async id => { try { await api.delete(`/stories/${id}`); toast.success('Deleted'); load(); } catch { toast.error('Delete failed'); } };

  // Group by author
  const grouped = stories.reduce((acc,s) => {
    const id = s.author?._id||s.author;
    if (!acc[id]) acc[id] = { author:s.author, stories:[] };
    acc[id].stories.push(s); return acc;
  }, {});
  const groups = Object.values(grouped);
  const colors = ['#6B0F1A','#0D47A1','#1B5E20','#4A148C','#E65100','#37474F','#000000'];

  return (
    <div style={{ padding:'0 0 80px', maxWidth:700, margin:'0 auto' }}>
      {/* Story viewer */}
      {viewing && <StoryViewer stories={viewing.stories} startIdx={viewing.idx} userId={user._id} onClose={()=>setViewing(null)} onLike={handleLike} onDelete={handleDelete}/>}

      {/* Header */}
      <div style={{ padding:'20px 16px 0', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h2 style={{ fontSize:22, fontWeight:700, color:'var(--text)' }}>📖 Stories</h2>
        <button onClick={()=>setShowCreate(true)} style={{ padding:'10px 18px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:12, color:'#fff', fontWeight:600, cursor:'pointer', fontSize:14 }}>+ Post Story</button>
      </div>

      {/* Story rings */}
      <div style={{ padding:'0 16px 16px', display:'flex', gap:14, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        {/* My story ring */}
        <div onClick={()=>setShowCreate(true)} style={{ flexShrink:0, textAlign:'center', cursor:'pointer' }}>
          <div style={{ width:70, height:70, borderRadius:'50%', background:'linear-gradient(135deg,#1F2C34,#2A3942)', border:'2px dashed rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 5px', fontSize:26 }}>+</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>Post Story</div>
        </div>
        {groups.map((g,gi) => (
          <div key={g.author?._id||gi} onClick={()=>setViewing({stories:g.stories,idx:0})} style={{ flexShrink:0, textAlign:'center', cursor:'pointer' }}>
            <div style={{ width:70, height:70, borderRadius:'50%', overflow:'hidden', border:'3px solid var(--maroon)', margin:'0 auto 5px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:'#fff' }}>
              {g.author?.profilePic ? <img src={g.author.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : g.author?.name?.[0]?.toUpperCase()||'?'}
            </div>
            <div style={{ fontSize:11, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:70 }}>{g.author?.name?.split(' ')[0]}</div>
            <div style={{ fontSize:9, color:'var(--text-muted)' }}>{g.stories.length} stor{g.stories.length===1?'y':'ies'}</div>
          </div>
        ))}
      </div>

      {/* Stories grid */}
      <div style={{ padding:'0 16px' }}>
        {loading ? <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner spinner-dark"/></div>
        : stories.length===0 ? <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📖</div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text)' }}>No stories yet</div>
          <div style={{ fontSize:13, marginTop:6 }}>Be the first to post one!</div>
        </div>
        : stories.map(story => {
          const isMe = (story.author?._id||story.author)===user._id;
          const g = groups.find(g=>(g.author?._id||g.author)===(story.author?._id||story.author));
          return (
            <div key={story._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer' }}
              onClick={()=>setViewing({stories:g?.stories||[story],idx:0})}>
              <div style={{ width:52, height:52, borderRadius:'50%', overflow:'hidden', border:`3px solid ${isMe?'#25D366':'var(--maroon)'}`, flexShrink:0, background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:'#fff' }}>
                {story.author?.profilePic ? <img src={story.author.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : story.author?.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14, color:'var(--text)' }}>{isMe?'My Story':story.author?.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  {story.mediaType==='text'?(story.text?.substring(0,35)||'Text'):story.mediaType==='image'?'📷 Photo':'🎥 Video'} · {timeLeft(story.expiresAt)}
                  {story.audioUrl&&' · 🎵'}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>❤️ {story.likes?.length||0}</span>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>👁 {story.views?.length||0}</span>
                {isMe&&<button onClick={e=>{e.stopPropagation();handleDelete(story._id);}} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#FC8181', borderRadius:8, padding:'4px 8px', cursor:'pointer', fontSize:11 }}>🗑</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create story modal */}
      {showCreate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:500, display:'flex', alignItems:'flex-end' }}>
          <div style={{ background:'#1F2C34', borderRadius:'24px 24px 0 0', padding:22, width:'100%', maxHeight:'90vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ color:'#E9EDEF', fontWeight:700, fontSize:18 }}>Post Story</h3>
              <button onClick={()=>{setShowCreate(false);setStoryText('');setMedia(null);setAudio(null);}} style={{ background:'none', border:'none', color:'#8696A0', fontSize:22, cursor:'pointer' }}>✕</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleMediaFile} style={{display:'none'}}/>
            <input ref={audioRef} type="file" accept="audio/*" onChange={handleAudioFile} style={{display:'none'}}/>

            {/* Media preview */}
            {media && (
              <div style={{ position:'relative', borderRadius:14, overflow:'hidden', maxHeight:220 }}>
                {media.type==='image'?<img src={media.url} style={{width:'100%',maxHeight:220,objectFit:'cover'}} alt=""/>:<video src={media.url} style={{width:'100%',maxHeight:220}} controls playsInline/>}
                <button onClick={()=>setMedia(null)} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.7)', border:'none', color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:14 }}>✕</button>
              </div>
            )}

            {/* Upload progress */}
            {uploadProg && <div style={{ padding:'8px 12px', background:'rgba(37,211,102,0.08)', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.08)', borderRadius:2 }}><div style={{ height:'100%', width:`${uploadProg.pct||0}%`, background:'#25D366', transition:'width 0.3s' }}/></div>
              <span style={{ fontSize:11, color:'#25D366' }}>{uploadProg.label}</span>
            </div>}

            <textarea value={storyText} onChange={e=>setStoryText(e.target.value)} placeholder="What's on your mind? (optional with media)" rows={3}
              style={{ padding:'12px', background:'#2A3942', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, color:'#E9EDEF', fontSize:14, resize:'none', outline:'none' }}/>

            {/* BG color for text stories */}
            {!media && <div>
              <p style={{ fontSize:11, color:'#8696A0', marginBottom:6 }}>Background color:</p>
              <div style={{ display:'flex', gap:8 }}>
                {colors.map(c=><div key={c} onClick={()=>setBgColor(c)} style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer', border:bgColor===c?'3px solid #25D366':'3px solid transparent', boxSizing:'border-box' }}/>)}
              </div>
            </div>}

            {/* Audio badge */}
            {audio && <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(255,255,255,0.05)', borderRadius:10 }}>
              <span>🎵</span><span style={{ fontSize:13, color:'#E9EDEF', flex:1 }}>{audio.name}</span>
              <button onClick={()=>setAudio(null)} style={{ background:'none', border:'none', color:'#FC8181', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>fileRef.current?.click()} style={{ flex:1, padding:'12px', background:'#2A3942', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, color:'#E9EDEF', cursor:'pointer', fontSize:13 }}>📎 Photo/Video</button>
              <button onClick={()=>audioRef.current?.click()} style={{ flex:1, padding:'12px', background:'#2A3942', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, color:'#E9EDEF', cursor:'pointer', fontSize:13 }}>🎵 Add Music</button>
            </div>
            <button onClick={post} disabled={creating||!!uploadProg} style={{ padding:'14px', background:'linear-gradient(135deg,var(--maroon),var(--maroon-light))', border:'none', borderRadius:14, color:'#fff', cursor:'pointer', fontWeight:700, fontSize:15 }}>
              {creating?'Posting...':'🕊 Post Story (24hrs)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
