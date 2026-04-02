import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { compressImage, compressVideo, formatSize, shareMedia, downloadMedia } from '../../utils/media';
import toast from 'react-hot-toast';
import { trimAudioTo30Seconds, formatDuration } from '../../utils/audioTrim';

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

function StoryViewer({ stories, startIdx, onClose, userId, onLike, onDelete }) {
  const [idx, setIdx] = useState(startIdx);
  const [progress, setProgress] = useState(0);
  const story = stories[idx];
  const progressRef = useRef(null);
  const isMyStory = story?.author?._id === userId || story?.author === userId;

  useEffect(() => {
    setProgress(0);
    // Mark as viewed
    if (story?._id) {
      api.put(`/stories/${story._id}/view`).catch(() => {});
    }
    // Auto-advance after 5s for image/text, skip for video
    if (story?.mediaType !== 'video') {
      const start = Date.now();
      const dur = 5000;
      const tick = () => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, (elapsed / dur) * 100);
        setProgress(pct);
        if (elapsed < dur) progressRef.current = requestAnimationFrame(tick);
        else { if (idx < stories.length - 1) setIdx(i => i + 1); else onClose(); }
      };
      progressRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(progressRef.current);
    }
  }, [idx]);

  if (!story) return null;

  return (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:9999, display:'flex', flexDirection:'column' }}>
      {/* Progress bars */}
      <div style={{ display:'flex', gap:3, padding:'12px 12px 0', flexShrink:0 }}>
        {stories.map((_, i) => (
          <div key={i} style={{ flex:1, height:3, background:'rgba(255,255,255,0.25)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'#fff', width:`${i < idx ? 100 : i === idx ? progress : 0}%`, transition:'none' }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#9B1826,#C02035)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff', overflow:'hidden' }}>
          {story.author?.profilePic ? <img src={story.author.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt="" onError={e=>e.target.style.display='none'}/> : story.author?.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'#fff' }}>{story.author?.name}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>{timeLeft(story.expiresAt)}</div>
        </div>
        {isMyStory && (
          <button onClick={() => { onDelete(story._id); onClose(); }} style={{ background:'rgba(239,68,68,0.2)', border:'1px solid rgba(239,68,68,0.4)', color:'#FC8181', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:12 }}>🗑</button>
        )}
        <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', fontSize:24, cursor:'pointer' }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}
        onClick={(e) => {
          const w = e.currentTarget.offsetWidth;
          if (e.clientX < w * 0.3) { if (idx > 0) setIdx(i=>i-1); }
          else if (e.clientX > w * 0.7) { if (idx < stories.length-1) setIdx(i=>i+1); else onClose(); }
        }}
      >
        {story.mediaType === 'image' && story.mediaData && (
          <img src={story.mediaData} alt="" style={{ maxWidth:'100%', maxHeight:'80vh', objectFit:'contain' }} />
        )}
        {story.mediaType === 'video' && story.mediaData && (
          <video src={story.mediaData} autoPlay controls style={{ maxWidth:'100%', maxHeight:'80vh' }} onEnded={() => { if(idx<stories.length-1) setIdx(i=>i+1); else onClose(); }} />
        )}
        {story.mediaType === 'text' && (
          <div style={{ width:'100%', height:'80vh', background:story.bgColor||'#6B0F1A', display:'flex', alignItems:'center', justifyContent:'center', padding:40 }}>
            <p style={{ fontSize:24, color:'#fff', textAlign:'center', fontWeight:600, lineHeight:1.5, fontFamily:'var(--font-display)' }}>{story.text}</p>
          </div>
        )}
        {story.text && story.mediaType !== 'text' && (
          <div style={{ position:'absolute', bottom:16, left:0, right:0, padding:'0 20px' }}>
            <p style={{ color:'#fff', textAlign:'center', fontSize:15, background:'rgba(0,0,0,0.5)', padding:'8px 16px', borderRadius:12, backdropFilter:'blur(8px)' }}>{story.text}</p>
          </div>
        )}
      </div>

      {/* Footer: like + share + views */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 20px 24px', flexShrink:0 }}>
        <button onClick={() => onLike(story._id)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:14 }}>
          <span style={{ fontSize:22, filter: story.likes?.map(String).includes(userId) ? 'none' : 'grayscale(1)' }}>❤️</span>
          {story.likes?.length||0}
        </button>
        <button onClick={() => shareMedia(story.mediaData, story.mediaType==='image'?'story.jpg':'story.mp4')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:13 }}>↗ Share</button>
        <div style={{ marginLeft:'auto', fontSize:12, color:'rgba(255,255,255,0.5)' }}>👁 {story.views?.length||0} views</div>
      </div>
    </div>
  );
}

export default function ParentStories() {
  const { user } = useStore();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null); // { groupIdx, storyIdx }
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [bgColor, setBgColor] = useState('#6B0F1A');
  const [storyMedia, setStoryMedia] = useState(null); // { data, type, mimeType, sizeKB }
  const [mediaProgress, setMediaProgress] = useState(null);
  const fileRef = useRef(null);

  const loadStories = async () => {
    try { const r = await api.get('/stories'); setStories(r.data.stories||[]); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    loadStories();
    const s = getSocket();
    if (s) {
      s.on('new_story', () => loadStories());
      s.on('story_deleted', () => loadStories());
      s.on('stories_expired', () => loadStories());
      s.on('story_liked', () => loadStories());
    }
    return () => { s?.off('new_story'); s?.off('story_deleted'); s?.off('stories_expired'); s?.off('story_liked'); };
  }, []);

  // Group stories by author (WhatsApp style)
  const grouped = stories.reduce((acc, story) => {
    const id = story.author?._id || story.author;
    if (!acc[id]) acc[id] = { author: story.author, stories: [] };
    acc[id].stories.push(story);
    return acc;
  }, {});
  const groups = Object.values(grouped);
  const myGroup = groups.find(g => (g.author?._id||g.author) === user._id);
  const otherGroups = groups.filter(g => (g.author?._id||g.author) !== user._id);

  const handleFile = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const isImg = f.type.startsWith('image/'), isVid = f.type.startsWith('video/');
    if (!isImg && !isVid) { toast.error('Images and videos only'); return; }
    if (f.size > 1024*1024*1024) { toast.error('Max 1GB'); return; }
    try {
      if (isImg) {
        setMediaProgress({ progress: 30, label: 'Compressing...' });
        const { data, sizeKB } = await compressImage(f, 1);
        setStoryMedia({ data, type: 'image', mimeType: 'image/jpeg', sizeKB });
        setMediaProgress(null);
        toast.success(`Image ready: ${formatSize(sizeKB)}`);
      } else {
        setMediaProgress({ progress: 10, label: 'Processing video...' });
        const { data, sizeKB, mimeType } = await compressVideo(f, 15);
        setStoryMedia({ data, type: 'video', mimeType: mimeType || f.type, sizeKB });
        setMediaProgress(null);
        toast.success(`Video ready: ${formatSize(sizeKB)}`);
      }
    } catch { toast.error('Failed to process media'); setMediaProgress(null); }
    e.target.value = '';
  };

  const postStory = async () => {
    if (!storyText.trim() && !storyMedia) { toast.error('Add text or media'); return; }
    setCreating(true);
    try {
      await api.post('/stories', {
        mediaType: storyMedia ? storyMedia.type : 'text',
        mediaData: storyMedia?.data || null,
        mediaMimeType: storyMedia?.mimeType || null,
        text: storyText.trim() || null,
        bgColor,
      });
      toast.success('Story posted! Disappears in 24h');
      setShowCreate(false); setStoryText(''); setStoryMedia(null); setBgColor('#6B0F1A');
      loadStories();
    } catch { toast.error('Failed to post story'); }
    finally { setCreating(false); }
  };

  const handleLike = async (storyId) => {
    try { await api.put(`/stories/${storyId}/like`); loadStories(); } catch {}
  };
  const handleDelete = async (storyId) => {
    try { await api.delete(`/stories/${storyId}`); toast.success('Story deleted'); loadStories(); } catch { toast.error('Delete failed'); }
  };

  const bgColors = ['#6B0F1A','#0D47A1','#1B5E20','#4A148C','#E65100','#37474F','#000000','#BF360C'];

  return (
    <div style={{ padding:'0 0 80px', maxWidth:600, margin:'0 auto' }}>
      {/* Stories row (WA style) */}
      <div style={{ padding:'16px 16px 8px' }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', marginBottom:14 }}>Stories</h2>
        <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:8, WebkitOverflowScrolling:'touch' }}>
          {/* Add story card */}
          <div onClick={() => setShowCreate(true)} style={{ flexShrink:0, width:80, cursor:'pointer', textAlign:'center' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#1F2C34,#2A3942)', border:'2px dashed rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 6px', fontSize:28 }}>+</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.3 }}>My Story</div>
          </div>

          {/* My story (if any) */}
          {myGroup && (
            <div onClick={() => setViewing({ groups: [myGroup,...otherGroups], idx: 0 })} style={{ flexShrink:0, width:80, cursor:'pointer', textAlign:'center' }}>
              <div style={{ width:72, height:72, borderRadius:'50%', overflow:'hidden', border:'3px solid #25D366', margin:'0 auto 6px', background:'#1F2C34', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {myGroup.stories[0]?.mediaType==='image' && myGroup.stories[0].mediaData
                  ? <img src={myGroup.stories[0].mediaData} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                  : <div style={{fontSize:24,fontWeight:700,color:'#fff'}}>{user.name?.[0]?.toUpperCase()}</div>}
              </div>
              <div style={{ fontSize:11, color:'#25D366', lineHeight:1.3 }}>My Story</div>
            </div>
          )}

          {/* Others' stories */}
          {otherGroups.map((g, gi) => {
            const allGroups = myGroup ? [myGroup, ...otherGroups] : otherGroups;
            const groupIdx = myGroup ? gi+1 : gi;
            return (
              <div key={g.author?._id||gi} onClick={() => setViewing({ groups: allGroups, idx: groupIdx })} style={{ flexShrink:0, width:80, cursor:'pointer', textAlign:'center' }}>
                <div style={{ width:72, height:72, borderRadius:'50%', overflow:'hidden', border:'3px solid #9B1826', margin:'0 auto 6px', background:'linear-gradient(135deg,#9B1826,#C02035)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {g.author?.profilePic ? <img src={g.author.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : <div style={{fontSize:22,fontWeight:700,color:'#fff'}}>{g.author?.name?.[0]?.toUpperCase()||'?'}</div>}
                </div>
                <div style={{ fontSize:11, color:'var(--text)', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.author?.name?.split(' ')[0]||'User'}</div>
                <div style={{ fontSize:10, color:'#8696A0' }}>{g.stories.length} {g.stories.length===1?'story':'stories'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent stories list */}
      <div style={{ padding:'0 16px' }}>
        <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.08em' }}>Recent</h3>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner spinner-dark" /></div>
        ) : stories.length===0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--text-muted)' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📖</div>
            <div style={{ fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:6 }}>No stories yet</div>
            <div style={{ fontSize:13, lineHeight:1.6 }}>Be the first to share a story!<br/>Stories disappear after 24 hours.</div>
            <button onClick={() => setShowCreate(true)} style={{ marginTop:16, padding:'12px 28px', background:'linear-gradient(135deg,#9B1826,#C02035)', border:'none', borderRadius:12, color:'#fff', cursor:'pointer', fontWeight:600, fontSize:14 }}>+ Add Story</button>
          </div>
        ) : stories.map(story => {
          const isMe = (story.author?._id||story.author) === user._id;
          return (
            <div key={story._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer' }}
              onClick={() => {
                const allGroups = myGroup ? [myGroup, ...otherGroups] : otherGroups;
                const groupIdx = allGroups.findIndex(g => (g.author?._id||g.author) === (story.author?._id||story.author));
                if (groupIdx>=0) setViewing({ groups: allGroups, idx: groupIdx });
              }}
            >
              <div style={{ width:52, height:52, borderRadius:'50%', overflow:'hidden', border:`3px solid ${isMe?'#25D366':'#9B1826'}`, flexShrink:0, background:'#1F2C34', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {story.author?.profilePic ? <img src={story.author.profilePic} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : (story.mediaType==='image'&&story.mediaData ? <img src={story.mediaData} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/> : <div style={{fontSize:18,fontWeight:700,color:'#fff'}}>{story.author?.name?.[0]?.toUpperCase()}</div>)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14, color:'var(--text)' }}>{isMe?'My Story':story.author?.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  {story.mediaType==='text' ? (story.text?.substring(0,40)||'Text story') : story.mediaType==='image' ? '📷 Photo' : '🎥 Video'} · {timeLeft(story.expiresAt)}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>❤️ {story.likes?.length||0}</span>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>👁 {story.views?.length||0}</span>
                {isMe && <button onClick={e=>{e.stopPropagation();handleDelete(story._id);}} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#FC8181', borderRadius:8, padding:'4px 8px', cursor:'pointer', fontSize:11 }}>🗑</button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Story Viewer */}
      {viewing && (
        <StoryViewer
          stories={viewing.groups[viewing.idx].stories}
          startIdx={0}
          userId={user._id}
          onClose={() => setViewing(null)}
          onLike={handleLike}
          onDelete={handleDelete}
        />
      )}

      {/* Create Story Modal */}
      {showCreate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div style={{ background:'#1F2C34', borderRadius:'24px 24px 0 0', padding:24, width:'100%', maxWidth:500 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ color:'#E9EDEF', fontWeight:700, fontSize:18 }}>Add Story</h3>
              <button onClick={()=>{setShowCreate(false);setStoryText('');setStoryMedia(null);}} style={{ background:'none', border:'none', color:'#8696A0', fontSize:22, cursor:'pointer' }}>✕</button>
            </div>

            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{display:'none'}} />

            {/* Media preview */}
            {storyMedia && (
              <div style={{ position:'relative', marginBottom:16, borderRadius:14, overflow:'hidden', maxHeight:200 }}>
                {storyMedia.type==='image' ? <img src={storyMedia.data} style={{width:'100%',maxHeight:200,objectFit:'cover'}} alt="preview"/> : <video src={storyMedia.data} style={{width:'100%',maxHeight:200}} controls />}
                <button onClick={()=>setStoryMedia(null)} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.7)', border:'none', color:'#fff', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:14 }}>✕</button>
                <div style={{ position:'absolute', bottom:8, right:8, background:'rgba(0,0,0,0.7)', color:'#25D366', padding:'3px 8px', borderRadius:999, fontSize:11 }}>{formatSize(storyMedia.sizeKB)}</div>
              </div>
            )}

            {/* Media progress */}
            {mediaProgress && (
              <div style={{ marginBottom:12, padding:'8px 12px', background:'rgba(37,211,102,0.08)', borderRadius:10, display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.08)', borderRadius:2 }}><div style={{ height:'100%', width:`${mediaProgress.progress}%`, background:'#25D366' }} /></div>
                <span style={{ fontSize:11, color:'#25D366' }}>{mediaProgress.label}</span>
              </div>
            )}

            {/* Text input */}
            <textarea value={storyText} onChange={e=>setStoryText(e.target.value)} placeholder="What's on your mind? (optional with media)" rows={3}
              style={{ width:'100%', padding:'12px', background:'#2A3942', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, color:'#E9EDEF', fontSize:14, resize:'none', outline:'none', marginBottom:12 }} />

            {/* Bg color (text stories) */}
            {!storyMedia && (
              <div style={{ marginBottom:14 }}>
                <p style={{ fontSize:11, color:'#8696A0', marginBottom:6 }}>Background color:</p>
                <div style={{ display:'flex', gap:8 }}>
                  {bgColors.map(c => (
                    <div key={c} onClick={()=>setBgColor(c)} style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer', border:bgColor===c?'3px solid #25D366':'3px solid transparent', boxSizing:'border-box' }} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>fileRef.current?.click()} style={{ flex:1, padding:'12px', background:'#2A3942', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, color:'#E9EDEF', cursor:'pointer', fontSize:14 }}>📎 Add Media</button>
              <button onClick={postStory} disabled={creating||mediaProgress!==null} style={{ flex:2, padding:'12px', background:'linear-gradient(135deg,#00A884,#128C7E)', border:'none', borderRadius:12, color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14 }}>
                {creating ? 'Posting...' : '🕊 Post Story'}
              </button>
            </div>
            <p style={{ fontSize:11, color:'#8696A0', textAlign:'center', marginTop:10 }}>Stories disappear automatically after 24 hours</p>
          </div>
        </div>
      )}
    </div>
  );
}
