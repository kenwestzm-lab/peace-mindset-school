const express = require("express");
const router = express.Router();
const Child = require("../models/Child");
const { protect, authorize } = require("../middleware/auth");

// GET /api/children - Admin: all children | Parent: own children
router.get("/", protect, async (req, res) => {
  try {
    let query = { isActive: true };
    if (req.user.role === "parent") query.parent = req.user._id;

    const children = await Child.find(query)
      .populate("parent", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/children/all - Admin: all children including inactive
router.get("/all", protect, authorize("admin", "developer"), async (req, res) => {
  try {
    const children = await Child.find()
      .populate("parent", "name email phone")
      .sort({ createdAt: -1 });
    res.json({ children });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/children/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const child = await Child.findById(req.params.id).populate("parent", "name email phone");
    if (!child) return res.status(404).json({ error: "Child not found." });

    // Parents can only see their own children
    if (req.user.role === "parent" && child.parent._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied." });
    }

    res.json({ child });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/children - Admin only: register new child
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, grade, gradeTeacher, gradeTeacherPhone, parentId } = req.body;

    if (!name || !grade || !gradeTeacher || !gradeTeacherPhone || !parentId) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const child = await Child.create({
      name,
      grade,
      gradeTeacher,
      gradeTeacherPhone,
      parent: parentId,
    });

    const populated = await child.populate("parent", "name email phone");

    // Real-time: notify the parent
    const io = req.app.get("io");
    io.to(`user:${parentId}`).emit("child_registered", { child: populated });

    res.status(201).json({ child: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/children/:id - Admin only: update child
router.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, grade, gradeTeacher, gradeTeacherPhone, parentId } = req.body;

    const child = await Child.findByIdAndUpdate(
      req.params.id,
      { name, grade, gradeTeacher, gradeTeacherPhone, parent: parentId },
      { new: true, runValidators: true }
    ).populate("parent", "name email phone");

    if (!child) return res.status(404).json({ error: "Child not found." });

    const io = req.app.get("io");
    io.to(`user:${child.parent._id}`).emit("child_updated", { child });

    res.json({ child });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/children/:id - Admin only: soft-remove child
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const { reason } = req.body;

    const child = await Child.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        removedReason: reason || "Transferred to another school",
        removedAt: new Date(),
      },
      { new: true }
    );

    if (!child) return res.status(404).json({ error: "Child not found." });

    const io = req.app.get("io");
    io.to(`user:${child.parent}`).emit("child_removed", { childId: child._id });

    res.json({ message: "Child removed successfully.", child });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
