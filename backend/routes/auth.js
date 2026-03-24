const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { protect, generateToken } = require("../middleware/auth");

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required").normalizeEmail({gmail_remove_dots: false}),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone } = req.body;

    // Block admin/dev emails from self-registering
    if (
      email === process.env.ADMIN_EMAIL.toLowerCase() ||
      email === process.env.DEVELOPER_EMAIL.toLowerCase()
    ) {
      return res.status(403).json({ error: "This email is reserved." });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: "parent",
    });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
        phone: user.phone,
profilePic: user.profilePic,
      },
    });
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required").normalizeEmail({gmail_remove_dots: false}),
    body("password").notEmpty().withMessage("Password required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated. Contact admin." });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
        phone: user.phone,
profilePic: user.profilePic,
      },
    });
  }
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  const fresh = await User.findById(req.user._id).select("-password").lean();
  res.json({ user: fresh });
});

// ─── PUT /api/auth/language ───────────────────────────────────────────────────
router.put("/language", protect, async (req, res) => {
  const { language } = req.body;
  if (!["en", "fr"].includes(language)) {
    return res.status(400).json({ error: "Invalid language. Choose 'en' or 'fr'." });
  }

  await User.findByIdAndUpdate(req.user._id, { language });
  res.json({ message: "Language updated.", language });
});

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
router.put("/profile", protect, async (req, res) => {
  const { name, phone } = req.body;
  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone },
    { new: true, runValidators: true }
  );
  res.json({ user: updated });
});

// ─── PUT /api/auth/password ───────────────────────────────────────────────────
router.put(
  "/password",
  protect,
  [
    body("currentPassword").notEmpty().withMessage("Current password required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 chars"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ error: "Current password is incorrect." });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully." });
  }
);

module.exports = router;
