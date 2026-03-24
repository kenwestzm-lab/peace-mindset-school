const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth");
const { smartUpload, smartDelete } = require("../utils/cloudinary");

// ── POST /api/media/upload ────────────────────────────────────────────────────
// Accepts base64 data (any type: image, video, audio, pdf)
// Returns { url, publicId } — NO compression applied
router.post("/upload", protect, async (req, res) => {
  try {
    const { mediaData, mimeType, folder } = req.body;

    if (!mediaData) {
      return res.status(400).json({ error: "No media data provided" });
    }

    // Validate base64 format
    const isBase64 = mediaData.startsWith("data:") || /^[A-Za-z0-9+/=]+$/.test(mediaData.slice(0, 20));
    if (!isBase64) {
      return res.status(400).json({ error: "Invalid media format. Send base64 data." });
    }

    // Size guard — Cloudinary free tier max is 100MB per upload
    const base64SizeBytes = Math.ceil((mediaData.length * 3) / 4);
    const maxBytes = 100 * 1024 * 1024; // 100 MB
    if (base64SizeBytes > maxBytes) {
      return res.status(413).json({ error: "File too large. Maximum 100MB per file." });
    }

    // Upload — original quality, no compression
    const result = await smartUpload(mediaData, {
      mimeType: mimeType || "image/jpeg",
      folder:   folder   || "peace-mindset/general",
    });

    return res.json({
      url:       result.url,
      publicId:  result.publicId,
      format:    result.format,
      bytes:     result.bytes,
      width:     result.width,
      height:    result.height,
      duration:  result.duration,
    });

  } catch (err) {
    console.error("Media upload error:", err.message);
    return res.status(500).json({ error: err.message || "Upload failed" });
  }
});

// ── DELETE /api/media/:publicId ───────────────────────────────────────────────
router.delete("/:publicId(*)", protect, async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = "image" } = req.body;
    const result = await smartDelete(publicId, resourceType);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
