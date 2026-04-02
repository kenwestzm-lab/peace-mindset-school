const express = require("express");
const announcementRouter = express.Router();
const eventRouter = express.Router();
const { Announcement, Event } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");

// ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────────

announcementRouter.get("/", protect, async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

announcementRouter.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { title, titleFr, content, contentFr, priority } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required." });
    }

    const announcement = await Announcement.create({
      title,
      titleFr,
      content,
      contentFr,
      priority: priority || "normal",
      createdBy: req.user._id,
    });

    const populated = await announcement.populate("createdBy", "name");

    const io = req.app.get("io");
    io.emit("new_announcement", { announcement: populated });

    res.status(201).json({ announcement: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

announcementRouter.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Announcement removed." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EVENTS ───────────────────────────────────────────────────────────────────

eventRouter.get("/", protect, async (req, res) => {
  try {
    const events = await Event.find({ isActive: true })
      .populate("createdBy", "name")
      .sort({ eventDate: 1 });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

eventRouter.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { title, titleFr, description, descriptionFr, eventDate, paymentRequired, paymentAmount } = req.body;
    if (!title || !description || !eventDate) {
      return res.status(400).json({ error: "Title, description, and date are required." });
    }

    const event = await Event.create({
      title,
      titleFr,
      description,
      descriptionFr,
      eventDate: new Date(eventDate),
      paymentRequired: !!paymentRequired,
      paymentAmount: paymentRequired ? Number(paymentAmount) : 0,
      createdBy: req.user._id,
    });

    const populated = await event.populate("createdBy", "name");

    const io = req.app.get("io");
    io.emit("new_event", { event: populated });

    res.status(201).json({ event: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

eventRouter.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!event) return res.status(404).json({ error: "Event not found." });

    const io = req.app.get("io");
    io.emit("event_updated", { event });

    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

eventRouter.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Event removed." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { announcementRouter, eventRouter };
