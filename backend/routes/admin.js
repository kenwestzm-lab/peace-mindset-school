const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Child = require("../models/Child");
const Payment = require("../models/Payment");
const { FeeSettings } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");

// GET /api/admin/dashboard
router.get("/dashboard", protect, authorize("admin"), async (req, res) => {
  try {
    const [totalParents, totalChildren, pendingPayments, approvedPayments, totalRevenue] = await Promise.all([
      User.countDocuments({ role: "parent" }),
      Child.countDocuments({ isActive: true }),
      Payment.countDocuments({ status: "pending" }),
      Payment.countDocuments({ status: "approved" }),
      Payment.aggregate([{ $match: { status: "approved" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);
    const recentPayments = await Payment.find()
      .populate("child", "name grade")
      .populate("parent", "name email")
      .sort({ createdAt: -1 })
      .limit(15);
    res.json({
      stats: { totalParents, totalChildren, pendingPayments, approvedPayments, totalRevenue: totalRevenue[0]?.total || 0 },
      recentPayments,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/students
router.get("/students", protect, authorize("admin"), async (req, res) => {
  try {
    const children = await Child.find({ isActive: true })
      .populate("parent", "name email phone profilePic")
      .sort({ grade: 1, name: 1 });
    const fees = await FeeSettings.findOne();
    const monthlyFee = fees?.schoolFeeMonthly || 150;
    const studentList = await Promise.all(children.map(async (child) => {
      const approved = await Payment.aggregate([
        { $match: { child: child._id, status: "approved" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const totalPaid = approved[0]?.total || 0;
      return { ...child.toObject(), totalPaid, currentMonthOwed: monthlyFee, remainingBalance: Math.max(0, monthlyFee - totalPaid) };
    }));
    res.json({ students: studentList, fees: { monthlyFee } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/parents
router.get("/parents", protect, authorize("admin"), async (req, res) => {
  try {
    const parents = await User.find({ role: "parent" }).select("-password").sort({ createdAt: -1 });
    const parentsWithChildren = await Promise.all(parents.map(async (p) => {
      const childCount = await Child.countDocuments({ parent: p._id, isActive: true });
      const pendingPayments = await Payment.countDocuments({ parent: p._id, status: "pending" });
      return { ...p.toObject(), childCount, pendingPayments };
    }));
    res.json({ parents: parentsWithChildren });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/admin/parents/:id ─────────────────────────────────────
// Permanently deletes parent account + deactivates their children
router.delete("/parents/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const parent = await User.findById(req.params.id);
    if (!parent) return res.status(404).json({ error: "Parent not found" });
    if (parent.role === "admin") return res.status(403).json({ error: "Cannot delete admin accounts" });

    // Deactivate all children linked to this parent
    await Child.updateMany({ parent: req.params.id }, { isActive: false });

    // Delete the parent account
    await User.findByIdAndDelete(req.params.id);

    // Notify via socket
    const io = req.app.get("io");
    io.to(`user:${req.params.id}`).emit("account_deleted", { message: "Your account has been removed." });

    res.json({ success: true, message: "Parent account deleted successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/admin/children/:id ────────────────────────────────────
// Permanently deletes a child record
router.delete("/children/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);
    if (!child) return res.status(404).json({ error: "Child not found" });
    await Child.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `${child.name} deleted successfully` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/send-reminders
router.post("/send-reminders", protect, authorize("admin"), async (req, res) => {
  try {
    const unpaidChildren = await Child.find({ isActive: true }).populate("parent", "name email");
    const io = req.app.get("io");
    const fees = await FeeSettings.findOne();
    const monthlyFee = fees?.schoolFeeMonthly || 150;
    let count = 0;
    for (const child of unpaidChildren) {
      if (child.parent) {
        const approved = await Payment.aggregate([
          { $match: { child: child._id, status: "approved" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const remaining = Math.max(0, monthlyFee - (approved[0]?.total || 0));
        if (remaining > 0) {
          io.to(`user:${child.parent._id}`).emit("balance_reminder", { childName: child.name, remaining, monthlyFee });
          count++;
        }
      }
    }
    res.json({ message: `Reminders sent to ${count} parents.`, count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/parents/:id/deactivate
router.put("/parents/:id/deactivate", protect, authorize("admin"), async (req, res) => {
  try {
    const parent = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!parent) return res.status(404).json({ error: "Parent not found." });
    res.json({ message: "Parent deactivated.", parent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/parents/:id/activate
router.put("/parents/:id/activate", protect, authorize("admin"), async (req, res) => {
  try {
    const parent = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    if (!parent) return res.status(404).json({ error: "Parent not found." });
    res.json({ message: "Parent activated.", parent });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
