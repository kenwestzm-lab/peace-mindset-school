const express = require("express");
const router = express.Router();
const { Message } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");

// GET /api/chat/:parentId
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
    }).populate("sender", "name role").sort({ createdAt: 1 }).limit(200);

    await Message.updateMany(
      { parentId, sender: { $ne: req.user._id }, isRead: false },
      { isRead: true }
    );
    res.json({ messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/chat/admin/conversations
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
        const parent = await User.findById(conv._id, "name email phone");
        return { ...conv, parent };
      })
    );
    res.json({ conversations: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat
router.post("/", protect, async (req, res) => {
  try {
    const { content, parentId, messageType, mediaData, mediaMimeType, duration } = req.body;
    if (!content || !parentId) return res.status(400).json({ error: "Required fields missing." });
    if (req.user.role === "parent" && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: "Access denied." });
    }
    const message = await Message.create({
      sender: req.user._id,
      senderRole: req.user.role === "admin" ? "admin" : "parent",
      parentId,
      content,
      messageType: messageType || "text",
      mediaData: mediaData || null,
      mediaMimeType: mediaMimeType || null,
      duration: duration || null,
    });
    const populated = await message.populate("sender", "name role");
    const io = req.app.get("io");
    io.to("admin_room").emit("new_message", populated);
    io.to(`user:${parentId}`).emit("new_message", populated);

    // Push notification
    try {
      const { sendPushToUser } = require("./push");
      if (req.user.role === "admin") {
        await sendPushToUser(parentId, {
          title: "Peace Mindset School",
          body: `Admin: ${messageType !== "text" ? "📎 Media" : content.substring(0, 60)}`,
          icon: "/logo.webp", url: "/parent/chat",
        });
      }
    } catch {}

    res.status(201).json({ message: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/chat/:id - Delete message
router.delete("/:id", protect, async (req, res) => {
  try {
    const { deleteForEveryone } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Not found" });

    if (deleteForEveryone && (msg.sender.toString()===req.user._id.toString() || req.user.role==="admin")) {
      await Message.findByIdAndUpdate(req.params.id, {
        deletedForEveryone: true,
        content: "This message was deleted",
        mediaData: null,
      });
      const io = req.app.get("io");
      io.to("admin_room").emit("message_deleted", { msgId:req.params.id, forEveryone:true });
      io.to(`user:${msg.parentId}`).emit("message_deleted", { msgId:req.params.id, forEveryone:true });
    } else {
      await Message.findByIdAndUpdate(req.params.id, { $addToSet: { deletedFor: req.user._id } });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/chat/:id/react - Add reaction
router.put("/:id/react", protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Not found" });

    const existing = msg.reactions?.find(r => r.user.toString()===req.user._id.toString());
    if (existing) {
      await Message.findByIdAndUpdate(req.params.id, {
        $pull: { reactions: { user: req.user._id } }
      });
    } else {
      await Message.findByIdAndUpdate(req.params.id, {
        $push: { reactions: { user: req.user._id, emoji } }
      });
    }
    const io = req.app.get("io");
    io.to("admin_room").emit("message_reaction", { msgId:req.params.id });
    io.to(`user:${msg.parentId}`).emit("message_reaction", { msgId:req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
