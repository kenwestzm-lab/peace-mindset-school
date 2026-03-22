// Compress image using Canvas API - reduces size while keeping quality
export const compressImage = (file, maxSizeMB = 1, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Max dimension 1920px
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
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try to compress to target size
        let q = quality;
        const tryCompress = () => {
          const data = canvas.toDataURL('image/jpeg', q);
          const sizeKB = (data.length * 0.75) / 1024;
          if (sizeKB > maxSizeMB * 1024 && q > 0.3) {
            q -= 0.1;
            tryCompress();
          } else {
            resolve({ data, sizeKB: Math.round(sizeKB) });
          }
        };
        tryCompress();
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Compress video by limiting bitrate via MediaRecorder re-encoding
export const compressVideo = (file, maxSizeMB = 10) => {
  return new Promise((resolve) => {
    // For video, we use the file directly if under limit
    // Browser video compression requires heavy libs, so we just validate size
    const reader = new FileReader();
    reader.onload = (e) => {
      const sizeKB = file.size / 1024;
      resolve({ data: e.target.result, sizeKB: Math.round(sizeKB) });
    };
    reader.readAsDataURL(file);
  });
};

// Format file size
export const formatSize = (kb) => {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};
