const express = require("express");
const router = express.Router();
const Child = require("../models/Child");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// GET /api/children - Parent gets their own children
router.get("/", protect, async (req, res) => {
  try {
    const children = await Child.find({ parent: req.user._id, isActive: true }).sort({ name: 1 }).lean();
    res.json({ children });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/children/admin/all - Admin gets ALL active children
router.get("/admin/all", protect, authorize("admin"), async (req, res) => {
  try {
    const children = await Child.find({ isActive: true })
      .populate("parent", "name email phone profilePic")
      .sort({ grade: 1, name: 1 }).lean();
    res.json({ children });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/children/admin/register
router.post("/admin/register", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, grade, studentId, parentEmail, dob, gender, gradeTeacher, teacherPhone } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: "Child name is required" });
    if (!grade || !grade.trim()) return res.status(400).json({ error: "Grade is required" });

    // Check studentId uniqueness
    if (studentId && studentId.trim()) {
      const exists = await Child.findOne({ studentId: studentId.trim() });
      if (exists) return res.status(400).json({ error: `Student ID "${studentId}" is already taken` });
    }

    // Link to parent if email provided
    let parentId = null;
    if (parentEmail && parentEmail.trim()) {
      const parent = await User.findOne({ email: parentEmail.toLowerCase().trim(), role: "parent" });
      if (parent) parentId = parent._id;
      // Don't fail if parent not found - just register without linking
    }

    const child = await Child.create({
      name: name.trim(),
      grade: grade.trim(),   // NO enum validation - accepts any string
      studentId: studentId?.trim() || null,
      parent: parentId,
      dob: dob ? new Date(dob) : null,
      gender: gender || "male",
      gradeTeacher: gradeTeacher?.trim() || null,
      teacherPhone: teacherPhone?.trim() || null,  // Optional
      isActive: true,
    });

    const populated = await Child.findById(child._id).populate("parent", "name email profilePic").lean();

    // Notify parent if linked
    if (parentId) {
      try {
        const io = req.app.get("io");
        io.to(`user:${parentId}`).emit("child_registered", {
          child: populated,
          message: `✅ Your child ${name.trim()} has been registered at Peace Mindset School!`,
        });
      } catch {}
    }

    res.status(201).json({ child: populated, message: `${name.trim()} registered successfully!` });
  } catch (err) {
    console.error("Register child error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/children/:id - Update child details
router.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, grade, studentId, dob, gender, gradeTeacher, teacherPhone } = req.body;
    const child = await Child.findByIdAndUpdate(
      req.params.id,
      { name, grade, studentId, dob, gender, gradeTeacher, teacherPhone },
      { new: true, runValidators: false }  // runValidators false to avoid enum issues
    ).populate("parent", "name email").lean();
    if (!child) return res.status(404).json({ error: "Child not found" });
    res.json({ child });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/children/:id - Permanently delete child
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);
    if (!child) return res.status(404).json({ error: "Child not found" });
    await Child.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `${child.name} deleted successfully` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/children/:id/link - Link child to parent by email
router.put("/:id/link", protect, authorize("admin"), async (req, res) => {
  try {
    const parent = await User.findOne({ email: req.body.parentEmail?.toLowerCase(), role: "parent" });
    if (!parent) return res.status(404).json({ error: "No parent found with that email" });
    const child = await Child.findByIdAndUpdate(req.params.id, { parent: parent._id }, { new: true })
      .populate("parent", "name email").lean();
    res.json({ child });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
