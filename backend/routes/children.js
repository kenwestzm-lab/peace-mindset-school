const express = require("express");
const router = express.Router();
const Child = require("../models/Child");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// GET /api/children - Parent gets their children
router.get("/", protect, async (req, res) => {
  try {
    const children = await Child.find({ parent: req.user._id, isActive: true }).sort({ name: 1 }).lean();
    res.json({ children });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/children/admin/all - Admin gets ALL children
router.get("/admin/all", protect, authorize("admin"), async (req, res) => {
  try {
    const children = await Child.find({ isActive: true })
      .populate("parent", "name email phone profilePic")
      .sort({ grade: 1, name: 1 }).lean();
    res.json({ children });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/children/admin/register - Admin registers new student
router.post("/admin/register", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, grade, studentId, parentEmail, dob, gender, gradeTeacher, teacherPhone } = req.body;
    if (!name || !grade) return res.status(400).json({ error: "Name and grade are required" });

    if (studentId) {
      const exists = await Child.findOne({ studentId });
      if (exists) return res.status(400).json({ error: `Student ID "${studentId}" already taken` });
    }

    let parentId = null;
    if (parentEmail) {
      const parent = await User.findOne({ email: parentEmail.toLowerCase(), role: "parent" });
      if (parent) parentId = parent._id;
    }

    const child = await Child.create({
      name: name.trim(), grade: grade.trim(),
      studentId: studentId || null,
      parent: parentId,
      dob: dob ? new Date(dob) : null,
      gender: gender || "male",
      isActive: true,
    });

    const populated = await Child.findById(child._id).populate("parent", "name email").lean();
    res.status(201).json({ child: populated, message: `Student registered! ID: ${studentId||'N/A'}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/children/:id - Update child
router.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const child = await Child.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("parent", "name email").lean();
    if (!child) return res.status(404).json({ error: "Not found" });
    res.json({ child });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/children/:id - Deactivate
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Child.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/children/:id/link - Link to parent by email
router.put("/:id/link", protect, authorize("admin"), async (req, res) => {
  try {
    const parent = await User.findOne({ email: req.body.parentEmail?.toLowerCase(), role: "parent" });
    if (!parent) return res.status(404).json({ error: "Parent not found" });
    const child = await Child.findByIdAndUpdate(req.params.id, { parent: parent._id }, { new: true })
      .populate("parent", "name email").lean();
    res.json({ child });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
