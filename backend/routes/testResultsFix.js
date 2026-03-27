/**
 * PEACE MINDSET — TEST RESULTS FIX ROUTE
 * Handles chunked upload completion → Cloudinary → save URL to DB
 */

const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { smartUpload } = require("../utils/cloudinary");
const { Result } = require("../models/index");
const Child = require("../models/Child");

// ── POST /api/results/upload/complete ────────────────────────────────
router.post("/complete", protect, authorize("admin"), async (req, res) => {
  try {
    const { base64Data, fileType, fileName, childId, term, year, grade, subjects, title } = req.body;

    if (!base64Data || !fileType) {
      return res.status(400).json({ error: "Missing file data" });
    }
    if (!childId || !term || !year) {
      return res.status(400).json({ error: "Missing childId, term, or year" });
    }

    // Upload to Cloudinary — never store raw base64 in MongoDB
    const uploadResult = await smartUpload(base64Data, {
      folder: "peace-mindset/test-results",
      mimeType: fileType,
      tags: [`student:${childId}`, `term:${term}`, `year:${year}`],
    });

    // Save result with Cloudinary URL only
    const result = await Result.create({
      child: childId,
      title: title || fileName || "Test Result",
      term: String(term),
      year: parseInt(year),
      grade: grade || "",
      subjects: subjects || [],
      fileUrl: uploadResult.url,
      filePublicId: uploadResult.publicId,
      uploadedBy: req.user._id,
      isLocked: true,
    });

    // Notify parent via socket
    const child = await Child.findById(childId).populate("parent", "_id");
    if (child?.parent) {
      const io = req.app.get("io");
      io.to(`user:${child.parent._id}`).emit("new_result", {
        result,
        message: `📋 New result uploaded for ${child.name} - Term ${term} ${year}`,
      });
    }

    res.json({ success: true, result });
  } catch (err) {
    console.error("Results upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/results/view/:id - Get viewable URL for a result ─────────
router.get("/view/:id", protect, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id).populate("child", "name grade parent");
    if (!result) return res.status(404).json({ error: "Result not found" });

    // Parent security check
    if (req.user.role === "parent") {
      if (!result.child || result.child.parent?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Not authorised" });
      }
    }

    if (!result.fileUrl) {
      return res.status(404).json({ error: "No file available for this result" });
    }

    res.json({
      success: true,
      fileUrl: result.fileUrl,
      title: result.title,
      mimeType: result.mediaMimeType || "image/jpeg",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
