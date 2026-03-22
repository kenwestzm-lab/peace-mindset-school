const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const User = require("../models/User");
const { smartUpload } = require("../utils/cloudinary");

// PUT /api/profile/picture
router.put("/picture", protect, async (req, res) => {
  try {
    const { profilePic } = req.body;
    if (!profilePic) return res.status(400).json({ error: "No image provided" });
    if (!profilePic.startsWith("data:image/")) return res.status(400).json({ error: "Invalid image" });

    let finalUrl = profilePic;
    try {
      const r = await smartUpload(profilePic, { mimeType: "image/jpeg", folder: "peace-mindset/profiles", publicId: `user_${req.user._id}` });
      finalUrl = r.url;
    } catch (e) {
      if (profilePic.length > 2*1024*1024) return res.status(400).json({ error: "Image too large. Use a smaller photo or set up Cloudinary." });
    }

    await User.findByIdAndUpdate(req.user._id, { profilePic: finalUrl });
    res.json({ success: true, profilePic: finalUrl });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/profile/child/:childId/picture
router.put("/child/:childId/picture", protect, async (req, res) => {
  try {
    const { childPic } = req.body;
    if (!childPic) return res.status(400).json({ error: "No image" });
    const Child = require("../models/Child");
    const child = await Child.findById(req.params.childId);
    if (!child) return res.status(404).json({ error: "Child not found" });
    if (req.user.role !== "admin" && child.parent.toString() !== req.user._id.toString()) return res.status(403).json({ error: "Not authorized" });

    let finalUrl = childPic;
    try {
      const r = await smartUpload(childPic, { mimeType: "image/jpeg", folder: "peace-mindset/children", publicId: `child_${child._id}` });
      finalUrl = r.url;
    } catch (e) {
      if (childPic.length > 2*1024*1024) return res.status(400).json({ error: "Image too large." });
    }

    child.profilePic = finalUrl;
    await child.save();
    res.json({ success: true, childPic: finalUrl });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/profile/update - Update name, email, phone, password
router.put("/update", protect, async (req, res) => {
  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name?.trim()) user.name = name.trim();
    if (phone) user.phone = phone.trim();

    if (email && email.toLowerCase() !== user.email) {
      const taken = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (taken) return res.status(400).json({ error: "Email already in use by another account" });
      user.email = email.toLowerCase().trim();
    }

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: "Enter your current password to change it" });
      const ok = await user.comparePassword(currentPassword);
      if (!ok) return res.status(400).json({ error: "Current password is incorrect" });
      if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });
      user.password = newPassword;
    }

    await user.save();
    const updated = await User.findById(user._id).select("-password").lean();
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
