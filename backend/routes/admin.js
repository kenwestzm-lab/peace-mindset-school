const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Child = require("../models/Child");
const Payment = require("../models/Payment");
const { protect, authorize } = require("../middleware/auth");

// GET /api/admin/dashboard
router.get("/dashboard", protect, authorize("admin"), async (req, res) => {
  try {
    const [totalParents, totalChildren, pendingPayments, approvedPayments, totalRevenue] =
      await Promise.all([
        User.countDocuments({ role: "parent" }),
        Child.countDocuments({ isActive: true }),
        Payment.countDocuments({ status: "pending" }),
        Payment.countDocuments({ status: "approved" }),
        Payment.aggregate([
          { $match: { status: "approved" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

    // Recent payments
    const recentPayments = await Payment.find()
      .populate("child", "name grade")
      .populate("parent", "name email")
      .sort({ createdAt: -1 })
      .limit(10);

    // Payment status breakdown
    const paymentBreakdown = await Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$amount" },
        },
      },
    ]);

    res.json({
      stats: {
        totalParents,
        totalChildren,
        pendingPayments,
        approvedPayments,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
      recentPayments,
      paymentBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/parents - List all parents
router.get("/parents", protect, authorize("admin"), async (req, res) => {
  try {
    const parents = await User.find({ role: "parent" })
      .select("-password")
      .sort({ createdAt: -1 });

    // Add children count per parent
    const parentsWithChildren = await Promise.all(
      parents.map(async (p) => {
        const childCount = await Child.countDocuments({ parent: p._id, isActive: true });
        return { ...p.toObject(), childCount };
      })
    );

    res.json({ parents: parentsWithChildren });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/parents/:id/deactivate - Deactivate parent account
router.put("/parents/:id/deactivate", protect, authorize("admin"), async (req, res) => {
  try {
    const parent = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!parent) return res.status(404).json({ error: "Parent not found." });
    res.json({ message: "Parent account deactivated.", parent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/parents/:id/activate - Reactivate parent account
router.put("/parents/:id/activate", protect, authorize("admin"), async (req, res) => {
  try {
    const parent = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!parent) return res.status(404).json({ error: "Parent not found." });
    res.json({ message: "Parent account activated.", parent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
