const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { smartUpload } = require("../utils/cloudinary");

// POST /api/media/upload
// Frontend uploads media here FIRST, gets back a URL, then sends URL via socket
router.post("/upload", protect, async (req, res) => {
  try {
    const { mediaData, mimeType, folder } = req.body;
    if (!mediaData) return res.status(400).json({ error: "No media data" });

    const uploadFolder = folder || "peace-mindset/media";

    const result = await smartUpload(mediaData, {
      mimeType: mimeType || "image/jpeg",
      folder: uploadFolder,
    });

    res.json({
      success: true,
      url: result.url,
      publicId: result.publicId,
      isCloudinary: result.isCloudinary,
      bytes: result.bytes,
      sizeKB: Math.round((result.bytes || 0) / 1024),
    });
  } catch (err) {
    console.error("Media upload error:", err.message);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

module.exports = router;
