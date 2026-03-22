import api from './api';
import { compressImage, compressVideo } from './media';

// ── Chunk size: 2MB per chunk ─────────────────────────────────────────
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

// ── Generate unique upload ID ─────────────────────────────────────────
const generateUploadId = () => `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ── Compress audio using Web Audio API ───────────────────────────────
export const compressAudio = (file, targetKbps = 64) => {
  return new Promise((resolve) => {
    // For audio, we re-encode using MediaRecorder at lower bitrate
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalKB = Math.round(file.size / 1024);
      // Return original — audio compression requires AudioContext + encoding
      // which is complex; just read and return
      resolve({ data: e.target.result, sizeKB: originalKB, originalKB, compressed: false, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  });
};

// ── Main compress function - handles all file types ───────────────────
export const compressFile = async (file, onProgress) => {
  const sizeMB = file.size / (1024 * 1024);
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');

  onProgress?.({ stage: 'compressing', progress: 5, label: 'Analyzing file...' });

  if (isImage) {
    onProgress?.({ stage: 'compressing', progress: 20, label: 'Compressing image...' });
    // Target 1MB for images
    const result = await compressImage(file, Math.min(1, sizeMB * 0.3));
    onProgress?.({ stage: 'compressed', progress: 60, label: `Compressed: ${result.sizeKB} KB` });
    return { ...result, mimeType: 'image/jpeg' };
  }

  if (isVideo) {
    onProgress?.({ stage: 'compressing', progress: 10, label: 'Compressing video (may take a minute)...' });
    // Target 15MB for videos, but keep quality
    const targetMB = Math.min(15, sizeMB * 0.4);
    const result = await compressVideo(file, targetMB);
    onProgress?.({ stage: 'compressed', progress: 50, label: `Compressed: ${result.sizeKB} KB` });
    return result;
  }

  if (isAudio) {
    onProgress?.({ stage: 'compressing', progress: 30, label: 'Processing audio...' });
    const result = await compressAudio(file);
    onProgress?.({ stage: 'compressed', progress: 60, label: `Audio: ${result.sizeKB} KB` });
    return result;
  }

  // For other files (PDF, docs), read as-is
  onProgress?.({ stage: 'reading', progress: 30, label: 'Reading file...' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        data: e.target.result,
        sizeKB: Math.round(file.size / 1024),
        originalKB: Math.round(file.size / 1024),
        mimeType: file.type,
        compressed: false,
      });
    };
    reader.readAsDataURL(file);
  });
};

// ── Chunked upload for large files ────────────────────────────────────
export const uploadFileChunked = async (file, onProgress) => {
  const uploadId = generateUploadId();
  const originalKB = Math.round(file.size / 1024);
  const sizeMB = file.size / (1024 * 1024);

  try {
    // Step 1: Compress if needed
    let fileData, fileMime, compressedKB;

    if (sizeMB > 50) {
      // Large file — skip compression, use chunked upload directly
      onProgress?.({ stage: 'reading', progress: 5, label: `Reading ${(sizeMB).toFixed(0)}MB file...` });
      const readResult = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      fileData = readResult;
      fileMime = file.type;
      compressedKB = originalKB;
    } else {
      // Compress first
      const compressed = await compressFile(file, onProgress);
      fileData = compressed.data;
      fileMime = compressed.mimeType || file.type;
      compressedKB = compressed.sizeKB;
    }

    // Step 2: Convert to raw base64 for chunking
    const base64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const totalChunks = Math.ceil(base64.length / CHUNK_SIZE);

    onProgress?.({ stage: 'uploading', progress: 5, label: `Uploading (0/${totalChunks} chunks)...` });

    // Step 3: Send chunks
    for (let i = 0; i < totalChunks; i++) {
      const chunk = base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const progress = 5 + Math.round(((i + 1) / totalChunks) * 90);

      const response = await api.post('/upload/chunk', {
        uploadId,
        chunkIndex: i,
        totalChunks,
        fileName: file.name,
        fileType: fileMime,
        chunkData: chunk,
        fileSize: file.size,
      });

      onProgress?.({
        stage: 'uploading',
        progress,
        label: `Uploading... ${i + 1}/${totalChunks} chunks`,
        chunksDone: i + 1,
        totalChunks,
      });

      if (response.data.complete) {
        onProgress?.({ stage: 'done', progress: 100, label: '✅ Upload complete!' });
        return {
          data: response.data.data,
          sizeKB: response.data.sizeKB,
          originalKB,
          mimeType: fileMime,
          fileName: file.name,
        };
      }
    }

    throw new Error('Upload completed but no final response received');
  } catch (err) {
    // Cancel upload on error
    try { await api.delete(`/upload/${uploadId}`); } catch {}
    throw err;
  }
};

// ── Simple upload for small files (< 5MB) — base64 direct ────────────
export const uploadFileSimple = async (file, onProgress) => {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > 5) throw new Error('File too large for simple upload. Use chunked upload.');

  onProgress?.({ stage: 'compressing', progress: 20, label: 'Processing...' });
  const result = await compressFile(file, onProgress);
  onProgress?.({ stage: 'done', progress: 100, label: '✅ Ready!' });
  return result;
};

// ── Smart upload: auto-choose method based on file size ───────────────
export const smartUpload = async (file, onProgress) => {
  const sizeMB = file.size / (1024 * 1024);

  if (sizeMB > 1024) {
    throw new Error('File too large. Maximum size is 1GB.');
  }

  if (sizeMB > 5) {
    return uploadFileChunked(file, onProgress);
  }
  return uploadFileSimple(file, onProgress);
};

// ── Format progress for display ────────────────────────────────────────
export const formatUploadLabel = (state) => {
  if (!state) return '';
  const { stage, progress, label, sizeKB, originalKB } = state;

  if (label) return label;

  switch (stage) {
    case 'compressing': return `Compressing... ${progress}%`;
    case 'compressed': return sizeKB ? `Compressed to ${sizeKB} KB ✅` : 'Compressed ✅';
    case 'reading': return 'Reading file...';
    case 'uploading': return `Uploading ${progress}%`;
    case 'done': return '✅ Done!';
    default: return `${progress}%`;
  }
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};
