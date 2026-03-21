const express = require("express");
const router = express.Router();
const { SchoolCalendar } = require("../models/index");
const { protect, authorize } = require("../middleware/auth");

// GET /api/calendar - Get calendar events (all users)
router.get("/", protect, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = {};
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }
    const events = await SchoolCalendar.find(query).sort({ date: 1 });
    res.json({ events });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/calendar/upcoming - Get next 30 days
router.get("/upcoming", protect, async (req, res) => {
  try {
    const today = new Date();
    const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const events = await SchoolCalendar.find({
      date: { $gte: today, $lte: in30 }
    }).sort({ date: 1 }).limit(20);
    res.json({ events });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/calendar - Admin: add calendar event
router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const { date, status, title, description, color } = req.body;
    if (!date || !title || !status) {
      return res.status(400).json({ error: "Date, title and status are required." });
    }

    // Upsert by date
    const event = await SchoolCalendar.findOneAndUpdate(
      { date: new Date(date) },
      { date: new Date(date), status, title, description, color: color || "#9B1826", createdBy: req.user._id },
      { upsert: true, new: true }
    );

    const io = req.app.get("io");
    io.emit("school_status", {
      status,
      message: `🏫 ${title}`,
      date,
      event,
    });

    res.status(201).json({ event });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/calendar/:id - Admin: remove calendar event
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await SchoolCalendar.findByIdAndDelete(req.params.id);
    res.json({ message: "Calendar event removed." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
