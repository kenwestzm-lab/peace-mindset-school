const express = require("express");
const router = express.Router();
const { Group, GroupMessage } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");

// GET /api/groups - Get user's groups
router.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user._id,
      isActive: true,
    }).populate("members", "name role").sort({ lastMessageTime: -1 });
    res.json({ groups });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups - Admin: Create group
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, description, memberIds, icon } = req.body;
    const members = [...new Set([req.user._id.toString(), ...(memberIds || [])])];
    const group = await Group.create({
      name, description, icon: icon || "🏫",
      createdBy: req.user._id,
      members, admins: [req.user._id],
    });
    const populated = await group.populate("members", "name role");
    const io = req.app.get("io");
    members.forEach(uid => io.to(`user:${uid}`).emit("group_created", { group: populated }));
    res.status(201).json({ group: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/groups/:id/messages - Get group messages
router.get("/:id/messages", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.members.includes(req.user._id)) {
      return res.status(403).json({ error: "Not a member" });
    }
    const messages = await GroupMessage.find({
      group: req.params.id,
      deletedForEveryone: false,
      deletedFor: { $ne: req.user._id },
    }).populate("sender", "name role").sort({ createdAt: 1 }).limit(200);

    // Mark as read
    await GroupMessage.updateMany(
      { group: req.params.id, sender: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    res.json({ messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups/:id/messages - Send group message
router.post("/:id/messages", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group || !group.members.map(m=>m.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ error: "Not a member" });
    }
    const { content, messageType, mediaData, mediaMimeType, duration } = req.body;
    const msg = await GroupMessage.create({
      group: req.params.id,
      sender: req.user._id,
      content, messageType: messageType||"text",
      mediaData, mediaMimeType, duration,
    });
    const populated = await msg.populate("sender", "name role");

    // Update group last message
    await Group.findByIdAndUpdate(req.params.id, {
      lastMessage: messageType==="text" ? content : `${messageType==="voice"?"🎤":messageType==="image"?"📷":"🎥"} ${messageType}`,
      lastMessageTime: new Date(),
    });

    const io = req.app.get("io");
    group.members.forEach(uid => io.to(`user:${uid}`).emit("group_message", { message: populated, groupId: req.params.id }));
    res.status(201).json({ message: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/groups/:id/messages/:msgId - Delete message
router.delete("/:id/messages/:msgId", protect, async (req, res) => {
  try {
    const { deleteForEveryone } = req.body;
    const msg = await GroupMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ error: "Not found" });

    if (deleteForEveryone && (msg.sender.toString()===req.user._id.toString() || req.user.role==="admin")) {
      await GroupMessage.findByIdAndUpdate(req.params.msgId, { deletedForEveryone:true, content:"This message was deleted" });
      const io = req.app.get("io");
      const group = await Group.findById(req.params.id);
      group?.members.forEach(uid => io.to(`user:${uid}`).emit("message_deleted", { msgId:req.params.msgId, groupId:req.params.id, forEveryone:true }));
    } else {
      await GroupMessage.findByIdAndUpdate(req.params.msgId, { $addToSet: { deletedFor: req.user._id } });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups/:id/add - Add member
router.post("/:id/add", protect, authorize("admin"), async (req, res) => {
  try {
    const { userId } = req.body;
    await Group.findByIdAndUpdate(req.params.id, { $addToSet: { members: userId } });
    const group = await Group.findById(req.params.id).populate("members", "name role");
    const io = req.app.get("io");
    io.to(`user:${userId}`).emit("group_created", { group });
    res.json({ group });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
