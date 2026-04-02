import api from './api';
import { compressImage, compressVideo, formatSize } from './media';

// ── Upload media: compress → Cloudinary → return URL ──────────────────
// This is the KEY fix: frontend uploads media first, gets URL,
// then sends only the URL via socket (keeps MongoDB small & fast)

export const uploadMedia = async (file, onProgress) => {
  const sizeMB = file.size / (1024 * 1024);
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');

  // Step 1: Compress
  let compressed = { data: null, sizeKB: 0, mimeType: file.type };

  if (isImage) {
    onProgress?.({ stage: 'compressing', pct: 15, label: 'Compressing image...' });
    const r = await compressImage(file, Math.min(1.5, sizeMB * 0.4));
    compressed = { data: r.data, sizeKB: r.sizeKB, mimeType: 'image/jpeg' };
    onProgress?.({ stage: 'compressed', pct: 40, label: `Compressed to ${formatSize(r.sizeKB)}` });
  } else if (isVideo) {
    onProgress?.({ stage: 'compressing', pct: 10, label: 'Compressing video...' });
    const targetMB = sizeMB > 100 ? 20 : sizeMB > 30 ? 12 : 8;
    const r = await compressVideo(file, targetMB);
    compressed = { data: r.data, sizeKB: r.sizeKB, mimeType: r.mimeType || file.type };
    onProgress?.({ stage: 'compressed', pct: 45, label: `Compressed to ${formatSize(r.sizeKB)}` });
  } else if (isAudio) {
    // Audio: read as-is (already small from MediaRecorder)
    await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => { compressed = { data: e.target.result, sizeKB: Math.round(file.size/1024), mimeType: file.type }; resolve(); };
      reader.readAsDataURL(file);
    });
  } else {
    // Other files: read as-is
    await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = e => { compressed = { data: e.target.result, sizeKB: Math.round(file.size/1024), mimeType: file.type }; resolve(); };
      reader.readAsDataURL(file);
    });
  }

  // Step 2: Upload to Cloudinary via backend
  onProgress?.({ stage: 'uploading', pct: 55, label: 'Uploading to server...' });

  const folder = isVideo ? 'peace-mindset/videos' :
                 isImage ? 'peace-mindset/images' :
                 isAudio ? 'peace-mindset/audio' : 'peace-mindset/files';

  const response = await api.post('/media/upload', {
    mediaData: compressed.data,
    mimeType: compressed.mimeType,
    folder,
  });

  onProgress?.({ stage: 'done', pct: 100, label: '✅ Uploaded!' });

  return {
    url: response.data.url,
    publicId: response.data.publicId,
    mimeType: compressed.mimeType,
    sizeKB: compressed.sizeKB,
    isCloudinary: response.data.isCloudinary,
  };
};

// ── Upload base64 string directly (for profile pics, small images) ────
export const uploadBase64 = async (base64Data, mimeType = 'image/jpeg', folder = 'peace-mindset/misc') => {
  const response = await api.post('/media/upload', { mediaData: base64Data, mimeType, folder });
  return { url: response.data.url, publicId: response.data.publicId };
};
