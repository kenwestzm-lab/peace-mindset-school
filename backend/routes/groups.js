const express = require("express");
const router = express.Router();
const { Group, GroupMessage } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");

// GET /api/groups - Get all groups user is member of
router.get("/", protect, async (req, res) => {
  try {
    const query = req.user.role === "admin"
      ? { isActive: true }
      : { isActive: true, members: req.user._id };
    const groups = await Group.find(query)
      .populate("members", "name email profilePic")
      .populate("createdBy", "name")
      .sort({ lastMessageTime: -1, createdAt: -1 });
    res.json({ groups });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups - Create group (admin only)
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, description, icon, members = [] } = req.body;
    if (!name) return res.status(400).json({ error: "Group name required" });

    const group = await Group.create({
      name, description, icon: icon || "👥",
      createdBy: req.user._id,
      members: [...new Set([...members, req.user._id.toString()])],
      admins: [req.user._id],
    });
    const populated = await group.populate("members", "name email profilePic");

    // Notify all members via socket
    const io = req.app.get("io");
    for (const memberId of group.members) {
      io.to(`user:${memberId}`).emit("group_added", { group: populated });
    }
    io.to("admin_room").emit("group_created", { group: populated });

    res.status(201).json({ group: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups/:id/members - Add members
router.post("/:id/members", protect, authorize("admin"), async (req, res) => {
  try {
    const { members } = req.body;
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: { $each: members } } },
      { new: true }
    ).populate("members", "name email profilePic");
    if (!group) return res.status(404).json({ error: "Group not found" });
    const io = req.app.get("io");
    for (const memberId of members) {
      io.to(`user:${memberId}`).emit("group_added", { group });
    }
    res.json({ group });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/groups/:id/messages
router.get("/:id/messages", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Not found" });
    const isMember = req.user.role === "admin" || group.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ error: "Not a member" });

    const messages = await GroupMessage.find({
      group: req.params.id,
      deletedForEveryone: false,
      deletedFor: { $ne: req.user._id },
    }).populate("sender", "name role profilePic").sort({ createdAt: 1 }).limit(200);

    res.json({ messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups/:id/messages - HTTP fallback
router.post("/:id/messages", protect, async (req, res) => {
  try {
    const { content, messageType, mediaData, mediaMimeType, duration } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Not found" });

    const isMember = req.user.role === "admin" || group.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ error: "Not a member" });

    const msg = await GroupMessage.create({
      group: req.params.id, sender: req.user._id,
      content: content || "", messageType: messageType || "text",
      mediaData: mediaData || null, mediaMimeType: mediaMimeType || null, duration: duration || null,
    });
    await Group.findByIdAndUpdate(req.params.id, {
      lastMessage: messageType !== "text" ? `📎 ${messageType}` : (content||"").substring(0,60),
      lastMessageTime: new Date(),
    });
    const populated = await msg.populate("sender", "name role profilePic");
    const io = req.app.get("io");
    io.to(`group:${req.params.id}`).emit("new_group_message", populated);
    res.status(201).json({ message: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/groups/:id/messages/:msgId
router.delete("/:id/messages/:msgId", protect, async (req, res) => {
  try {
    const { deleteForEveryone } = req.body;
    const msg = await GroupMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ error: "Not found" });

    if (deleteForEveryone && (msg.sender.toString() === req.user._id.toString() || req.user.role === "admin")) {
      await GroupMessage.findByIdAndUpdate(req.params.msgId, { deletedForEveryone: true, content: "This message was deleted", mediaData: null });
      const io = req.app.get("io");
      io.to(`group:${req.params.id}`).emit("group_message_deleted", { msgId: req.params.msgId, forEveryone: true });
    } else {
      await GroupMessage.findByIdAndUpdate(req.params.msgId, { $addToSet: { deletedFor: req.user._id } });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/groups/:id - Delete group (admin only)
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Group.findByIdAndUpdate(req.params.id, { isActive: false });
    const io = req.app.get("io");
    io.to(`group:${req.params.id}`).emit("group_deleted", { groupId: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
