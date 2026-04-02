// ─── Image Compression (Canvas API) ──────────────────────────────────────────
// Compresses images to under targetMB while maintaining visual quality

export const compressImage = (file, targetMB = 1) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Scale down if needed (max 1920px on longest side)
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Iteratively reduce quality until under target size
        const tryCompress = (quality) => {
          const data = canvas.toDataURL("image/jpeg", quality);
          const sizeKB = Math.round((data.length * 0.75) / 1024);
          const sizeMB = sizeKB / 1024;
          if (sizeMB > targetMB && quality > 0.2) {
            tryCompress(Math.max(0.2, quality - 0.1));
          } else {
            resolve({ data, sizeKB, originalKB: Math.round(file.size / 1024) });
          }
        };
        tryCompress(0.85);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ─── Video Compression (Canvas + MediaRecorder re-encoding) ──────────────────
// Re-encodes video at lower resolution + bitrate using browser APIs
// This achieves real compression without any external library

export const compressVideo = (file, targetMB = 15) => {
  return new Promise((resolve, reject) => {
    const originalKB = Math.round(file.size / 1024);
    
    // If file is already under target, just read it
    if (file.size <= targetMB * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (e) => resolve({ data: e.target.result, sizeKB: originalKB, originalKB, compressed: false });
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    // Create video element to load the file
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      const canvas = document.createElement("canvas");
      
      // Calculate output dimensions (max 720p for compression)
      let { videoWidth: vw, videoHeight: vh } = video;
      const maxDim = 720;
      if (vw > maxDim || vh > maxDim) {
        if (vw > vh) { vh = Math.round((vh * maxDim) / vw); vw = maxDim; }
        else { vw = Math.round((vw * maxDim) / vh); vh = maxDim; }
      }
      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext("2d");

      // Choose best available codec for compression
      const mimeTypes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];
      const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || "video/webm";

      // Estimate bitrate to hit target size
      const durationSec = video.duration || 30;
      const targetBits = targetMB * 1024 * 1024 * 8;
      const videoBitrate = Math.min(1500000, Math.max(300000, Math.floor(targetBits / durationSec)));

      const mr = new MediaRecorder(canvas.captureStream(24), {
        mimeType, videoBitsPerSecond: videoBitrate,
      });

      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        URL.revokeObjectURL(objectUrl);
        const blob = new Blob(chunks, { type: mimeType });
        const sizeKB = Math.round(blob.size / 1024);
        const reader = new FileReader();
        reader.onload = (e) => resolve({ data: e.target.result, sizeKB, originalKB, compressed: true, mimeType });
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      };

      mr.start(100); // collect data every 100ms

      // Play video and draw frames to canvas
      video.currentTime = 0;
      video.play().then(() => {
        const drawFrame = () => {
          if (video.paused || video.ended) {
            mr.stop();
            return;
          }
          ctx.drawImage(video, 0, 0, vw, vh);
          requestAnimationFrame(drawFrame);
        };
        requestAnimationFrame(drawFrame);

        video.onended = () => {
          if (mr.state === "recording") mr.stop();
        };
      }).catch(() => {
        // Fallback: just read as-is
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = (e) => resolve({ data: e.target.result, sizeKB: originalKB, originalKB, compressed: false });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback: read as-is
      const reader = new FileReader();
      reader.onload = (e) => resolve({ data: e.target.result, sizeKB: originalKB, originalKB, compressed: false });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };
  });
};

// ─── Generate shareable data URL link ────────────────────────────────────────
export const createShareableBlob = (dataUrl, filename) => {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
};

export const downloadMedia = (dataUrl, filename) => {
  const blob = createShareableBlob(dataUrl, filename);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const shareMedia = async (dataUrl, filename, title = "Peace Mindset") => {
  if (navigator.share && navigator.canShare) {
    const blob = createShareableBlob(dataUrl, filename);
    const file = new File([blob], filename, { type: blob.type });
    try {
      await navigator.share({ title, files: [file] });
      return true;
    } catch {}
  }
  // Fallback: copy data URL
  downloadMedia(dataUrl, filename);
  return false;
};

export const formatSize = (kb) => {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};
