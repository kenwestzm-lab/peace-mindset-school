/**
 * PEACE MINDSET — TEST RESULTS FIX
 * 
 * Problem: After upload completes, "View" button shows "can't reach"
 * Root cause: The assembled base64 is stored in DB instead of a Cloudinary URL
 * 
 * Apply these fixes to routes/results.js and routes/upload.js
 */

const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const { smartUpload } = require("../utils/cloudinary");

// ── FIX 1: Upload route - always push to Cloudinary, store URL only ──
// Replace your existing /api/upload/chunk "complete" handler with this:

router.post("/complete", protect, async (req, res) => {
  try {
    const { base64Data, fileType, fileName, studentId, term, year, grade, subjects, title } = req.body;

    if (!base64Data || !fileType) {
      return res.status(400).json({ error: "Missing file data" });
    }

    // Always upload to Cloudinary — NEVER store raw base64 in MongoDB
    const uploadResult = await smartUpload(base64Data, {
      folder: "peace-mindset/test-results",
      mimeType: fileType,
      // Preserve original filename as a tag
      tags: [`student:${studentId}`, `term:${term}`, `year:${year}`],
    });

    // Now create the result record with URL only
    const Result = require("../models/Result"); // adjust path if needed
    const result = await Result.create({
      student: studentId,
      title: title || fileName || "Test Result",
      term,
      year: parseInt(year),
      grade,
      subjects: subjects || [],
      fileUrl: uploadResult.url,         // ✅ Store URL
      filePublicId: uploadResult.publicId,
      mediaData: null,                   // ❌ Never store base64 here
      mediaMimeType: fileType,
      uploadedBy: req.user._id,
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error("Results upload error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ── FIX 2: View endpoint - serve correct URL ──────────────────────────
// GET /api/results/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const Result = require("../models/Result");
    const result = await Result.findById(req.params.id)
      .populate("student", "name grade parentId");

    if (!result) return res.status(404).json({ error: "Result not found" });

    // Security: parent can only see their child's results
    if (req.user.role === "parent") {
      const Child = require("../models/Child");
      const child = await Child.findOne({
        _id: result.student._id,
        parentId: req.user._id,
      });
      if (!child) return res.status(403).json({ error: "Not authorised" });
    }

    // Check payment lock
    const Payment = require("../models/Payment");
    const validPayment = await Payment.findOne({
      parentId: result.student.parentId || req.user._id,
      status: "approved",
      isExpired: false,
    });

    if (!validPayment) {
      return res.json({
        ...result.toObject(),
        locked: true,
        lockReason: "Fee unpaid",
        fileUrl: null, // Don't expose URL if not paid
      });
    }

    // Return result with viewable URL
    res.json({
      ...result.toObject(),
      locked: false,
      // fileUrl is a full Cloudinary URL, ready to open in browser
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── FIX 3: Result model update ────────────────────────────────────────
// Update your models/Result.js to ensure fileUrl is properly defined:
/*
const resultSchema = new mongoose.Schema({
  student:        { type: ObjectId, ref: 'Child', required: true },
  title:          { type: String, required: true },
  term:           { type: String, enum: ['1','2','3'], required: true },
  year:           { type: Number, required: true },
  grade:          String,
  subjects:       [String],
  fileUrl:        String,         // ✅ Cloudinary URL - what "View" opens
  filePublicId:   String,         // For deletion
  mediaData:      String,         // Legacy field - should be null for new uploads
  mediaMimeType:  String,
  uploadedBy:     { type: ObjectId, ref: 'User' },
  isPublished:    { type: Boolean, default: true },
}, { timestamps: true });
*/


module.exports = router;


/**
 * ── FRONTEND FIX (TestResults component) ──────────────────────────────
 * 
 * Replace your handleView function:
 */
export function handleViewResult(result) {
  if (result.locked) {
    alert("This result is locked. Please pay the school fee to view it.");
    return;
  }

  const url = result.fileUrl;

  if (!url) {
    alert("No file available for this result.");
    return;
  }

  // Open Cloudinary URL in new tab - works for PDF, images, etc.
  window.open(url, "_blank", "noopener,noreferrer");
}


/**
 * ── MIGRATION: Fix existing records that have base64 in mediaData ─────
 * 
 * Run this one-time script in Node.js to migrate old records:
 * node scripts/migrateResults.js
 */
/*
// scripts/migrateResults.js
require("dotenv").config();
const mongoose = require("mongoose");
const { smartUpload } = require("../utils/cloudinary");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  const Result = require("../models/Result");

  // Find all results where base64 is stored directly
  const results = await Result.find({
    fileUrl: { $exists: false },
    mediaData: { $regex: /^data:/ },
  });

  console.log(`Found ${results.length} results to migrate`);

  for (const r of results) {
    try {
      const uploaded = await smartUpload(r.mediaData, {
        folder: "peace-mindset/test-results",
        mimeType: r.mediaMimeType,
      });
      await Result.findByIdAndUpdate(r._id, {
        fileUrl: uploaded.url,
        filePublicId: uploaded.publicId,
        mediaData: null, // clear the base64
      });
      console.log(`✅ Migrated: ${r._id}`);
    } catch (err) {
      console.error(`❌ Failed: ${r._id}`, err.message);
    }
  }

  mongoose.disconnect();
  console.log("Migration complete");
}

migrate();
*/
