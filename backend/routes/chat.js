const express = require("express");
const router = express.Router();
const { Message } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");

// GET /api/chat/:parentId - Get chat history
router.get("/:parentId", protect, async (req, res) => {
  try {
    const { parentId } = req.params;

    // Parents can only see their own chat
    if (req.user.role === "parent" && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: "Access denied." });
    }

    const messages = await Message.find({ parentId })
      .populate("sender", "name role")
      .sort({ createdAt: 1 })
      .limit(100);

    // Mark messages as read
    await Message.updateMany(
      {
        parentId,
        sender: { $ne: req.user._id },
        isRead: false,
      },
      { isRead: true }
    );

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/admin/conversations - Admin: list all conversations
router.get("/admin/conversations", protect, authorize("admin"), async (req, res) => {
  try {
    // Get latest message per parent
    const conversations = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$parentId",
          lastMessage: { $first: "$content" },
          lastTime: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [{ $eq: ["$isRead", false] }, 1, 0],
            },
          },
        },
      },
      { $sort: { lastTime: -1 } },
    ]);

    // Populate parent info
    const User = require("../models/User");
    const populated = await Promise.all(
      conversations.map(async (conv) => {
        const parent = await User.findById(conv._id, "name email phone");
        return { ...conv, parent };
      })
    );

    res.json({ conversations: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat - Send message (also via socket, this is REST fallback)
router.post("/", protect, async (req, res) => {
  try {
    const { content, parentId } = req.body;

    if (!content || !parentId) {
      return res.status(400).json({ error: "Content and parentId are required." });
    }

    // Validate: parent can only send to their own chat
    if (req.user.role === "parent" && req.user._id.toString() !== parentId) {
      return res.status(403).json({ error: "Access denied." });
    }

    const message = await Message.create({
      sender: req.user._id,
      senderRole: req.user.role === "admin" ? "admin" : "parent",
      parentId,
      content,
    });

    const populated = await message.populate("sender", "name role");

    const io = req.app.get("io");
    io.to("admin_room").emit("new_message", populated);
    io.to(`user:${parentId}`).emit("new_message", populated);

    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
