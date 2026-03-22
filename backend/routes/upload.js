const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const path = require("path");
const fs = require("fs");
const os = require("os");

// ── Chunked upload storage ────────────────────────────────────────────
// Stores file chunks in temp directory, reassembles when all chunks received
const TEMP_DIR = path.join(os.tmpdir(), "peace-mindset-uploads");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Track active uploads: uploadId -> { totalChunks, receivedChunks, fileType, fileName }
const activeUploads = new Map();

// ── POST /api/upload/chunk - Receive a file chunk ─────────────────────
router.post("/chunk", protect, async (req, res) => {
  try {
    const {
      uploadId,       // Unique ID for this upload session
      chunkIndex,     // 0-based chunk number
      totalChunks,    // Total number of chunks
      fileName,       // Original file name
      fileType,       // MIME type
      chunkData,      // Base64 encoded chunk data
      fileSize,       // Total file size in bytes
    } = req.body;

    if (!uploadId || chunkIndex === undefined || !chunkData) {
      return res.status(400).json({ error: "Missing chunk data" });
    }

    // Max 1GB
    if (fileSize && fileSize > 1024 * 1024 * 1024) {
      return res.status(400).json({ error: "File too large. Max 1GB." });
    }

    // Initialize upload tracking
    if (!activeUploads.has(uploadId)) {
      activeUploads.set(uploadId, {
        totalChunks,
        receivedChunks: new Set(),
        fileType,
        fileName,
        fileSize,
        userId: req.user._id.toString(),
        startedAt: Date.now(),
      });
    }

    const upload = activeUploads.get(uploadId);

    // Security: verify this user owns this upload
    if (upload.userId !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Write chunk to temp file
    const chunkPath = path.join(TEMP_DIR, `${uploadId}_chunk_${chunkIndex}`);
    const chunkBuffer = Buffer.from(chunkData, "base64");
    fs.writeFileSync(chunkPath, chunkBuffer);
    upload.receivedChunks.add(chunkIndex);

    const received = upload.receivedChunks.size;
    const total = upload.totalChunks;
    const progress = Math.round((received / total) * 100);

    // Check if all chunks received
    if (received >= total) {
      // Reassemble file
      const finalPath = path.join(TEMP_DIR, `${uploadId}_final`);
      const writeStream = fs.createWriteStream(finalPath);

      for (let i = 0; i < total; i++) {
        const cp = path.join(TEMP_DIR, `${uploadId}_chunk_${i}`);
        if (!fs.existsSync(cp)) {
          return res.status(400).json({ error: `Missing chunk ${i}` });
        }
        const data = fs.readFileSync(cp);
        writeStream.write(data);
        fs.unlinkSync(cp); // Clean up chunk
      }

      writeStream.end();

      await new Promise((resolve) => writeStream.on("finish", resolve));

      // Read reassembled file and convert to base64 for storage
      // In production, upload to Cloudinary/S3 here
      const fileBuffer = fs.readFileSync(finalPath);
      const base64Data = `data:${upload.fileType};base64,${fileBuffer.toString("base64")}`;

      // Clean up
      fs.unlinkSync(finalPath);
      activeUploads.delete(uploadId);

      return res.json({
        success: true,
        complete: true,
        progress: 100,
        data: base64Data,
        fileName: upload.fileName,
        fileType: upload.fileType,
        sizeKB: Math.round(fileBuffer.length / 1024),
        message: `✅ File assembled: ${Math.round(fileBuffer.length / 1024)} KB`,
      });
    }

    res.json({ success: true, complete: false, progress, received, total });
  } catch (err) {
    console.error("Upload chunk error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/upload/:uploadId - Cancel upload ──────────────────────
router.delete("/:uploadId", protect, async (req, res) => {
  try {
    const { uploadId } = req.params;
    const upload = activeUploads.get(uploadId);

    if (upload && upload.userId === req.user._id.toString()) {
      // Clean up temp files
      for (let i = 0; i < (upload.totalChunks || 100); i++) {
        const cp = path.join(TEMP_DIR, `${uploadId}_chunk_${i}`);
        if (fs.existsSync(cp)) fs.unlinkSync(cp);
      }
      const finalPath = path.join(TEMP_DIR, `${uploadId}_final`);
      if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
      activeUploads.delete(uploadId);
    }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/upload/progress/:uploadId - Check upload progress ────────
router.get("/progress/:uploadId", protect, async (req, res) => {
  const upload = activeUploads.get(req.params.uploadId);
  if (!upload) return res.json({ progress: 0, found: false });
  const progress = Math.round((upload.receivedChunks.size / upload.totalChunks) * 100);
  res.json({ progress, received: upload.receivedChunks.size, total: upload.totalChunks, found: true });
});

// ── Clean up stale uploads every 30 minutes ───────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, upload] of activeUploads.entries()) {
    if (now - upload.startedAt > 2 * 60 * 60 * 1000) { // 2 hours
      activeUploads.delete(id);
    }
  }
  // Clean temp dir
  try {
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      const fp = path.join(TEMP_DIR, file);
      const stat = fs.statSync(fp);
      if (now - stat.mtimeMs > 2 * 60 * 60 * 1000) {
        fs.unlinkSync(fp);
      }
    }
  } catch {}
}, 30 * 60 * 1000);

module.exports = router;
