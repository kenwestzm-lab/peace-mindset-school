const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const Child = require("../models/Child");
const { Earnings, FeeSettings } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");
const { uploadPaymentProof } = require("../middleware/upload");

// Helper: calculate expiry date
const calculateExpiry = (type, startDate = new Date()) => {
  const d = new Date(startDate);
  if (type === "school_fee_monthly") {
    d.setMonth(d.getMonth() + 1);
  } else if (type === "school_fee_term") {
    d.setMonth(d.getMonth() + 3);
  } else {
    // Test/event fees don't expire
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
};

// GET /api/payments - Parent: own payments | Admin: all payments
router.get("/", protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "parent") query.parent = req.user._id;

    const payments = await Payment.find(query)
      .populate("child", "name grade")
      .populate("parent", "name email")
      .populate("approvedBy", "name")
      .populate("event", "title")
      .sort({ createdAt: -1 });

    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/register - Admin: full payment register
router.get("/register", protect, authorize("admin", "developer"), async (req, res) => {
  try {
    const { status, childId, page = 1, limit = 50 } = req.query;
    let query = {};
    if (status) query.status = status;
    if (childId) query.child = childId;

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate("child", "name grade")
      .populate("parent", "name email phone")
      .populate("approvedBy", "name")
      .populate("event", "title")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ payments, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/fees - Get current fee settings
router.get("/fees", protect, async (req, res) => {
  try {
    const fees = await FeeSettings.findOne();
    res.json({ fees });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/child/:childId - Payment history for a child
router.get("/child/:childId", protect, async (req, res) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child) return res.status(404).json({ error: "Child not found." });

    // Parent can only see own child's payments
    if (req.user.role === "parent" && child.parent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied." });
    }

    const payments = await Payment.find({ child: req.params.childId })
      .populate("event", "title")
      .sort({ createdAt: -1 });

    // Check if school fees are active (not expired, approved)
    const activeSchoolFee = await Payment.findOne({
      child: req.params.childId,
      paymentType: { $in: ["school_fee_monthly", "school_fee_term"] },
      status: "approved",
      isExpired: false,
      expiresAt: { $gt: new Date() },
    });

    res.json({
      payments,
      hasActiveSchoolFee: !!activeSchoolFee,
      activeUntil: activeSchoolFee?.expiresAt || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments - Parent: submit payment
router.post(
  "/",
  protect,
  authorize("parent"),
  uploadPaymentProof.single("proof"),
  async (req, res) => {
    try {
      const { childId, paymentType, mobileMoneyProvider, transactionId, term, eventId } = req.body;

      if (!childId || !paymentType || !mobileMoneyProvider || !transactionId) {
        return res.status(400).json({ error: "All required fields must be filled." });
      }

      const child = await Child.findById(childId);
      if (!child) return res.status(404).json({ error: "Child not found." });
      if (child.parent.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "This child is not registered to your account." });
      }

      // Get current fee settings
      const fees = await FeeSettings.findOne();

      let amount = 0;
      if (paymentType === "school_fee_monthly") amount = fees.schoolFeeMonthly;
      else if (paymentType === "school_fee_term") amount = fees.schoolFeeTermly;
      else if (paymentType === "test_fee") {
        const lowerGrades = ["Baby Class", "Reception", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"];
        amount = lowerGrades.includes(child.grade) ? fees.testFeeLower : fees.testFeeUpper;
      } else if (paymentType === "event_fee") {
        const { Event } = require("../models/index");
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: "Event not found." });
        amount = event.paymentAmount;
      }

      const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 5;
      const platformFee = parseFloat((amount * platformFeePercent / 100).toFixed(2));

      const paymentData = {
        child: childId,
        parent: req.user._id,
        paymentType,
        amount,
        mobileMoneyProvider,
        transactionId,
        platformFee,
        term: term ? Number(term) : undefined,
        event: eventId || undefined,
      };

      if (req.file) {
        paymentData.proofUrl = req.file.path;
        paymentData.proofPublicId = req.file.filename;
      }

      const payment = await Payment.create(paymentData);
      const populated = await payment.populate([
        { path: "child", select: "name grade" },
        { path: "parent", select: "name email" },
      ]);

      // Real-time: notify admin
      const io = req.app.get("io");
      io.to("admin_room").emit("new_payment", { payment: populated });

      res.status(201).json({ payment: populated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/payments/:id/approve - Admin: approve payment
router.put("/:id/approve", protect, authorize("admin"), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found." });
    if (payment.status === "approved") {
      return res.status(400).json({ error: "Payment already approved." });
    }

    const now = new Date();
    payment.status = "approved";
    payment.approvedBy = req.user._id;
    payment.approvedAt = now;
    payment.periodStart = now;
    payment.expiresAt = calculateExpiry(payment.paymentType, now);
    payment.isExpired = false;
    payment.platformFeeStatus = "credited";
    await payment.save();

    // Update child payment status
    await Child.findByIdAndUpdate(payment.child, {
      paymentStatus: "paid",
      balance: payment.amount,
    });

    // Credit developer earnings
    if (payment.platformFee > 0) {
      await Earnings.create({
        source: "payment_fee",
        payment: payment._id,
        amount: payment.platformFee,
        description: `Platform fee from payment #${payment._id}`,
      });
    }

    const populated = await payment.populate([
      { path: "child", select: "name grade" },
      { path: "parent", select: "name email" },
      { path: "approvedBy", select: "name" },
    ]);

    const io = req.app.get("io");
    // Notify parent
    io.to(`user:${payment.parent}`).emit("payment_approved", { payment: populated });
    // Update developer earnings in real-time
    io.to("developer_room").emit("earnings_update", {
      amount: payment.platformFee,
      paymentId: payment._id,
    });

    res.json({ payment: populated, message: "Payment approved successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payments/:id/reject - Admin: reject payment
router.put("/:id/reject", protect, authorize("admin"), async (req, res) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
        rejectionReason: reason || "Payment could not be verified.",
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    ).populate([
      { path: "child", select: "name grade" },
      { path: "parent", select: "name email" },
    ]);

    if (!payment) return res.status(404).json({ error: "Payment not found." });

    const io = req.app.get("io");
    io.to(`user:${payment.parent._id}`).emit("payment_rejected", {
      payment,
      reason: payment.rejectionReason,
    });

    res.json({ payment, message: "Payment rejected." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payments/fees - Admin: update fee settings
router.put("/fees", protect, authorize("admin"), async (req, res) => {
  try {
    const { schoolFeeMonthly, schoolFeeTermly, testFeeLower, testFeeUpper } = req.body;
    const fees = await FeeSettings.findOneAndUpdate(
      {},
      { schoolFeeMonthly, schoolFeeTermly, testFeeLower, testFeeUpper, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    const io = req.app.get("io");
    io.emit("fees_updated", { fees });

    res.json({ fees, message: "Fee settings updated." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// POST /api/payments/:id/refund — Admin only
router.post("/:id/refund", protect, authorize("admin"), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("parent", "name phone");
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.status !== "approved") return res.status(400).json({ error: "Only approved payments can be refunded" });
    if (!payment.parent.phone) return res.status(400).json({ error: "Parent has no phone number on file" });

    const { sendMoney } = require("../utils/momo");
    const transferId = await sendMoney({
      amount: payment.amount,
      phone: payment.parent.phone,
      name: payment.parent.name,
      reason: "Refund from Peace Mindset School",
    });

    payment.status = "refunded";
    payment.refundTransferId = transferId;
    payment.refundedAt = new Date();
    await payment.save();

    res.json({ success: true, message: "Refund sent via MoMo", transferId });
  } catch (err) {
    console.error("Refund error:", err?.response?.data || err.message);
    res.status(500).json({ error: "Refund failed", details: err?.response?.data || err.message });
  }
});
