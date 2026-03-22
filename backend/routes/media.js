const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { smartUpload } = require("../utils/cloudinary");

router.post("/upload", protect, async (req, res) => {
  req.socket.setTimeout(5 * 60 * 1000);
  res.setTimeout(5 * 60 * 1000);
  try {
    const { mediaData, mimeType, folder } = req.body;
    if (!mediaData) return res.status(400).json({ error: "No media data" });
    if (mediaData.startsWith("http://") || mediaData.startsWith("https://")) {
      return res.json({ success: true, url: mediaData, publicId: null, isCloudinary: false, sizeKB: 0 });
    }
    const result = await smartUpload(mediaData, { mimeType: mimeType || "image/jpeg", folder: folder || "peace-mindset/media" });
    res.json({ success: true, url: result.url, publicId: result.publicId, isCloudinary: result.isCloudinary, bytes: result.bytes, sizeKB: Math.round((result.bytes||0)/1024) });
  } catch (err) {
    console.error("Media upload:", err.message);
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

module.exports = router;
