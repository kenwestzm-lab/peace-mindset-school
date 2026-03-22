import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import api from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { compressImage } from '../../utils/media';
import toast from 'react-hot-toast';

const BG_COLORS = ['#6B0F1A','#1A1A2E','#0F3460','#16213E','#1B4332','#2D1B69','#7B2D8B','#B5451B'];

export default function ParentStories() {
  const { user } = useStore();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newStory, setNewStory] = useState({ type:'text', text:'', bgColor:'#6B0F1A', mediaData:null, mediaMimeType:null });
  const [viewing, setViewing] = useState(null); // story being viewed
  const [viewIdx, setViewIdx] = useState(0);
  const fileRef = useRef(null);
  const progressTimer = useRef(null);
  const [progress, setProgress] = useState(0);

  const load = async () => {
    try {
      const r = await api.get('/stories');
      // Group by author
      const grouped = {};
      (r.data.stories||[]).forEach(s => {
        const id = s.author?._id;
        if (!grouped[id]) grouped[id] = { author:s.author, stories:[] };
        grouped[id].stories.push(s);
      });
      setStories(Object.values(grouped));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const s = getSocket();
    if (s) {
      s.on('new_story', load);
      s.on('story_deleted', load);
    }
    return () => { s?.off('new_story'); s?.off('story_deleted'); };
  }, []);

  // Auto-advance story
  useEffect(() => {
    if (!viewing) { clearInterval(progressTimer.current); setProgress(0); return; }
    setProgress(0);
    const storyGroup = stories.find(g=>g.author?._id===viewing);
    if (!storyGroup) return;
    const story = storyGroup.stories[viewIdx];
    if (!story) return;

    // Mark as viewed
    api.put(`/stories/${story._id}/view`).catch(()=>{});

    const duration = story.mediaType==='video' ? 15000 : 5000;
    const interval = 50;
    let elapsed = 0;
    progressTimer.current = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed/duration)*100);
      if (elapsed >= duration) {
        clearInterval(progressTimer.current);
        // Next story
        if (viewIdx < storyGroup.stories.length-1) {
          setViewIdx(i=>i+1);
        } else {
          setViewing(null); setViewIdx(0);
        }
      }
    }, interval);
    return () => clearInterval(progressTimer.current);
  }, [viewing, viewIdx]);

  const openStory = (authorId) => {
    setViewing(authorId); setViewIdx(0);
  };

  const postStory = async () => {
    try {
      await api.post('/stories', {
        mediaType: newStory.type,
        text: newStory.text,
        bgColor: newStory.bgColor,
        mediaData: newStory.mediaData,
        mediaMimeType: newStory.mediaMimeType,
      });
      toast.success('Story posted! Expires in 24 hours 🌟');
      setCreating(false);
      setNewStory({ type:'text', text:'', bgColor:'#6B0F1A', mediaData:null, mediaMimeType:null });
      load();
    } catch { toast.error('Failed to post story'); }
  };

  const handleStoryFile = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const isImage = f.type.startsWith('image/');
    const isVideo = f.type.startsWith('video/');
    if (!isImage && !isVideo) { toast.error('Only photos and videos'); return; }
    if (isImage) {
      const { data } = await compressImage(f, 0.5, 0.9);
      setNewStory(n=>({...n, type:'image', mediaData:data, mediaMimeType:'image/jpeg'}));
    } else {
      const rd = new FileReader();
      rd.onload = e => setNewStory(n=>({...n, type:'video', mediaData:e.target.result, mediaMimeType:f.type}));
      rd.readAsDataURL(f);
    }
    e.target.value='';
  };

  const likeStory = async (storyId) => {
    try { await api.put(`/stories/${storyId}/like`); load(); } catch {}
  };

  const viewingGroup = viewing ? stories.find(g=>g.author?._id===viewing) : null;
  const currentStory = viewingGroup?.stories[viewIdx];

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}><div className="spinner spinner-dark"/></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📸 Stories</h2>
          <p className="page-subtitle">Disappear after 24 hours · Share moments with the school</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setCreating(true)}>+ Add Story</button>
      </div>

      {/* Story circles */}
      <div style={{ display:'flex', gap:14, overflowX:'auto', paddingBottom:8, WebkitOverflowScrolling:'touch' }}>
        {/* My story button */}
        <div onClick={()=>setCreating(true)} style={{ flexShrink:0, textAlign:'center', cursor:'pointer' }}>
          <div style={{ width:62, height:62, borderRadius:'50%', background:'var(--bg-elevated)', border:'2px dashed rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, position:'relative', margin:'0 auto 6px' }}>
            +
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)', width:70 }}>My Story</div>
        </div>

        {stories.map(group => {
          const isMe = group.author?._id===user._id;
          const hasNew = group.stories.some(s=>!s.views?.includes(user._id));
          return (
            <div key={group.author?._id} onClick={()=>openStory(group.author?._id)} style={{ flexShrink:0, textAlign:'center', cursor:'pointer' }}>
              <div style={{
                width:62, height:62, borderRadius:'50%', margin:'0 auto 6px',
                padding:2.5,
                background:hasNew?'linear-gradient(135deg,#6B0F1A,#D4A843)':'rgba(255,255,255,0.1)',
              }}>
                <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:'var(--bg-elevated)', border:'2px solid var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:'#fff', overflow:'hidden' }}>
                  {group.stories[0]?.mediaType==='image' && group.stories[0]?.mediaData ? (
                    <img src={group.stories[0].mediaData} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
                  ) : (
                    <span>{group.author?.name?.[0]?.toUpperCase()}</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', width:70, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {isMe ? 'You' : group.author?.name?.split(' ')[0]}
              </div>
            </div>
          );
        })}

        {stories.length===0 && (
          <div style={{ padding:'20px', color:'var(--text-muted)', fontSize:13 }}>No stories yet. Be the first!</div>
        )}
      </div>

      {/* Story viewer - full screen */}
      {viewing && currentStory && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'#000', display:'flex', flexDirection:'column' }}>
          {/* Progress bars */}
          <div style={{ display:'flex', gap:3, padding:'10px 12px 6px', zIndex:10 }}>
            {viewingGroup.stories.map((s,i) => (
              <div key={i} style={{ flex:1, height:3, background:'rgba(255,255,255,0.3)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'#fff', width:i<viewIdx?'100%':i===viewIdx?`${progress}%`:'0%', transition:'width 0.05s linear', borderRadius:2 }} />
              </div>
            ))}
          </div>

          {/* Author + close */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 14px 10px', zIndex:10 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#6B0F1A,#A52030)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff' }}>
              {currentStory.author?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14, color:'#fff' }}>{currentStory.author?.name}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>
                {new Date(currentStory.createdAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                {' · '}
                {currentStory.views?.length||0} views
              </div>
            </div>
            <button onClick={()=>{setViewing(null);setViewIdx(0);}} style={{ background:'none', border:'none', color:'#fff', fontSize:24, cursor:'pointer' }}>✕</button>
          </div>

          {/* Story content */}
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            {/* Tap zones */}
            <div style={{ position:'absolute', left:0, top:0, width:'40%', height:'100%', zIndex:5 }} onClick={() => setViewIdx(i=>Math.max(0,i-1))} />
            <div style={{ position:'absolute', right:0, top:0, width:'40%', height:'100%', zIndex:5 }} onClick={() => {
              if (viewIdx < viewingGroup.stories.length-1) setViewIdx(i=>i+1);
              else { setViewing(null); setViewIdx(0); }
            }} />

            {currentStory.mediaType==='text' && (
              <div style={{ width:'100%', height:'100%', background:currentStory.bgColor||'#6B0F1A', display:'flex', alignItems:'center', justifyContent:'center', padding:32 }}>
                <p style={{ fontSize:24, color:'#fff', textAlign:'center', fontWeight:600, lineHeight:1.5 }}>{currentStory.text}</p>
              </div>
            )}
            {currentStory.mediaType==='image' && currentStory.mediaData && (
              <img src={currentStory.mediaData} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
            )}
            {currentStory.mediaType==='video' && currentStory.mediaData && (
              <video autoPlay src={currentStory.mediaData} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} playsInline />
            )}
          </div>

          {/* Like button */}
          <div style={{ padding:'14px 20px', display:'flex', justifyContent:'center', gap:20 }}>
            <button onClick={()=>likeStory(currentStory._id)} style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:999, padding:'8px 20px', color:'#fff', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
              ❤️ {currentStory.likes?.length||0}
            </button>
            {currentStory.author?._id===user._id && (
              <button onClick={async()=>{await api.delete(`/stories/${currentStory._id}`);setViewing(null);load();}} style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:999, padding:'8px 20px', color:'#FC8181', fontSize:14, cursor:'pointer' }}>
                🗑️ Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create story modal */}
      {creating && (
        <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'flex-end' }} onClick={()=>setCreating(false)}>
          <div style={{ width:'100%', background:'#13131E', borderRadius:'22px 22px 0 0', padding:'16px 18px 30px', border:'1px solid rgba(255,255,255,0.08)', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.15)', margin:'0 auto 16px' }} />
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:20, color:'var(--text)', marginBottom:16 }}>Add Story</h3>

            {/* Type tabs */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
              {[{t:'text',i:'✍️',l:'Text'},{t:'image',i:'📷',l:'Photo'},{t:'video',i:'🎥',l:'Video'}].map(tp=>(
                <button key={tp.t} onClick={()=>{ if(tp.t!=='text'){fileRef.current?.click();} else {setNewStory(n=>({...n,type:'text'}));} }}
                  style={{ padding:'10px', borderRadius:12, background:newStory.type===tp.t?'rgba(155,24,38,0.2)':'var(--bg-elevated)', border:`1px solid ${newStory.type===tp.t?'var(--maroon)':'var(--border)'}`, color:newStory.type===tp.t?'var(--maroon-light)':'var(--text-muted)', cursor:'pointer', fontSize:13, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:22 }}>{tp.i}</span>{tp.l}
                </button>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleStoryFile} style={{ display:'none' }} />

            {/* Preview/input */}
            {newStory.type==='text' && (
              <>
                <div style={{ borderRadius:16, overflow:'hidden', marginBottom:12, aspectRatio:'9/16', maxHeight:280, background:newStory.bgColor, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <p style={{ fontSize:20, color:'#fff', textAlign:'center', padding:20, fontWeight:600 }}>{newStory.text||'Your story text...'}</p>
                </div>
                <textarea className="form-input" value={newStory.text} onChange={e=>setNewStory(n=>({...n,text:e.target.value}))} placeholder="What's on your mind?" rows={3} style={{ marginBottom:10 }} />
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                  {BG_COLORS.map(c=>(
                    <button key={c} onClick={()=>setNewStory(n=>({...n,bgColor:c}))} style={{ width:32, height:32, borderRadius:'50%', background:c, border:`3px solid ${newStory.bgColor===c?'#fff':'transparent'}`, cursor:'pointer' }} />
                  ))}
                </div>
              </>
            )}
            {newStory.type==='image' && newStory.mediaData && (
              <div style={{ borderRadius:16, overflow:'hidden', marginBottom:14, maxHeight:260 }}>
                <img src={newStory.mediaData} style={{ width:'100%', height:260, objectFit:'cover' }} />
              </div>
            )}
            {newStory.type==='video' && newStory.mediaData && (
              <div style={{ borderRadius:16, overflow:'hidden', marginBottom:14 }}>
                <video src={newStory.mediaData} controls style={{ width:'100%', maxHeight:260 }} playsInline />
              </div>
            )}

            <button className="btn btn-primary w-full btn-lg" onClick={postStory} disabled={!newStory.text&&!newStory.mediaData}>
              📸 Share Story
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
