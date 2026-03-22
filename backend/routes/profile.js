const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const User = require("../models/User");
const Child = require("../models/Child");

// PUT /api/profile/picture - Upload own profile picture (base64)
router.put("/picture", protect, async (req, res) => {
  try {
    const { profilePic } = req.body; // base64 data URL
    if (!profilePic) return res.status(400).json({ error: "No image provided" });
    // Validate it's a valid image data URL
    if (!profilePic.startsWith("data:image/")) {
      return res.status(400).json({ error: "Invalid image format" });
    }
    // Check size (base64 ~1.37x actual) — max 2MB actual = ~2.7MB base64
    if (profilePic.length > 3 * 1024 * 1024) {
      return res.status(400).json({ error: "Image too large. Please compress it first." });
    }
    await User.findByIdAndUpdate(req.user._id, { profilePic });
    res.json({ success: true, profilePic });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/profile/child/:childId/picture - Upload child's picture (admin only or parent of child)
router.put("/child/:childId/picture", protect, async (req, res) => {
  try {
    const { childPic } = req.body;
    if (!childPic) return res.status(400).json({ error: "No image provided" });
    if (!childPic.startsWith("data:image/")) return res.status(400).json({ error: "Invalid image" });
    if (childPic.length > 3 * 1024 * 1024) return res.status(400).json({ error: "Image too large" });

    const child = await Child.findById(req.params.childId);
    if (!child) return res.status(404).json({ error: "Child not found" });

    // Allow admin or parent of child
    if (req.user.role !== "admin" && child.parent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }
    child.profilePic = childPic;
    await child.save();
    res.json({ success: true, childPic });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/profile/me - Get own profile
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({ user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
