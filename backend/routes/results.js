const express = require("express");
const router = express.Router();
const { Result } = require("../models/index");
const Payment = require("../models/Payment");
const Child = require("../models/Child");
const { protect, authorize } = require("../middleware/auth");
const { uploadResult } = require("../middleware/upload");

// ── GET /api/results/child/:childId ──────────────────────────────────────────
router.get("/child/:childId", protect, async (req, res) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child) return res.status(404).json({ error: "Child not found." });

    if (req.user.role === "parent" && child.parent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied." });
    }

    // Check if parent has active school fees (for non-admin)
    let hasAccess = req.user.role === "admin" || req.user.role === "developer";

    if (!hasAccess) {
      const activeFee = await Payment.findOne({
        child: req.params.childId,
        paymentType: { $in: ["school_fee_monthly", "school_fee_term"] },
        status: "approved",
        isExpired: false,
        expiresAt: { $gt: new Date() },
      });
      hasAccess = !!activeFee;
    }

    const results = await Result.find({ child: req.params.childId })
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });

    // Lock file URLs if no access
    const safeResults = results.map((r) => ({
      ...r.toObject(),
      fileUrl: hasAccess ? r.fileUrl : null,
      isLocked: !hasAccess,
    }));

    res.json({ results: safeResults, hasAccess });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/results - Admin: upload result ────────────────────────────────
router.post(
  "/",
  protect,
  authorize("admin"),
  uploadResult.single("resultFile"),
  async (req, res) => {
    try {
      const { childId, title, term, year, subjects } = req.body;

      if (!childId || !title || !term || !year || !req.file) {
        return res.status(400).json({ error: "All fields and file are required." });
      }

      const child = await Child.findById(childId);
      if (!child) return res.status(404).json({ error: "Child not found." });

      // Check if parent has active fees
      const activeFee = await Payment.findOne({
        child: childId,
        paymentType: { $in: ["school_fee_monthly", "school_fee_term"] },
        status: "approved",
        isExpired: false,
        expiresAt: { $gt: new Date() },
      });

      const result = await Result.create({
        child: childId,
        uploadedBy: req.user._id,
        title,
        term: Number(term),
        year: Number(year),
        fileUrl: req.file.path,
        filePublicId: req.file.filename,
        isLocked: !activeFee,
        subjects: subjects ? JSON.parse(subjects) : [],
      });

      const io = req.app.get("io");
      io.to(`user:${child.parent}`).emit("result_uploaded", {
        childId,
        result: { ...result.toObject(), fileUrl: activeFee ? result.fileUrl : null },
      });

      res.status(201).json({ result, message: "Result uploaded successfully." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ── DELETE /api/results/:id - Admin: delete result ──────────────────────────
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "Result not found." });
    res.json({ message: "Result deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
