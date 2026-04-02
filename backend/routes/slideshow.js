
const express = require("express");
const router = express.Router();
const { Slideshow } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");
const { smartUpload, smartDelete } = require("../utils/cloudinary");

// GET /api/slideshow — all active slides (parents & admin)
router.get("/", protect, async (req, res) => {
  try {
    const slides = await Slideshow.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });
    res.json({ slides });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/slideshow/all — admin sees all (including inactive)
router.get("/all", protect, authorize("admin"), async (req, res) => {
  try {
    const slides = await Slideshow.find().sort({ order: 1, createdAt: -1 });
    res.json({ slides });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/slideshow — admin uploads a new slide
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { imageData, mimeType, title, caption, order } = req.body;
    if (!imageData) return res.status(400).json({ error: "Image required" });

    const uploaded = await smartUpload(imageData, {
      mimeType: mimeType || "image/jpeg",
      folder: "peace-mindset/slideshow",
    });

    const slide = await Slideshow.create({
      imageUrl:  uploaded.url,
      publicId:  uploaded.publicId,
      title:     title || "",
      caption:   caption || "",
      order:     order !== undefined ? +order : 0,
      isActive:  true,
      createdBy: req.user._id,
    });

    // Broadcast to all connected parents in real time
    req.app.get("io").emit("slideshow_updated", { action: "added", slide });
    res.status(201).json({ slide });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/slideshow/:id — update slide (title, caption, order, isActive)
router.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const { title, caption, order, isActive } = req.body;
    const slide = await Slideshow.findByIdAndUpdate(
      req.params.id,
      { title, caption, order: order !== undefined ? +order : undefined, isActive },
      { new: true, runValidators: false }
    );
    if (!slide) return res.status(404).json({ error: "Slide not found" });
    req.app.get("io").emit("slideshow_updated", { action: "updated", slide });
    res.json({ slide });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/slideshow/:id
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const slide = await Slideshow.findById(req.params.id);
    if (!slide) return res.status(404).json({ error: "Not found" });
    if (slide.publicId) await smartDelete(slide.publicId, "image").catch(() => {});
    await Slideshow.findByIdAndDelete(req.params.id);
    req.app.get("io").emit("slideshow_updated", { action: "deleted", slideId: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
