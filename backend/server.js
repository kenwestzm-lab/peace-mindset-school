// ── COMPLETE server.js REPLACEMENT ────────────────────────────────────
// Key fix: socket ONLY handles text & voice (small).
// Photos/videos go via HTTP POST /api/chat which uploads to Cloudinary first.
// This is the CORRECT architecture - socket was never meant for large binary data.

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 5 * 1024 * 1024, // 5MB max via socket (text + voice only)
});
app.set("io", io);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan("dev"));
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "20mb" })); // 20mb for profile pics base64
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 20 });
app.use("/api/", limiter);
app.use("/api/auth/", authLimiter);

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("✅ MongoDB connected");
  require("./utils/seed")();
}).catch(err => { console.error("❌ MongoDB error:", err.message); process.exit(1); });

// ── Routes ────────────────────────────────────────────────────────────
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
app.use("/api/calendar", require("./routes/calendar"));
app.use("/api/stories", require("./routes/stories"));
app.use("/api/groups", require("./routes/groups"));
app.use("/api/push", require("./routes/push"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/media", require("./routes/media"));
app.use("/api/upload", require("./routes/upload"));

app.get("/api/health", (req, res) => res.json({ status: "ok", ts: new Date() }));
app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => res.status(err.status||500).json({ error: err.message||"Server error" }));

// ── Socket.io ─────────────────────────────────────────────────────────
const connectedUsers = new Map();

io.on("connection", (socket) => {

  socket.on("join", (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    io.to("admin_room").emit("user_online", { userId, online: true });
  });

  socket.on("join_admin", () => {
    socket.join("admin_room");
    socket.emit("online_users", { userIds: Array.from(connectedUsers.keys()) });
  });

  socket.on("join_group", (groupId) => socket.join(`group:${groupId}`));

  // ── DIRECT MESSAGE ─────────────────────────────────────────────────
  // NOTE: Photos/videos are sent via HTTP POST /api/chat (Cloudinary upload)
  // Socket only broadcasts the saved message to recipients
  // For text & voice: socket can create the message directly (small size)
  socket.on("send_message", async (data) => {
    try {
      const { Message } = require("./models/index");

      // For media (image/video): the frontend should use HTTP POST instead
      // But if base64 arrives here (e.g. small image), handle it
      let mediaData = data.mediaData || data.mediaUrl || null;
      let mediaPublicId = null;

      if (
        mediaData &&
        mediaData.startsWith("data:") &&
        data.messageType !== "text" &&
        data.messageType !== "voice"
      ) {
        // Upload to Cloudinary
        try {
          const { smartUpload } = require("./utils/cloudinary");
          const folder = data.messageType === "video" ? "peace-mindset/videos" : "peace-mindset/images";
          const uploaded = await smartUpload(mediaData, { mimeType: data.mediaMimeType, folder });
          mediaData = uploaded.url;
          mediaPublicId = uploaded.publicId;
        } catch (e) {
          console.error("Socket Cloudinary upload:", e.message);
          // Keep base64 for very small files as fallback
        }
      }

      const msg = await Message.create({
        sender: data.senderId,
        senderRole: data.senderRole,
        parentId: data.parentId,
        content: data.content,
        messageType: data.messageType || "text",
        mediaData: mediaData,
        mediaPublicId,
        mediaMimeType: data.mediaMimeType || null,
        duration: data.duration || null,
      });

      const populated = await msg.populate("sender", "name email profilePic");
      io.to("admin_room").emit("new_message", populated);
      io.to(`user:${data.parentId}`).emit("new_message", populated);

      // Push notification
      try {
        const { sendPushToUser } = require("./routes/push");
        if (data.senderRole === "admin") {
          await sendPushToUser(data.parentId, {
            title: "Peace Mindset School",
            body: data.messageType !== "text" ? "📎 Media received" : (data.content||"").substring(0, 60),
            icon: "/logo.webp", url: "/parent/chat",
          });
        }
      } catch {}
    } catch (err) {
      console.error("Socket message error:", err);
      socket.emit("message_error", { error: err.message });
    }
  });

  // ── GROUP MESSAGE ──────────────────────────────────────────────────
  socket.on("send_group_message", async (data) => {
    try {
      const { GroupMessage, Group } = require("./models/index");
      const msg = await GroupMessage.create({
        group: data.groupId, sender: data.senderId,
        content: data.content, messageType: data.messageType || "text",
        mediaData: data.mediaUrl || data.mediaData || null,
        mediaMimeType: data.mediaMimeType || null, duration: data.duration || null,
      });
      await Group.findByIdAndUpdate(data.groupId, {
        lastMessage: data.messageType !== "text" ? `📎 ${data.messageType}` : (data.content||"").substring(0,60),
        lastMessageTime: new Date(),
      });
      const populated = await msg.populate("sender", "name role profilePic");
      io.to(`group:${data.groupId}`).emit("new_group_message", populated);
    } catch (err) { console.error("Group msg error:", err); }
  });

  socket.on("typing", ({ parentId, isTyping, senderRole }) => {
    if (senderRole === "admin") io.to(`user:${parentId}`).emit("admin_typing", { isTyping });
    else io.to("admin_room").emit("user_typing", { parentId, isTyping });
  });

  socket.on("disconnect", () => {
    connectedUsers.forEach((sid, uid) => {
      if (sid === socket.id) {
        connectedUsers.delete(uid);
        io.to("admin_room").emit("user_online", { userId: uid, online: false });
      }
    });
  });
});

// ── Cron jobs ─────────────────────────────────────────────────────────
require("node-cron").schedule("* * * * *", async () => {
  try {
    const { Story } = require("./models/index");
    const r = await Story.updateMany({ isActive: true, expiresAt: { $lt: new Date() } }, { isActive: false });
    if (r.modifiedCount > 0) io.emit("stories_expired");
  } catch {}
});

require("node-cron").schedule("0 * * * *", async () => {
  try {
    const Payment = require("./models/Payment");
    const expired = await Payment.updateMany({ status:"approved", isExpired:false, expiresAt:{ $lt:new Date() } }, { isExpired:true });
    if (expired.modifiedCount > 0) console.log(`✅ Expired ${expired.modifiedCount} payments`);
  } catch {}
});

// Load Zambian school term cron jobs
try { require("./utils/cron")(io); } catch(e) { console.error("Cron load error:", e.message); }

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
});

module.exports = { io, connectedUsers };
