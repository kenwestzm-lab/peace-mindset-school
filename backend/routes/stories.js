const express = require("express");
const router = express.Router();
const { Story } = require("../models/index");
const { protect } = require("../middleware/auth");

// GET /api/stories - Get all active stories
router.get("/", protect, async (req, res) => {
  try {
    const now = new Date();
    const stories = await Story.find({ isActive: true, expiresAt: { $gt: now } })
      .populate("author", "name role")
      .sort({ createdAt: -1 });
    res.json({ stories });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stories - Create story
router.post("/", protect, async (req, res) => {
  try {
    const { mediaType, mediaData, mediaMimeType, text, bgColor } = req.body;
    const story = await Story.create({
      author: req.user._id,
      mediaType: mediaType || "text",
      mediaData,
      mediaMimeType,
      text,
      bgColor: bgColor || "#6B0F1A",
    });
    const populated = await story.populate("author", "name role");
    const io = req.app.get("io");
    io.emit("new_story", { story: populated });
    res.status(201).json({ story: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/stories/:id/view - Mark as viewed
router.put("/:id/view", protect, async (req, res) => {
  try {
    await Story.findByIdAndUpdate(req.params.id, { $addToSet: { views: req.user._id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/stories/:id/like - Toggle like
router.put("/:id/like", protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found" });
    const liked = story.likes.includes(req.user._id);
    if (liked) {
      await Story.findByIdAndUpdate(req.params.id, { $pull: { likes: req.user._id } });
    } else {
      await Story.findByIdAndUpdate(req.params.id, { $addToSet: { likes: req.user._id } });
    }
    res.json({ liked: !liked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/stories/:id - Delete own story
router.delete("/:id", protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Not found" });
    if (story.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }
    await Story.findByIdAndDelete(req.params.id);
    const io = req.app.get("io");
    io.emit("story_deleted", { storyId: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
