require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");

const app = express();
const server = http.createServer(app);

// ─── Socket.io Setup ────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible to routes
app.set("io", io);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many login attempts, please try again later." },
});
app.use("/api/auth/", authLimiter);

// ─── Database Connection ─────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    // Seed admin & developer accounts on startup
    require("./utils/seed")();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/children", require("./routes/children"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/results", require("./routes/results"));
const { announcementRouter, eventRouter } = require("./routes/announcements");
app.use("/api/announcements", announcementRouter);
app.use("/api/events", eventRouter);
app.use("/api/chat", require("./routes/chat"));
app.use("/api/developer", require("./routes/developer"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/pesapal", require("./routes/pesapal"));
app.use("/api/disbursement", require("./routes/disbursement"));;

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// ─── Socket.io Real-Time Logic ───────────────────────────────────────────────
const connectedUsers = new Map(); // userId -> socketId

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("join", (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined room user:${userId}`);
  });

  socket.on("join_admin", () => {
    socket.join("admin_room");
  });

  socket.on("send_message", async (data) => {
    try {
      const Message = require("./models/Message");
      const msg = await Message.create({
        sender: data.senderId,
        senderRole: data.senderRole,
        parentId: data.parentId,
        content: data.content,
      });

      const populated = await msg.populate("sender", "name email");

      // Send to admin room
      io.to("admin_room").emit("new_message", populated);
      // Send to the parent
      io.to(`user:${data.parentId}`).emit("new_message", populated);
    } catch (err) {
      console.error("Socket message error:", err);
    }
  });

  socket.on("disconnect", () => {
    connectedUsers.forEach((sid, uid) => {
      if (sid === socket.id) connectedUsers.delete(uid);
    });
    console.log("🔌 Socket disconnected:", socket.id);
  });
});

// ─── Cron Jobs ────────────────────────────────────────────────────────────────
// Run daily at midnight: check expired payments and lock access
cron.schedule("0 0 * * *", async () => {
  try {
    const Payment = require("./models/Payment");
    const now = new Date();
    const expiredPayments = await Payment.find({
      status: "approved",
      expiresAt: { $lt: now },
      isExpired: false,
    });

    for (const p of expiredPayments) {
      p.isExpired = true;
      await p.save();
      // Notify parent
      io.to(`user:${p.parent.toString()}`).emit("payment_expired", {
        childId: p.child,
        message: "Your payment has expired. Please renew to maintain access.",
      });
    }
    console.log(`✅ Cron: processed ${expiredPayments.length} expired payments`);
  } catch (err) {
    console.error("Cron error:", err);
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
});

module.exports = { io, connectedUsers };
