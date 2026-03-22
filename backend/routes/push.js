const express = require("express");
const router = express.Router();
const webpush = require("web-push");
const { PushSubscription } = require("../models/index");
const { protect } = require("../middleware/auth");

// Setup VAPID (set in env or generate)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:adminpeacemindset.edu.zm@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// GET /api/push/vapid-public-key
router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

// POST /api/push/subscribe - Save push subscription
router.post("/subscribe", protect, async (req, res) => {
  try {
    const { subscription, deviceName } = req.body;
    await PushSubscription.findOneAndUpdate(
      { user: req.user._id, "subscription.endpoint": subscription.endpoint },
      { user: req.user._id, subscription, deviceName: deviceName || "Android" },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/push/send - Send push to specific user (internal use)
router.post("/send", protect, async (req, res) => {
  try {
    const { userId, title, body, icon, url } = req.body;
    const subs = await PushSubscription.find({ user: userId });
    const payload = JSON.stringify({ title, body, icon: icon || "/logo.webp", url: url || "/" });

    const results = await Promise.allSettled(
      subs.map(sub => webpush.sendNotification(sub.subscription, payload).catch(async (e) => {
        if (e.statusCode === 410) await PushSubscription.findByIdAndDelete(sub._id);
        throw e;
      }))
    );
    res.json({ sent: results.filter(r=>r.status==="fulfilled").length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Helper: send push to user (used internally)
const sendPushToUser = async (userId, notification) => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY) return;
    const subs = await PushSubscription.find({ user: userId });
    const payload = JSON.stringify(notification);
    await Promise.allSettled(
      subs.map(sub => webpush.sendNotification(sub.subscription, payload).catch(async (e) => {
        if (e.statusCode === 410) await PushSubscription.findByIdAndDelete(sub._id);
      }))
    );
  } catch {}
};

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
