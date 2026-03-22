const express = require("express");
const router = express.Router();
const { Story } = require("../models/index");
const { protect } = require("../middleware/auth");
const { smartUpload, deleteFromCloudinary } = require("../utils/cloudinary");

// GET /api/stories
router.get("/", protect, async (req, res) => {
  try {
    const stories = await Story.find({ isActive: true, expiresAt: { $gt: new Date() } })
      .populate("author", "name role profilePic")
      .sort({ createdAt: -1 }).lean();
    res.json({ stories });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stories
router.post("/", protect, async (req, res) => {
  try {
    const { mediaType, mediaData, mediaMimeType, audioData, audioMimeType, audioName, text, bgColor } = req.body;

    let finalMediaUrl = null, mediaPublicId = null;
    let finalAudioUrl = null, audioPublicId = null;

    if (mediaData && mediaType !== "text") {
      try {
        const r = await smartUpload(mediaData, { mimeType: mediaMimeType, folder: "peace-mindset/stories" });
        finalMediaUrl = r.url; mediaPublicId = r.publicId;
      } catch (e) { finalMediaUrl = mediaData; }
    }

    if (audioData) {
      try {
        const r = await smartUpload(audioData, { mimeType: audioMimeType||"audio/mpeg", folder: "peace-mindset/story-audio" });
        finalAudioUrl = r.url; audioPublicId = r.publicId;
      } catch (e) { finalAudioUrl = audioData; }
    }

    const story = await Story.create({
      author: req.user._id,
      mediaType: mediaType || "text",
      mediaData: finalMediaUrl,
      mediaPublicId,
      mediaMimeType: mediaMimeType || null,
      audioUrl: finalAudioUrl,
      audioPublicId,
      audioName: audioName || null,
      text: text || null,
      bgColor: bgColor || "#6B0F1A",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const populated = await story.populate("author", "name role profilePic");
    req.app.get("io").emit("new_story", { story: populated });
    res.status(201).json({ story: populated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/stories/:id/view
router.put("/:id/view", protect, async (req, res) => {
  try {
    await Story.findByIdAndUpdate(req.params.id, { $addToSet: { views: req.user._id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/stories/:id/like
router.put("/:id/like", protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Not found" });
    const liked = story.likes.map(String).includes(req.user._id.toString());
    if (liked) await Story.findByIdAndUpdate(req.params.id, { $pull: { likes: req.user._id } });
    else await Story.findByIdAndUpdate(req.params.id, { $addToSet: { likes: req.user._id } });
    req.app.get("io").emit("story_liked", { storyId: req.params.id, userId: req.user._id, liked: !liked });
    res.json({ liked: !liked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/stories/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Not found" });
    if (story.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (story.mediaPublicId) deleteFromCloudinary(story.mediaPublicId, story.mediaType==="video"?"video":"image").catch(()=>{});
    if (story.audioPublicId) deleteFromCloudinary(story.audioPublicId, "video").catch(()=>{});
    await Story.findByIdAndDelete(req.params.id);
    req.app.get("io").emit("story_deleted", { storyId: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
