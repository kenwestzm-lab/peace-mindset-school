
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { getSocket } from '../utils/socket';

export default function GoldSlideshow() {
  const [slides,  setSlides]  = useState([]);
  const [current, setCurrent] = useState(0);
  const [loaded,  setLoaded]  = useState(false);
  const [fade,    setFade]    = useState(true);
  const timerRef = useRef(null);

  const loadSlides = useCallback(async () => {
    try {
      const r = await api.get('/slideshow');
      setSlides(r.data.slides || []);
      setLoaded(true);
    } catch { setLoaded(true); }
  }, []);

  useEffect(() => {
    loadSlides();
    const s = getSocket();
    if (!s) return;
    const onUpdate = ({ action, slide, slideId }) => {
      if (action === 'added')   setSlides(p => [...p, slide]);
      if (action === 'updated') setSlides(p => p.map(x => x._id === slide._id ? slide : x).filter(x => x.isActive));
      if (action === 'deleted') setSlides(p => p.filter(x => x._id !== slideId));
    };
    s.on('slideshow_updated', onUpdate);
    return () => s.off('slideshow_updated', onUpdate);
  }, [loadSlides]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent(c => (c + 1) % slides.length);
        setFade(true);
      }, 350);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const goTo = (i) => {
    clearInterval(timerRef.current);
    setFade(false);
    setTimeout(() => { setCurrent(i); setFade(true); }, 350);
  };

  if (!loaded || slides.length === 0) return null;

  const slide = slides[current];

  return (
    <div style={{
      marginBottom: 20,
      // Gold outer glow
      borderRadius: 20,
      padding: 3,
      background: 'linear-gradient(135deg, #D4A843, #F0C86A, #A0722A, #F0C86A, #D4A843)',
      boxShadow: '0 0 0 1px rgba(212,168,67,0.3), 0 8px 32px rgba(212,168,67,0.25), 0 2px 8px rgba(0,0,0,0.3)',
    }}>
      {/* Inner frame */}
      <div style={{
        borderRadius: 17,
        overflow: 'hidden',
        position: 'relative',
        background: '#000',
        // Inner gold border
        outline: '2px solid rgba(212,168,67,0.4)',
        outlineOffset: '-2px',
      }}>
        {/* Slide image */}
        <div style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '52%', // 52% = landscape ratio
          overflow: 'hidden',
          background: 'linear-gradient(135deg,#1a0a0a,#0a0a1a)',
        }}>
          <img
            key={slide._id}
            src={slide.imageUrl}
            alt={slide.title || 'School photo'}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: fade ? 1 : 0,
              transition: 'opacity 0.35s ease-in-out',
            }}
          />

          {/* Gold corner ornaments */}
          {['top-left','top-right','bottom-left','bottom-right'].map(pos => {
            const isTop    = pos.includes('top');
            const isLeft   = pos.includes('left');
            return (
              <div key={pos} style={{
                position: 'absolute',
                top:    isTop    ? 8 : 'auto',
                bottom: !isTop   ? 8 : 'auto',
                left:   isLeft   ? 8 : 'auto',
                right:  !isLeft  ? 8 : 'auto',
                width: 22, height: 22,
                borderTop:    isTop  ? '2.5px solid rgba(212,168,67,0.7)' : 'none',
                borderBottom: !isTop ? '2.5px solid rgba(212,168,67,0.7)' : 'none',
                borderLeft:   isLeft  ? '2.5px solid rgba(212,168,67,0.7)' : 'none',
                borderRight:  !isLeft ? '2.5px solid rgba(212,168,67,0.7)' : 'none',
                pointerEvents: 'none',
              }}/>
            );
          })}

          {/* Caption overlay */}
          {(slide.title || slide.caption) && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.78))',
              padding: '24px 14px 12px',
              opacity: fade ? 1 : 0,
              transition: 'opacity 0.35s ease-in-out',
            }}>
              {slide.title && (
                <div style={{
                  fontSize: 14, fontWeight: 800, color: '#F0C86A',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  letterSpacing: '0.02em', marginBottom: slide.caption ? 2 : 0,
                }}>
                  {slide.title}
                </div>
              )}
              {slide.caption && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                  {slide.caption}
                </div>
              )}
            </div>
          )}

          {/* Slide counter */}
          {slides.length > 1 && (
            <div style={{
              position: 'absolute', top: 10, right: 12,
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(212,168,67,0.4)',
              borderRadius: 20, padding: '2px 10px',
              fontSize: 11, fontWeight: 700,
              color: '#F0C86A',
            }}>
              {current + 1} / {slides.length}
            </div>
          )}
        </div>

        {/* Gold separator line */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #D4A843, #F0C86A, #D4A843, transparent)' }}/>

        {/* Dot navigation */}
        {slides.length > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 6,
            padding: '8px 0',
            background: 'linear-gradient(135deg, #0a0505, #150505)',
          }}>
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  width: i === current ? 22 : 7,
                  height: 7,
                  borderRadius: 4,
                  border: 'none',
                  background: i === current
                    ? 'linear-gradient(90deg,#D4A843,#F0C86A)'
                    : 'rgba(212,168,67,0.25)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.3s ease',
                  boxShadow: i === current ? '0 0 6px rgba(212,168,67,0.5)' : 'none',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
