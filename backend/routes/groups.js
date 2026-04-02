
const express = require("express");
const router = express.Router();
const { Group, GroupMessage } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");
const { smartUpload } = require("../utils/cloudinary");

// GET /api/groups
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

// POST /api/groups — create (admin only)
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
    const io = req.app.get("io");
    for (const memberId of group.members) {
      io.to(`user:${memberId}`).emit("group_added", { group: populated });
    }
    io.to("admin_room").emit("group_created", { group: populated });
    res.status(201).json({ group: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups/:id/members
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

// GET /api/groups/:id/members
router.get("/:id/members", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members", "name email profilePic");
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json({ members: group.members || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/groups/:id — update name, description, photo, permissions
router.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, description, photo, permissions } = req.body;
    const update = {};
    if (name) update.name = name;
    if (description !== undefined) update.description = description;
    if (photo) update.photo = photo;          // ← RESTORED: save photo URL
    if (permissions) update.permissions = permissions;

    const group = await Group.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const io = req.app.get("io");
    io.to(`group:${req.params.id}`).emit("group_updated", {
      groupId: req.params.id,
      name: group.name,
      photo: group.photo,
      permissions: group.permissions,
    });
    // Also emit to all sockets (not just group room) so list updates
    io.emit("group_updated", {
      groupId: req.params.id,
      name: group.name,
      photo: group.photo,
    });
    res.json({ group });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/groups/:id/photo — update cover photo (admin only, real-time)
router.put("/:id/photo", protect, authorize("admin"), async (req, res) => {
  try {
    const { photoData, mimeType } = req.body;
    if (!photoData) return res.status(400).json({ error: "No image provided" });

    let photoUrl = photoData;
    let photoPublicId = null;

    // Upload to Cloudinary if base64
    if (!photoData.startsWith("http://") && !photoData.startsWith("https://")) {
      const result = await smartUpload(photoData, {
        mimeType: mimeType || "image/jpeg",
        folder: "peace-mindset/groups",
      });
      photoUrl = result.url;
      photoPublicId = result.publicId;
    }

    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { photo: photoUrl, photoPublicId },
      { new: true }
    );
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Broadcast to ALL group members in real time
    const io = req.app.get("io");
    io.to(`group:${req.params.id}`).emit("group_photo_updated", {
      groupId: req.params.id,
      photo: photoUrl,
    });
    // Also emit group_updated for list view
    io.emit("group_updated", { groupId: req.params.id, photo: photoUrl });

    res.json({ success: true, photo: photoUrl, group });
  } catch (err) {
    console.error("Group photo error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/:id/members/:userId
router.delete("/:id/members/:userId", protect, authorize("admin"), async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: req.params.userId } },
      { new: true }
    );
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/groups/:id/messages
router.get("/:id/messages", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Not found" });

    // Admin always has access; members can read
    const isMember = req.user.role === "admin" ||
      group.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ error: "Not a member" });

    const messages = await GroupMessage.find({
      group: req.params.id,
      deletedForEveryone: false,
      deletedFor: { $ne: req.user._id },
    })
      .populate("sender", "name role profilePic")
      .sort({ createdAt: 1 })
      .limit(200);
    res.json({ messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/groups/:id/messages — HTTP fallback for sending messages
router.post("/:id/messages", protect, async (req, res) => {
  try {
    const { content, messageType, mediaData, mediaMimeType, duration } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Not found" });

    // Admin always can send; members can send if permission allows
    const isMember = req.user.role === "admin" ||
      group.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ error: "Not a member" });

    // Check member send permission (admin can always send)
    if (req.user.role !== "admin" && group.permissions?.membersCanSend === false) {
      return res.status(403).json({ error: "Members cannot send messages in this group" });
    }

    // Handle media upload to Cloudinary
    let finalMediaData = mediaData || null;
    let mediaPublicId = null;
    if (mediaData && messageType !== "text" && messageType !== "voice" &&
        mediaData.startsWith("data:")) {
      try {
        const { smartUpload } = require("../utils/cloudinary");
        const folder = messageType === "video" ? "peace-mindset/group-videos" : "peace-mindset/group-images";
        const uploaded = await smartUpload(mediaData, { mimeType: mediaMimeType, folder });
        finalMediaData = uploaded.url;
        mediaPublicId = uploaded.publicId;
      } catch (e) { console.error("Group media upload:", e.message); }
    }

    const msg = await GroupMessage.create({
      group: req.params.id,
      sender: req.user._id,
      content: content || "",
      messageType: messageType || "text",
      mediaData: finalMediaData,
      mediaMimeType: mediaMimeType || null,
      duration: duration || null,
    });

    await Group.findByIdAndUpdate(req.params.id, {
      lastMessage: messageType !== "text" ? `📎 ${messageType}` : (content || "").substring(0, 60),
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
      await GroupMessage.findByIdAndUpdate(req.params.msgId, {
        deletedForEveryone: true, content: "This message was deleted", mediaData: null,
      });
      const io = req.app.get("io");
      io.to(`group:${req.params.id}`).emit("group_message_deleted", { msgId: req.params.msgId, forEveryone: true });
    } else {
      await GroupMessage.findByIdAndUpdate(req.params.msgId, { $addToSet: { deletedFor: req.user._id } });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/groups/:id
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Group.findByIdAndUpdate(req.params.id, { isActive: false });
    const io = req.app.get("io");
    io.to(`group:${req.params.id}`).emit("group_deleted", { groupId: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/groups/:id/join
router.put("/:id/join", protect, async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: req.user._id } },
      { new: true }
    ).populate("members", "name email profilePic");
    if (!group) return res.status(404).json({ error: "Group not found" });
    const io = req.app.get("io");
    io.to("admin_room").emit("group_member_joined", { groupId: group._id, user: req.user._id });
    res.json({ group });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
