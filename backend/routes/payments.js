const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const Child = require("../models/Child");
const { FeeSettings } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");
const {
  getCurrentTerm, getTerm, getPaymentExpiry,
  getTermMonths, isPaymentValid, getPayableTerms,
} = require("../utils/zambia-calendar");

// ── GET /api/payments/calendar - Get Zambian school term calendar ──────
router.get("/calendar", protect, async (req, res) => {
  try {
    const current = getCurrentTerm();
    const payable = getPayableTerms();
    const fees = await FeeSettings.findOne();
    res.json({
      currentTerm: current,
      payableTerms: payable,
      fees: {
        termly: fees?.schoolFeeTermly || 450,
        monthly: fees?.schoolFeeMonthly || 150,
        twoTerms: (fees?.schoolFeeTermly || 450) * 2 * 0.95, // 5% discount for 2 terms
        testFeeLower: fees?.testFeeLower || 30,
        testFeeUpper: fees?.testFeeUpper || 40,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/payments/my - Parent gets their payments ─────────────────
router.get("/my", protect, async (req, res) => {
  try {
    const payments = await Payment.find({ parent: req.user._id })
      .populate("child", "name grade studentId profilePic")
      .sort({ createdAt: -1 });

    // Auto-expire any that have passed
    const now = new Date();
    for (const p of payments) {
      if (p.expiresAt && now > p.expiresAt && !p.isExpired && p.status === "approved") {
        p.isExpired = true;
        await p.save();
      }
    }

    res.json({ payments });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/payments/child/:childId/access - Check what child can access
router.get("/child/:childId/access", protect, async (req, res) => {
  try {
    const { childId } = req.params;
    const now = new Date();
    const current = getCurrentTerm();

    // Find all approved, non-expired payments for this child
    const payments = await Payment.find({
      child: childId,
      parent: req.user._id,
      status: "approved",
      isExpired: false,
    });

    // Check school fee access
    let schoolFeeAccess = false;
    let activePayment = null;
    for (const p of payments) {
      if (
        (p.paymentType === "school_fee_termly" || p.paymentType === "school_fee_monthly" || p.paymentType === "school_fee_2terms") &&
        p.expiresAt && now <= p.expiresAt
      ) {
        schoolFeeAccess = true;
        activePayment = p;
        break;
      }
    }

    // Check test fee access per term
    const testFeeAccess = {};
    for (const p of payments) {
      if (p.paymentType === "test_fee" && p.expiresAt && now <= p.expiresAt && !p.testResultAccessed) {
        const key = `${p.termYear}_${p.termNumber}`;
        testFeeAccess[key] = { paid: true, paymentId: p._id, accessed: false };
      }
    }

    // Previous test results they've already paid for and accessed (free to view again)
    const accessedTestFees = await Payment.find({
      child: childId,
      parent: req.user._id,
      paymentType: "test_fee",
      status: "approved",
      testResultAccessed: true,
    });
    for (const p of accessedTestFees) {
      const key = `${p.termYear}_${p.termNumber}`;
      if (!testFeeAccess[key]) {
        testFeeAccess[key] = { paid: true, paymentId: p._id, accessed: true, free: true };
      }
    }

    res.json({
      schoolFeeAccess,
      activePayment,
      testFeeAccess,
      currentTerm: current,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/payments - Submit a payment ────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const {
      childId, paymentType, termYear, termNumber, termNumber2, month,
      amount, mobileMoneyRef, mobileMoneyProvider, phoneNumber,
      proofImageData, proofImageMime, notes,
    } = req.body;

    if (!childId || !paymentType) {
      return res.status(400).json({ error: "childId and paymentType required" });
    }

    const child = await Child.findById(childId);
    if (!child) return res.status(404).json({ error: "Child not found" });
    if (child.parent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not your child" });
    }

    const fees = await FeeSettings.findOne();

    // Calculate expiry based on payment type
    let expiresAt = null;
    let calculatedAmount = amount;

    if (paymentType === "school_fee_termly") {
      expiresAt = getPaymentExpiry(termYear, termNumber, "termly");
      calculatedAmount = fees?.schoolFeeTermly || 450;
    } else if (paymentType === "school_fee_monthly") {
      expiresAt = getPaymentExpiry(termYear, termNumber, "monthly");
      calculatedAmount = fees?.schoolFeeMonthly || 150;
    } else if (paymentType === "school_fee_2terms") {
      // Expires 3 days after the SECOND term closes
      const term2 = getTerm(termYear, termNumber2 || termNumber + 1);
      expiresAt = term2?.expiryDate || getPaymentExpiry(termYear, termNumber, "termly");
      calculatedAmount = Math.round((fees?.schoolFeeTermly || 450) * 2 * 0.95); // 5% discount
    } else if (paymentType === "test_fee") {
      // Test fee: expires at end of current term
      expiresAt = getPaymentExpiry(termYear, termNumber, "termly");
      const grade = child.grade?.toLowerCase() || "";
      const isUpper = ["6","7","8","9","10","11","12","form"].some(g => grade.includes(g));
      calculatedAmount = isUpper ? (fees?.testFeeUpper || 40) : (fees?.testFeeLower || 30);
    }

    const payment = await Payment.create({
      parent: req.user._id,
      child: childId,
      paymentType,
      termYear: termYear || new Date().getFullYear(),
      termNumber,
      termNumber2,
      month,
      amount: calculatedAmount,
      mobileMoneyRef,
      mobileMoneyProvider,
      phoneNumber,
      proofImageData,
      proofImageMime,
      expiresAt,
      notes,
      status: "pending",
    });

    const populated = await payment.populate("child", "name grade studentId");

    // Notify admin
    const io = req.app.get("io");
    io.to("admin_room").emit("new_payment", { payment: populated });

    res.status(201).json({ payment: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/payments/:id/approve - Admin approves payment ────────────
router.put("/:id/approve", protect, authorize("admin"), async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Not found" });

    payment.status = "approved";
    payment.approvedBy = req.user._id;
    payment.approvedAt = new Date();
    await payment.save();

    const populated = await payment.populate("child", "name grade");

    // Notify parent
    const io = req.app.get("io");
    io.to(`user:${payment.parent}`).emit("payment_approved", {
      payment: populated,
      message: `✅ Your ${payment.paymentType.replace(/_/g, " ")} for ${populated.child?.name} has been approved!`,
    });

    // Push notification
    try {
      const { sendPushToUser } = require("./push");
      await sendPushToUser(payment.parent.toString(), {
        title: "Payment Approved! ✅",
        body: `Your payment for ${populated.child?.name} has been approved.`,
        url: "/parent/payments",
      });
    } catch {}

    // Create developer earnings record (2% fee)
    try {
      const { Earnings } = require("../models/index");
      const fee = Math.round(payment.amount * 0.02 * 100) / 100;
      if (fee > 0) {
        await Earnings.create({
          source: "payment_fee",
          payment: payment._id,
          amount: fee,
          description: `2% fee on ZMW ${payment.amount} payment`,
        });
        payment.developerFeeProcessed = true;
        await payment.save();
      }
    } catch {}

    res.json({ payment: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/payments/:id/reject - Admin rejects payment ──────────────
router.put("/:id/reject", protect, authorize("admin"), async (req, res) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", rejectionReason: reason },
      { new: true }
    ).populate("child", "name grade");

    const io = req.app.get("io");
    io.to(`user:${payment.parent}`).emit("payment_rejected", {
      payment,
      reason,
      message: `❌ Your payment for ${payment.child?.name} was rejected: ${reason}`,
    });

    try {
      const { sendPushToUser } = require("./push");
      await sendPushToUser(payment.parent.toString(), {
        title: "Payment Rejected ❌",
        body: reason || "Your payment was rejected. Please resubmit.",
        url: "/parent/payments",
      });
    } catch {}

    res.json({ payment });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/payments/admin/all - Admin gets all payments ─────────────
router.get("/admin/all", protect, authorize("admin"), async (req, res) => {
  try {
    const { status, type, page = 1 } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (type && type !== "all") filter.paymentType = type;

    const payments = await Payment.find(filter)
      .populate("child", "name grade studentId profilePic")
      .populate("parent", "name email phone")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 })
      .limit(50)
      .skip((page - 1) * 50);

    const total = await Payment.countDocuments(filter);
    res.json({ payments, total, pages: Math.ceil(total / 50) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/payments/test-access/:paymentId - Mark test result accessed
router.post("/test-access/:paymentId", protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: "Not found" });
    if (payment.parent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (payment.paymentType !== "test_fee") {
      return res.status(400).json({ error: "Not a test fee payment" });
    }
    // Mark as accessed — subsequent free views allowed
    if (!payment.testResultAccessed) {
      payment.testResultAccessed = true;
      payment.testResultAccessedAt = new Date();
      await payment.save();
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
