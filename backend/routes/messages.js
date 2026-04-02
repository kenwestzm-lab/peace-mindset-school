const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { protect } = require("../middleware/auth");
const { processVideo } = require("../utils/processVideo");

// Get messages
router.get("/:groupId", protect, async (req, res) => {
  try {
    const messages = await Message.find({
      group: req.params.groupId,
      deletedBy: { $nin: [req.user._id] },
    }).populate("sender", "name profilePic");
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
router.post("/", protect, async (req, res) => {
  try {
    const { groupId, text, video: base64Video } = req.body;
    let videoUrl = null;
    if (base64Video) {
      videoUrl = await processVideo(
        base64Video,
        "peace-mindset/chat-videos",
        `msg_${req.user._id}_${Date.now()}`
      );
    }
    const message = await Message.create({
      group: groupId,
      sender: req.user._id,
      text,
      video: videoUrl,
    });
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete message
router.delete("/:id", protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message)
      return res.status(404).json({ error: "Message not found" });
    if (message.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized" });
    message.deletedBy.push(req.user._id);
    await message.save();
    res.json({ success: true, message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;const { processVideo } = require("../utils/processVideo");router.post("/", protect, async (req, res) => {
  try {
    const { groupId, text, video: base64Video } = req.body;

    let videoUrl = null;
    if (base64Video) {
      videoUrl = await processVideo(
        base64Video,
        "peace-mindset/chat-videos",
        `msg_${req.user._id}_${Date.now()}`
      );
    }

    const message = await Message.create({
      group: groupId,
      sender: req.user._id,
      text,
      video: videoUrl,
    });

    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});const { processVideo } = require("../utils/processVideo");
