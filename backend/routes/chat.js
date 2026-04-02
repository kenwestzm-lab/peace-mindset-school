const express = require("express");
const router = express.Router();
const { Message } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");
const { smartUpload, deleteFromCloudinary } = require("../utils/cloudinary");

// ── GET /api/chat/messages (parent fetches their own messages) ─────────
// MUST be before /:parentId to avoid conflict
router.get("/messages", protect, async (req, res) => {
  try {
    const messages = await Message.find({
      parentId: req.user._id,
      deletedForEveryone: false,
      deletedFor: { $ne: req.user._id },
    })
      .populate("sender", "name role profilePic")
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    await Message.updateMany(
      { parentId: req.user._id, sender: { $ne: req.user._id }, isRead: false },
      { isRead: true }
    );
    res.json({ messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/chat/message/:id (single message for reaction refresh) ────
router.get("/message/:id", protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate("sender", "name role profilePic")
      .lean();
    if (!message) return res.status(404).json({ error: "Not found" });
    res.json({ message });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/chat/admin/conversations ─────────────────────────────────
router.get("/admin/conversations", protect, authorize("admin"), async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      { $match: { deletedForEveryone: false } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: "$parentId",
        lastMessage: { $first: "$content" },
        lastMessageType: { $first: "$messageType" },
        lastTime: { $first: "$createdAt" },
        unreadCount: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
      }},
      { $sort: { lastTime: -1 } },
    ]);
    const User = require("../models/User");
    const populated = await Promise.all(
      conversations.map(async (conv) => {
        const parent = await User.findById(conv._id, "name email phone profilePic").lean();
        return { ...conv, parent };
      })
    );
    res.json({ conversations: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/chat/:id/read ─────────────────────────────────────────────
router.put("/:id/read", protect, async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/chat/:parentId ────────────────────────────────────────────
router.get("/:parentId", protect, async (req, res) => {
  try {
    const { parentId } = req.params;
    if (req.user.role === "parent" && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: "Access denied." });
    }
    const messages = await Message.find({
      parentId,
      deletedForEveryone: false,
      deletedFor: { $ne: req.user._id },
    })
      .populate("sender", "name role profilePic")
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    await Message.updateMany(
      { parentId, sender: { $ne: req.user._id }, isRead: false },
      { isRead: true }
    );
    res.json({ messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/chat - HTTP fallback (socket preferred) ─────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { content, parentId, messageType, mediaData, mediaMimeType, duration } = req.body;
    if (!parentId) return res.status(400).json({ error: "parentId required." });
    if (req.user.role === "parent" && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: "Access denied." });
    }

    let finalMediaUrl = null;
    let mediaPublicId = null;

    if (mediaData && messageType !== "text" && messageType !== "voice") {
      try {
        const uploaded = await smartUpload(mediaData, {
          mimeType: mediaMimeType,
          folder: "peace-mindset/chat",
        });
        finalMediaUrl = uploaded.url;
        mediaPublicId = uploaded.publicId;
      } catch (uploadErr) {
        console.error("Media upload error:", uploadErr.message);
        finalMediaUrl = mediaData;
      }
    } else if (mediaData) {
      finalMediaUrl = mediaData;
    }

    const message = await Message.create({
      sender: req.user._id,
      senderRole: req.user.role === "admin" ? "admin" : "parent",
      parentId,
      content: content || "",
      messageType: messageType || "text",
      mediaData: finalMediaUrl,
      mediaPublicId,
      mediaMimeType: mediaMimeType || null,
      duration: duration || null,
    });

    const populated = await message.populate("sender", "name role profilePic");
    const io = req.app.get("io");
    io.to("admin_room").emit("new_message", populated);
    io.to(`user:${parentId}`).emit("new_message", populated);

    try {
      const { sendPushToUser } = require("./push");
      if (req.user.role === "parent") {
        const User = require("../models/User");
        const admins = await User.find({ role: "admin" }, "_id");
        for (const a of admins) {
          await sendPushToUser(a._id.toString(), {
            title: `💬 ${req.user.name}`,
            body: messageType !== "text" ? `📎 ${messageType}` : (content || "").substring(0, 60),
            icon: "/logo.webp", url: "/admin/chat",
          });
        }
      } else {
        await sendPushToUser(parentId, {
          title: "Peace Mindset School",
          body: messageType !== "text" ? "📎 Media received" : (content || "").substring(0, 60),
          icon: "/logo.webp", url: "/parent/chat",
        });
      }
    } catch {}

    res.status(201).json({ message: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/chat/:id ───────────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    const { forEveryone } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const isOwner = msg.sender.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (forEveryone) {
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "You can only delete your own messages for everyone" });
      }
      if (msg.mediaPublicId) {
        const resourceType = msg.messageType === "video" ? "video" : "image";
        deleteFromCloudinary(msg.mediaPublicId, resourceType).catch(() => {});
      }
      await Message.findByIdAndUpdate(req.params.id, {
        deletedForEveryone: true,
        content: "This message was deleted",
        mediaData: null,
        mediaPublicId: null,
      });
      const io = req.app.get("io");
      io.to("admin_room").emit("message_deleted", { msgId: req.params.id, forEveryone: true });
      io.to(`user:${msg.parentId}`).emit("message_deleted", { msgId: req.params.id, forEveryone: true });
    } else {
      await Message.findByIdAndUpdate(req.params.id, {
        $addToSet: { deletedFor: req.user._id },
      });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/chat/:id/react ────────────────────────────────────────────
router.put("/:id/react", protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Not found" });

    const existing = msg.reactions?.find(r => r.user.toString() === req.user._id.toString());
    if (existing) {
      await Message.findByIdAndUpdate(req.params.id, { $pull: { reactions: { user: req.user._id } } });
    } else {
      await Message.findByIdAndUpdate(req.params.id, { $push: { reactions: { user: req.user._id, emoji } } });
    }
    const io = req.app.get("io");
    io.to("admin_room").emit("message_reaction", { msgId: req.params.id });
    io.to(`user:${msg.parentId}`).emit("message_reaction", { msgId: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
