const express = require("express");
const router = express.Router();
const webpush = require("web-push");
const { PushSubscription } = require("../models/index");
const { protect } = require("../middleware/auth");

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.DEVELOPER_EMAIL || "admin@peacemindset.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// POST /api/push/subscribe
router.post("/subscribe", protect, async (req, res) => {
  try {
    const { subscription, deviceName } = req.body;
    if (!subscription) return res.status(400).json({ error: "Subscription required" });

    // Upsert: update if same endpoint exists, otherwise create
    await PushSubscription.findOneAndUpdate(
      { user: req.user._id, "subscription.endpoint": subscription.endpoint },
      { user: req.user._id, subscription, deviceName: deviceName || "Unknown device" },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/push/unsubscribe
router.delete("/unsubscribe", protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await PushSubscription.deleteMany({ user: req.user._id, "subscription.endpoint": endpoint });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/push/vapidPublicKey
router.get("/vapidPublicKey", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
});

// ─── Helper function used by other routes ────────────────────────────────────
const sendPushToUser = async (userId, payload) => {
  try {
    const subs = await PushSubscription.find({ user: userId });
    if (!subs.length) return;

    const notification = JSON.stringify({
      title: payload.title || "Peace Mindset",
      body: payload.body || "",
      icon: payload.icon || "/logo.webp",
      badge: "/logo.webp",
      url: payload.url || "/",
      timestamp: Date.now(),
    });

    const results = await Promise.allSettled(
      subs.map(sub => webpush.sendNotification(sub.subscription, notification))
    );

    // Remove expired/invalid subscriptions
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "rejected") {
        const statusCode = results[i].reason?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await PushSubscription.findByIdAndDelete(subs[i]._id);
        }
      }
    }
  } catch (err) {
    console.error("Push notification error:", err.message);
  }
};

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
