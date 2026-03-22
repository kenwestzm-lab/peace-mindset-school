const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const User = require("../models/User");
const { smartUpload } = require("../utils/cloudinary");

const processImage = async (imageData, folder, publicId) => {
  if (!imageData) throw new Error("No image provided");
  if (imageData.startsWith("http://") || imageData.startsWith("https://")) return imageData;
  if (!imageData.startsWith("data:")) throw new Error("Invalid image format. Please use a photo from your gallery.");
  try {
    const r = await smartUpload(imageData, { mimeType: "image/jpeg", folder, publicId });
    return r.url;
  } catch (e) {
    const sizeBytes = Math.round((imageData.length * 3) / 4);
    if (sizeBytes > 5*1024*1024) throw new Error("Image too large. Please use a smaller photo.");
    return imageData;
  }
};

router.put("/picture", protect, async (req, res) => {
  try {
    const url = await processImage(req.body.profilePic, "peace-mindset/profiles", `user_${req.user._id}`);
    await User.findByIdAndUpdate(req.user._id, { profilePic: url });
    res.json({ success: true, profilePic: url });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put("/child/:childId/picture", protect, async (req, res) => {
  try {
    const Child = require("../models/Child");
    const child = await Child.findById(req.params.childId);
    if (!child) return res.status(404).json({ error: "Child not found" });
    if (req.user.role !== "admin" && child.parent?.toString() !== req.user._id.toString()) return res.status(403).json({ error: "Not authorized" });
    const url = await processImage(req.body.childPic, "peace-mindset/children", `child_${child._id}`);
    child.profilePic = url;
    await child.save();
    res.json({ success: true, childPic: url });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

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
    res.json({ success: true, user: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password").lean();
    res.json({ user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
