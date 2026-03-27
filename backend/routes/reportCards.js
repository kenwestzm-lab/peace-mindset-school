const express = require("express");
const router = express.Router();
const ReportCard = require("../models/ReportCard");
const Child = require("../models/Child");
const { protect, authorize } = require("../middleware/auth");

// ── GET /api/report-cards/child/:childId ─────────────────────────────
router.get("/child/:childId", protect, async (req, res) => {
  try {
    const { childId } = req.params;

    // Parent can only view their own child
    if (req.user.role === "parent") {
      const child = await Child.findById(childId);
      if (!child || child.parent.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Not your child" });
      }
    }

    const query = { child: childId };
    // Parents only see published cards
    if (req.user.role === "parent") query.isPublished = true;

    const cards = await ReportCard.find(query)
      .populate("uploadedBy", "name")
      .sort({ year: -1, term: -1 });

    res.json({ reportCards: cards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/report-cards/all - Admin: all report cards ──────────────
router.get("/all", protect, authorize("admin"), async (req, res) => {
  try {
    const cards = await ReportCard.find()
      .populate("child", "name grade")
      .populate("uploadedBy", "name")
      .sort({ createdAt: -1 });
    res.json({ reportCards: cards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/report-cards - Admin saves or updates a report card ─────
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const {
      childId, grade, term, year,
      subjects, conduct, attendance,
      class_teacher_comment, head_teacher_comment,
      position_in_class, total_pupils,
      next_term_opens, promoted, isPublished,
    } = req.body;

    if (!childId || !term || !year) {
      return res.status(400).json({ error: "childId, term, and year are required" });
    }

    // Calculate totals and grade letters for each subject
    const processedSubjects = (subjects || []).map((s) => {
      const ca = Number(s.continuous_assessment) || 0;
      const exam = Number(s.end_of_term_exam) || 0;
      const total = Math.min(100, ca + exam);
      let grade_letter = "";
      if (total >= 80) grade_letter = "A";
      else if (total >= 65) grade_letter = "B";
      else if (total >= 50) grade_letter = "C";
      else if (total >= 40) grade_letter = "D";
      else if (total >= 30) grade_letter = "E";
      else if (total > 0) grade_letter = "F";
      return {
        name: s.name,
        continuous_assessment: ca,
        end_of_term_exam: exam,
        total,
        grade_letter,
        teacher_comment: s.teacher_comment || "",
      };
    });

    // Upsert: one card per child per term per year
    const card = await ReportCard.findOneAndUpdate(
      { child: childId, term: String(term), year: Number(year) },
      {
        child: childId,
        grade,
        term: String(term),
        year: Number(year),
        subjects: processedSubjects,
        conduct: conduct || {},
        attendance: {
          days_present: Number(attendance?.days_present) || 0,
          days_absent: Number(attendance?.days_absent) || 0,
          total_school_days: Number(attendance?.total_school_days) || 0,
        },
        class_teacher_comment: class_teacher_comment || "",
        head_teacher_comment: head_teacher_comment || "",
        position_in_class: position_in_class ? Number(position_in_class) : null,
        total_pupils: total_pupils ? Number(total_pupils) : null,
        next_term_opens: next_term_opens || null,
        promoted: promoted !== undefined ? promoted : true,
        isPublished: isPublished || false,
        uploadedBy: req.user._id,
      },
      { upsert: true, new: true, runValidators: true }
    );

    // If publishing, notify parent via socket
    if (isPublished) {
      const child = await Child.findById(childId).populate("parent", "_id name");
      if (child?.parent) {
        const io = req.app.get("io");
        io.to(`user:${child.parent._id}`).emit("report_published", {
          studentName: child.name,
          term,
          year,
          cardId: card._id,
        });
        // Push notification
        try {
          const { sendPushToUser } = require("./push");
          await sendPushToUser(child.parent._id.toString(), {
            title: "📋 Report Card Available",
            body: `${child.name}'s Term ${term} ${year} report card has been published.`,
            url: "/parent/results",
          });
        } catch {}
      }
    }

    res.json({ reportCard: card });
  } catch (err) {
    console.error("Report card save error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/report-cards/:id/publish - Publish a report card ──────
router.patch("/:id/publish", protect, authorize("admin"), async (req, res) => {
  try {
    const card = await ReportCard.findByIdAndUpdate(
      req.params.id,
      { isPublished: true },
      { new: true }
    ).populate("child");

    if (!card) return res.status(404).json({ error: "Report card not found" });

    const child = await Child.findById(card.child).populate("parent", "_id name");
    if (child?.parent) {
      const io = req.app.get("io");
      io.to(`user:${child.parent._id}`).emit("report_published", {
        studentName: child.name,
        term: card.term,
        year: card.year,
        cardId: card._id,
      });
      try {
        const { sendPushToUser } = require("./push");
        await sendPushToUser(child.parent._id.toString(), {
          title: "📋 Report Card Available",
          body: `${child.name}'s Term ${card.term} ${card.year} report card has been published.`,
          url: "/parent/results",
        });
      } catch {}
    }

    res.json({ reportCard: card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/report-cards/:id ─────────────────────────────────────
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await ReportCard.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
