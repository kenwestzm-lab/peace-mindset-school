const express = require("express");
const router = express.Router();
const { Earnings, Withdrawal } = require("../models/index");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Child = require("../models/Child");
const { protect, authorize } = require("../middleware/auth");

// GET /api/developer/dashboard
router.get("/dashboard", protect, authorize("developer"), async (req, res) => {
  try {
    const totalEarnings = await Earnings.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const availableBalance = await Earnings.aggregate([
      { $match: { status: "available" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalWithdrawn = await Withdrawal.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalParents = await User.countDocuments({ role: "parent" });
    const totalChildren = await Child.countDocuments({ isActive: true });
    const totalPayments = await Payment.countDocuments({ status: "approved" });
    const totalPaymentsAmount = await Payment.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyEarnings = await Earnings.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      earnings: {
        total: totalEarnings[0]?.total || 0,
        available: availableBalance[0]?.total || 0,
        withdrawn: totalWithdrawn[0]?.total || 0,
      },
      platform: {
        totalParents,
        totalChildren,
        totalPayments,
        totalPaymentsAmount: totalPaymentsAmount[0]?.total || 0,
      },
      monthlyEarnings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/developer/earnings
router.get("/earnings", protect, authorize("developer"), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const total = await Earnings.countDocuments();
    const earnings = await Earnings.find()
      .populate("payment", "amount paymentType transactionId createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ earnings, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/developer/withdrawals
router.get("/withdrawals", protect, authorize("developer"), async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().sort({ createdAt: -1 }).limit(100);
    res.json({ withdrawals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/developer/withdraw — REAL: deducts balance & completes immediately
router.post("/withdraw", protect, authorize("developer"), async (req, res) => {
  try {
    const { amount, mobileMoneyProvider, phoneNumber } = req.body;

    if (!amount || !mobileMoneyProvider || !phoneNumber) {
      return res.status(400).json({ error: "Amount, provider, and phone number are required." });
    }

    const withdrawAmount = Number(amount);

    if (withdrawAmount < 1) {
      return res.status(400).json({ error: "Minimum withdrawal amount is ZMW 1." });
    }

    // Check available balance
    const availableBalance = await Earnings.aggregate([
      { $match: { status: "available" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const balance = availableBalance[0]?.total || 0;

    if (withdrawAmount > balance) {
      return res.status(400).json({
        error: `Insufficient balance. Available: ZMW ${balance.toFixed(2)}`,
      });
    }

    // Create withdrawal record — status: completed immediately
    // Auto-send via MTN MoMo
    const { sendMoney } = require('../utils/momo');
    let momoTransferId = null;
    if (mobileMoneyProvider === 'MTN MoMo') {
      try {
        momoTransferId = await sendMoney({
          amount: withdrawAmount,
          phone: phoneNumber,
          developerOnly: true,
          name: req.user.name,
          reason: 'Developer earnings withdrawal - Peace Mindset School',
        });
      } catch (momoErr) {
        console.error('MoMo transfer failed:', momoErr?.response?.data || momoErr.message);
        return res.status(500).json({ error: 'MoMo transfer failed. Withdrawal cancelled.', details: momoErr?.response?.data });
      }
    }

    const withdrawal = await Withdrawal.create({
      developer: req.user._id,
      amount: withdrawAmount,
      mobileMoneyProvider,
      phoneNumber,
      status: "completed",
      processedAt: new Date(),
      notes: `Paid to ${mobileMoneyProvider} · ${phoneNumber}`,
      momoTransferId,
    });

    // Mark earnings as withdrawn (FIFO — oldest first)
    let remaining = withdrawAmount;
    const availableEarnings = await Earnings.find({ status: "available" }).sort({ createdAt: 1 });

    for (const earning of availableEarnings) {
      if (remaining <= 0) break;
      earning.status = "withdrawn";
      earning.withdrawal = withdrawal._id;
      await earning.save();
      remaining -= earning.amount;
    }

    // Emit real-time update
    const io = req.app.get("io");
    io.to("developer_room").emit("withdrawal_update", { withdrawal });
    io.to("developer_room").emit("earnings_update", { newBalance: balance - withdrawAmount });

    res.status(201).json({
      withdrawal,
      newBalance: Math.max(0, balance - withdrawAmount),
      message: `✅ ZMW ${withdrawAmount.toFixed(2)} withdrawn to ${mobileMoneyProvider} (${phoneNumber})`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/developer/withdrawals/:id/complete
router.put("/withdrawals/:id/complete", protect, authorize("developer"), async (req, res) => {
  try {
    const { reference } = req.body;
    const withdrawal = await Withdrawal.findByIdAndUpdate(
      req.params.id,
      { status: "completed", reference, processedAt: new Date() },
      { new: true }
    );

    if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found." });

    const io = req.app.get("io");
    io.to("developer_room").emit("withdrawal_update", { withdrawal });

    res.json({ withdrawal, message: "Withdrawal completed." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
