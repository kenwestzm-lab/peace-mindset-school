const express = require("express");
const router = express.Router();
const https = require("https");
const { Earnings, Withdrawal } = require("../models/index");
const Payment = require("../models/Payment");
const User = require("../models/User");
const Child = require("../models/Child");
const { protect, authorize } = require("../middleware/auth");

// ─── MTN MoMo Disbursement ──────────────────────────────────────────────────
// Register at: https://momoapi.mtn.com
// Required env vars: MTN_SUBSCRIPTION_KEY, MTN_API_USER, MTN_API_KEY, MTN_ENV
async function sendMTNMoMo(amount, phoneNumber, reference) {
  const subKey = process.env.MTN_SUBSCRIPTION_KEY;
  const apiUser = process.env.MTN_API_USER;
  const apiKey = process.env.MTN_API_KEY;
  const env = process.env.MTN_ENV || "sandbox"; // "sandbox" or "production"
  const baseUrl = env === "production"
    ? "proxy.momoapi.mtn.com"
    : "sandbox.momoapi.mtn.com";

  if (!subKey || !apiUser || !apiKey) {
    throw new Error("MTN_NOT_CONFIGURED");
  }

  // Step 1: Get access token
  const credentials = Buffer.from(`${apiUser}:${apiKey}`).toString("base64");
  const tokenData = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: baseUrl,
      path: "/disbursement/token/",
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Ocp-Apim-Subscription-Key": subKey,
        "Content-Length": 0,
      },
    }, (res) => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error("MTN token parse error")); }
      });
    });
    req.on("error", reject);
    req.end();
  });

  if (!tokenData.access_token) {
    throw new Error(`MTN auth failed: ${JSON.stringify(tokenData)}`);
  }

  // Step 2: Send disbursement transfer
  const msisdn = phoneNumber.replace(/^0/, "260"); // Convert 097... → 26097... (Zambia code)
  const body = JSON.stringify({
    amount: amount.toFixed(2),
    currency: "ZMW",
    externalId: reference,
    payee: { partyIdType: "MSISDN", partyId: msisdn },
    payerMessage: "Peace Mindset Developer Earnings",
    payeeNote: `Withdrawal ref: ${reference}`,
  });

  const transferResult = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: baseUrl,
      path: "/disbursement/v1_0/transfer",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "X-Reference-Id": reference,
        "X-Target-Environment": env,
        "Ocp-Apim-Subscription-Key": subKey,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  // 202 Accepted = success
  if (transferResult.statusCode !== 202) {
    throw new Error(`MTN transfer failed (${transferResult.statusCode}): ${transferResult.body}`);
  }

  return { provider: "MTN MoMo", reference, status: "completed" };
}

// ─── Airtel Money Disbursement ───────────────────────────────────────────────
// Register at: https://developers.airtel.africa
// Required env vars: AIRTEL_CLIENT_ID, AIRTEL_CLIENT_SECRET, AIRTEL_ENV
async function sendAirtelMoney(amount, phoneNumber, reference) {
  const clientId = process.env.AIRTEL_CLIENT_ID;
  const clientSecret = process.env.AIRTEL_CLIENT_SECRET;
  const env = process.env.AIRTEL_ENV || "sandbox"; // "sandbox" or "production"
  const baseUrl = env === "production"
    ? "openapi.airtel.africa"
    : "openapiuat.airtel.africa";

  if (!clientId || !clientSecret) {
    throw new Error("AIRTEL_NOT_CONFIGURED");
  }

  // Step 1: Get OAuth token
  const authBody = JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const tokenData = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: baseUrl,
      path: "/auth/oauth2/token",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(authBody),
      },
    }, (res) => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error("Airtel token parse error")); }
      });
    });
    req.on("error", reject);
    req.write(authBody);
    req.end();
  });

  if (!tokenData.access_token) {
    throw new Error(`Airtel auth failed: ${JSON.stringify(tokenData)}`);
  }

  // Step 2: Disburse payment
  const msisdn = phoneNumber.replace(/^0/, "260");
  const disbBody = JSON.stringify({
    payee: { msisdn, wallet_type: "NORMAL" },
    reference,
    pin: process.env.AIRTEL_PIN || "0000",
    transaction: {
      amount: amount.toFixed(2),
      id: reference,
      type: "B2C",
    },
    country: "ZM",
    currency: "ZMW",
  });

  const result = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: baseUrl,
      path: "/standard/v1/disbursements/",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
        "X-Country": "ZM",
        "X-Currency": "ZMW",
        "Content-Length": Buffer.byteLength(disbBody),
      },
    }, (res) => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error("Airtel disburse parse error")); }
      });
    });
    req.on("error", reject);
    req.write(disbBody);
    req.end();
  });

  if (result.status?.code !== "200" && result.status?.response_code !== "DP00800001006") {
    throw new Error(`Airtel transfer failed: ${JSON.stringify(result)}`);
  }

  return { provider: "Airtel Money", reference, status: "completed" };
}

// ─── Universal payout dispatcher ────────────────────────────────────────────
async function sendMobileMoney(provider, amount, phoneNumber, reference) {
  if (provider === "MTN MoMo") {
    return await sendMTNMoMo(amount, phoneNumber, reference);
  } else if (provider === "Airtel Money") {
    return await sendAirtelMoney(amount, phoneNumber, reference);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────

// GET /api/developer/dashboard
router.get("/dashboard", protect, authorize("developer"), async (req, res) => {
  try {
    const [totalEarnings, availableBalance, totalWithdrawn,
           totalParents, totalChildren, totalPayments, totalPaymentsAmount,
           monthlyEarnings] = await Promise.all([
      Earnings.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Earnings.aggregate([{ $match: { status: "available" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Withdrawal.aggregate([{ $match: { status: "completed" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      User.countDocuments({ role: "parent" }),
      Child.countDocuments({ isActive: true }),
      Payment.countDocuments({ status: "approved" }),
      Payment.aggregate([{ $match: { status: "approved" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Earnings.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    // Check if mobile money APIs are configured
    const mtnConfigured = !!(process.env.MTN_SUBSCRIPTION_KEY && process.env.MTN_API_USER && process.env.MTN_API_KEY);
    const airtelConfigured = !!(process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET);

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
      payoutConfig: { mtnConfigured, airtelConfigured },
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

// POST /api/developer/withdraw — Real mobile money payout
router.post("/withdraw", protect, authorize("developer"), async (req, res) => {
  try {
    const { amount, mobileMoneyProvider, phoneNumber } = req.body;

    if (!amount || !mobileMoneyProvider || !phoneNumber) {
      return res.status(400).json({ error: "Amount, provider, and phone number are required." });
    }

    const withdrawAmount = Number(amount);
    if (withdrawAmount < 1) {
      return res.status(400).json({ error: "Minimum withdrawal is ZMW 1." });
    }

    // Check available balance
    const balanceResult = await Earnings.aggregate([
      { $match: { status: "available" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const balance = balanceResult[0]?.total || 0;

    if (withdrawAmount > balance) {
      return res.status(400).json({
        error: `Insufficient balance. Available: ZMW ${balance.toFixed(2)}`,
      });
    }

    // Create withdrawal record (pending while we process)
    const withdrawal = await Withdrawal.create({
      developer: req.user._id,
      amount: withdrawAmount,
      mobileMoneyProvider,
      phoneNumber,
      status: "processing",
    });

    // Deduct earnings immediately (FIFO)
    let remaining = withdrawAmount;
    const availableEarnings = await Earnings.find({ status: "available" }).sort({ createdAt: 1 });
    for (const earning of availableEarnings) {
      if (remaining <= 0) break;
      earning.status = "withdrawn";
      earning.withdrawal = withdrawal._id;
      await earning.save();
      remaining -= earning.amount;
    }

    const io = req.app.get("io");

    // Attempt real mobile money payout
    try {
      const payoutResult = await sendMobileMoney(
        mobileMoneyProvider,
        withdrawAmount,
        phoneNumber,
        withdrawal._id.toString()
      );

      // Success — mark completed
      withdrawal.status = "completed";
      withdrawal.reference = payoutResult.reference;
      withdrawal.processedAt = new Date();
      withdrawal.notes = `Auto-paid via ${mobileMoneyProvider} API`;
      await withdrawal.save();

      io.to("developer_room").emit("withdrawal_update", { withdrawal, success: true });
      io.to("developer_room").emit("earnings_update", { newBalance: Math.max(0, balance - withdrawAmount) });

      return res.status(201).json({
        withdrawal,
        newBalance: Math.max(0, balance - withdrawAmount),
        message: `✅ ZMW ${withdrawAmount.toFixed(2)} sent to ${mobileMoneyProvider} (${phoneNumber}). Check your phone!`,
        autoSent: true,
      });

    } catch (payoutErr) {
      // API not configured or failed — mark as pending manual
      const notConfigured = payoutErr.message.includes("NOT_CONFIGURED");

      withdrawal.status = notConfigured ? "pending" : "failed";
      withdrawal.notes = notConfigured
        ? `API not configured. Send ZMW ${withdrawAmount} manually to ${phoneNumber} via ${mobileMoneyProvider}.`
        : `Auto-payout failed: ${payoutErr.message}. Send manually.`;
      await withdrawal.save();

      io.to("developer_room").emit("withdrawal_update", { withdrawal, autoSent: false });

      return res.status(201).json({
        withdrawal,
        newBalance: Math.max(0, balance - withdrawAmount),
        message: notConfigured
          ? `⚠️ ZMW ${withdrawAmount.toFixed(2)} deducted. API not configured — send manually to ${phoneNumber} via ${mobileMoneyProvider}.`
          : `⚠️ Auto-payout failed. ZMW ${withdrawAmount.toFixed(2)} deducted. Send manually to ${phoneNumber}.`,
        autoSent: false,
        setupRequired: notConfigured ? mobileMoneyProvider : null,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/developer/withdrawals/:id/complete — Mark manual payout as done
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
