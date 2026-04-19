
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const User = require("../models/User");
const { smartUpload } = require("../utils/cloudinary");

// PUT /api/profile/picture — update own profile pic
router.put("/picture", protect, async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) return res.status(400).json({ error: "No image provided" });
    if (profilePic.startsWith("http://") || profilePic.startsWith("https://")) {
      await User.findByIdAndUpdate(req.user._id, { profilePic });
      return res.json({ success: true, profilePic });
    }
    if (!profilePic.startsWith("data:")) return res.status(400).json({ error: "Invalid image format" });
    const result = await smartUpload(profilePic, { mimeType: "image/jpeg", folder: "peace-mindset/profiles" });
    await User.findByIdAndUpdate(req.user._id, { profilePic: result.url });
    res.json({ success: true, profilePic: result.url });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT /api/profile/child/:childId/picture — update child photo PERMANENTLY
router.put("/child/:childId/picture", protect, async (req, res) => {
  try {
    const Child = require("../models/Child");
    const child = await Child.findById(req.params.childId);
    if (!child) return res.status(404).json({ error: "Child not found" });
    if (req.user.role !== "admin" && child.parent?.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized" });

    const { childPic } = req.body;
    if (!childPic) return res.status(400).json({ error: "No image provided" });

    let finalUrl = childPic;

    // Upload to Cloudinary if base64 (not already a URL)
    if (!childPic.startsWith("http://") && !childPic.startsWith("https://")) {
      if (!childPic.startsWith("data:")) return res.status(400).json({ error: "Invalid image format" });
      const result = await smartUpload(childPic, {
        mimeType: "image/jpeg",
        folder: "peace-mindset/children",
      });
      finalUrl = result.url;
      child.profilePicPublicId = result.publicId || null;
    }

    // Save Cloudinary URL permanently to MongoDB
    child.profilePic = finalUrl;
    await child.save();

    console.log(`✅ Child ${child.name} photo saved: ${finalUrl}`);

    // Notify parent in real-time via socket
    try {
      const io = req.app.get("io");
      if (io && child.parent) {
        io.to(`user:${child.parent}`).emit("child_updated", {
          childId: child._id,
          profilePic: finalUrl,
        });
      }
      // Also notify admin room
      if (io) io.to("admin_room").emit("child_photo_updated", { childId: child._id, profilePic: finalUrl });
    } catch (socketErr) { console.error("Socket notify error:", socketErr.message); }

    res.json({ success: true, childPic: finalUrl, childId: child._id });
  } catch (err) {
    console.error("Child photo error:", err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/profile/update
router.put("/update", protect, async (req, res) => {
  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (name?.trim()) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (email && email.toLowerCase() !== user.email) {
      const taken = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (taken) return res.status(400).json({ error: "Email already in use" });
      user.email = email.toLowerCase().trim();
    }
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: "Enter your current password" });
      const ok = await user.comparePassword(currentPassword);
      if (!ok) return res.status(400).json({ error: "Current password is incorrect" });
      if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
      user.password = newPassword;
    }
    await user.save();
    const updated = await User.findById(user._id).select("-password").lean();
    // Emit real-time update to the user
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${user._id}`).emit("profile_updated", { user: updated });
        io.to("admin_room").emit("profile_updated", { user: updated });
      }
    } catch {}
    res.json({ success: true, user: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/profile/me
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password").lean();
    res.json({ user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
