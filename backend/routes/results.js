const express = require("express");
const router = express.Router();
const { Result } = require("../models/index");
const Payment = require("../models/Payment");
const Child = require("../models/Child");
const { protect, authorize } = require("../middleware/auth");

// ── Helper: check if parent has paid test fee for term ────────────────
const hasTestFeeAccess = async (parentId, childId, termYear, termNumber) => {
  const now = new Date();
  
  // Check for valid (unaccessed) test fee payment
  const validPayment = await Payment.findOne({
    parent: parentId,
    child: childId,
    paymentType: "test_fee",
    termYear,
    termNumber,
    status: "approved",
    isExpired: false,
    $or: [
      { expiresAt: { $gt: now } },
      { expiresAt: null },
    ],
  });
  
  if (validPayment) return { access: true, payment: validPayment, alreadyAccessed: false };
  
  // Check for previously accessed (already paid and viewed — free to view again)
  const accessedPayment = await Payment.findOne({
    parent: parentId,
    child: childId,
    paymentType: "test_fee",
    termYear,
    termNumber,
    status: "approved",
    testResultAccessed: true,
  });
  
  if (accessedPayment) return { access: true, payment: accessedPayment, alreadyAccessed: true, free: true };
  
  return { access: false };
};

// ── GET /api/results/child/:childId - Get results for child ───────────
router.get("/child/:childId", protect, async (req, res) => {
  try {
    const { childId } = req.params;

    // Verify ownership
    if (req.user.role === "parent") {
      const child = await Child.findById(childId);
      if (!child || child.parent.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Not your child" });
      }
    }

    const results = await Result.find({ child: childId })
      .populate("uploadedBy", "name")
      .sort({ year: -1, term: -1 });

    // For parents: check payment access for each result
    if (req.user.role === "parent") {
      const enriched = await Promise.all(
        results.map(async (r) => {
          const access = await hasTestFeeAccess(
            req.user._id, childId, r.year, r.term
          );
          return {
            _id: r._id,
            title: r.title,
            term: r.term,
            year: r.year,
            createdAt: r.createdAt,
            subjects: access.access ? r.subjects : [], // Hide subjects if locked
            fileUrl: access.access ? r.fileUrl : null,  // Hide file if locked
            isLocked: !access.access,
            alreadyAccessed: access.alreadyAccessed || false,
            paymentId: access.payment?._id || null,
          };
        })
      );
      return res.json({ results: enriched });
    }

    // Admin sees everything
    res.json({ results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/results/:id/access - Parent accesses result (marks fee used)
router.post("/:id/access", protect, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ error: "Result not found" });

    if (req.user.role !== "parent") {
      return res.json({ access: true, result }); // Admin always has access
    }

    const access = await hasTestFeeAccess(
      req.user._id, result.child, result.year, result.term
    );

    if (!access.access) {
      return res.status(403).json({
        error: "Test fee not paid",
        locked: true,
        message: `Please pay the test fee for Term ${result.term} ${result.year} to access this result.`,
      });
    }

    // Mark payment as accessed (first time only)
    if (!access.alreadyAccessed && access.payment) {
      await Payment.findByIdAndUpdate(access.payment._id, {
        testResultAccessed: true,
        testResultAccessedAt: new Date(),
      });
    }

    res.json({
      access: true,
      result,
      alreadyAccessed: access.alreadyAccessed || false,
      message: access.alreadyAccessed ? "Free access (previously paid)" : "Access granted",
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/results - Admin uploads result ──────────────────────────
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { childId, title, term, year, fileUrl, filePublicId, subjects } = req.body;
    if (!childId || !title || !term || !year || !fileUrl) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const result = await Result.create({
      child: childId,
      uploadedBy: req.user._id,
      title,
      term,
      year,
      fileUrl,
      filePublicId,
      subjects: subjects || [],
      isLocked: true,
    });

    const populated = await result.populate("uploadedBy", "name");

    // Notify parent
    const child = await Child.findById(childId).populate("parent", "_id");
    if (child?.parent) {
      const io = req.app.get("io");
      io.to(`user:${child.parent._id}`).emit("new_result", {
        result: populated,
        message: `📋 New result uploaded for ${child.name} - Term ${term} ${year}`,
      });
      try {
        const { sendPushToUser } = require("./push");
        await sendPushToUser(child.parent._id.toString(), {
          title: "New Result Available 📋",
          body: `Results for Term ${term} ${year} are now available for ${child.name}.`,
          url: "/parent/results",
        });
      } catch {}
    }

    res.status(201).json({ result: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ── GET /api/results/:id/download — proxy file download for parents ──────────
// Cloudinary private files return 401 when accessed directly.
// This route checks payment access, then proxies the file through the backend.
router.get("/:id/download", protect, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ error: "Result not found" });

    // Admin always has access
    if (req.user.role !== "parent") {
      // stream directly
    } else {
      // Verify child belongs to this parent
      const child = await Child.findById(result.child);
      if (!child || child.parent.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Not your child's result" });
      }
      // Check test fee access
      const access = await hasTestFeeAccess(
        req.user._id, result.child, result.year, result.term
      );
      if (!access.access) {
        return res.status(403).json({
          error: "Test fee not paid",
          locked: true,
          message: `Pay test fee for Term ${result.term} ${result.year} to download this file.`,
        });
      }
      // Mark as accessed if first time
      if (!access.alreadyAccessed && access.payment) {
        await Payment.findByIdAndUpdate(access.payment._id, {
          testResultAccessed: true,
          testResultAccessedAt: new Date(),
        });
      }
    }

    if (!result.fileUrl) {
      return res.status(404).json({ error: "No file attached to this result" });
    }

    // Proxy the file — fetch from Cloudinary and stream to client
    const https = require("https");
    const http  = require("http");
    const urlObj = new URL(result.fileUrl);
    const proto = urlObj.protocol === "https:" ? https : http;

    // Determine filename and content type from URL
    const urlPath = urlObj.pathname;
    const ext = urlPath.split(".").pop()?.toLowerCase() || "pdf";
    const mimeMap = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    };
    const mime = mimeMap[ext] || "application/octet-stream";
    const filename = `${result.title.replace(/[^a-zA-Z0-9_-]/g,"_")}_Term${result.term}_${result.year}.${ext}`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "no-cache");

    proto.get(result.fileUrl, (fileRes) => {
      if (fileRes.statusCode === 401 || fileRes.statusCode === 403) {
        // Cloudinary auth issue — try with signed URL approach
        // Fall back to redirect with token (Cloudinary allows signed URLs)
        res.redirect(result.fileUrl);
        return;
      }
      if (fileRes.statusCode !== 200) {
        res.status(502).json({ error: `File server returned ${fileRes.statusCode}` });
        return;
      }
      fileRes.pipe(res);
    }).on("error", (err) => {
      console.error("Proxy download error:", err);
      // Last resort: redirect to the URL directly
      res.redirect(result.fileUrl);
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/results/:id - Admin deletes result ────────────────────
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Result.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
