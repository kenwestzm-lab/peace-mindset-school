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
    const messages = await Message.find({ parentId })
      .populate("sender", "name role")
      .sort({ createdAt: 1 })
      .limit(200);

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

// POST /api/chat - REST fallback
router.post("/", protect, async (req, res) => {
  try {
    const { content, parentId, messageType, mediaData, mediaMimeType, duration } = req.body;
    if (!content || !parentId) return res.status(400).json({ error: "Content and parentId required." });
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
    res.status(201).json({ message: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

// Group broadcast - admin sends to ALL parents
router.post('/broadcast', protect, authorize('admin'), async (req, res) => {
  try {
    const { content, messageType, mediaData, mediaMimeType, duration } = req.body;
    const { Message } = require('../models/index');
    const User = require('../models/User');
    const parents = await User.find({ role: 'parent' }, '_id');
    const io = req.app.get('io');
    const messages = [];
    for (const parent of parents) {
      const message = await Message.create({
        sender: req.user._id,
        senderRole: 'admin',
        parentId: parent._id,
        content,
        messageType: messageType || 'text',
        mediaData: mediaData || null,
        mediaMimeType: mediaMimeType || null,
        duration: duration || null,
      });
      const populated = await message.populate('sender', 'name role');
      io.to(`user:${parent._id}`).emit('new_message', populated);
      messages.push(populated);
    }
    io.to('admin_room').emit('broadcast_sent', { count: parents.length });
    res.status(201).json({ success: true, count: parents.length, messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
