const mongoose = require("mongoose");

// ─── Result ──────────────────────────────────────────────────────────────────
const resultSchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  term: { type: Number, required: true, min: 1, max: 3 },
  year: { type: Number, required: true },
  fileUrl: { type: String, required: true },
  filePublicId: { type: String },
  isLocked: { type: Boolean, default: true },
  subjects: [{ name: String, score: Number, grade: String, remarks: String }],
}, { timestamps: true });

// ─── Announcement ─────────────────────────────────────────────────────────────
const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  titleFr: { type: String, trim: true },
  content: { type: String, required: true },
  contentFr: { type: String },
  priority: { type: String, enum: ["normal", "important", "urgent"], default: "normal" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ─── Event ────────────────────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  titleFr: { type: String, trim: true },
  description: { type: String, required: true },
  descriptionFr: { type: String },
  eventDate: { type: Date, required: true },
  paymentRequired: { type: Boolean, default: false },
  paymentAmount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ─── Message ──────────────────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderRole: { type: String, enum: ["parent", "admin"], required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, maxlength: [5000, "Message too long"] },
  messageType: { type: String, enum: ["text", "voice", "image", "video"], default: "text" },
  mediaData: { type: String }, // base64 or Cloudinary URL
    mediaPublicId: { type: String }, // Cloudinary public_id for deletion (up to 60MB via socket)
  mediaMimeType: { type: String },
  duration: { type: Number },
  isRead: { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  deletedForEveryone: { type: Boolean, default: false },
  reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, emoji: String }],
}, { timestamps: true });

// ─── School Calendar ──────────────────────────────────────────────────────────
const schoolCalendarSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  status: { type: String, enum: ["open", "closed", "holiday", "event"], default: "open" },
  title: { type: String, required: true },
  description: { type: String },
  color: { type: String, default: "#9B1826" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// ─── Earnings ─────────────────────────────────────────────────────────────────
const earningsSchema = new mongoose.Schema({
  source: { type: String, enum: ["payment_fee", "manual"], default: "payment_fee" },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  amount: { type: Number, required: true },
  description: { type: String },
  status: { type: String, enum: ["available", "withdrawn"], default: "available" },
  withdrawal: { type: mongoose.Schema.Types.ObjectId, ref: "Withdrawal" },
}, { timestamps: true });

// ─── Withdrawal ───────────────────────────────────────────────────────────────
const withdrawalSchema = new mongoose.Schema({
  developer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  mobileMoneyProvider: { type: String, enum: ["Airtel Money", "MTN MoMo"], required: true },
  phoneNumber: { type: String, required: true },
  status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
  reference: { type: String },
  notes: { type: String },
  processedAt: { type: Date },
  apiResponse: { type: Object },
}, { timestamps: true });

// ─── Fee Settings ─────────────────────────────────────────────────────────────
const feeSettingsSchema = new mongoose.Schema({
  schoolFeeMonthly: { type: Number, default: 150 },
  schoolFeeTermly: { type: Number, default: 450 },
  testFeeLower: { type: Number, default: 30 },
  testFeeUpper: { type: Number, default: 40 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// ─── Story ────────────────────────────────────────────────────────────────────
const storySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mediaType: { type: String, enum: ["text", "image", "video"], default: "text" },
  mediaData: { type: String }, // base64 or Cloudinary URL
    mediaPublicId: { type: String },
  mediaMimeType: { type: String },
  text: { type: String },
  bgColor: { type: String, default: "#6B0F1A" },
  views: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  audioUrl: { type: String },
    audioPublicId: { type: String },
    audioName: { type: String },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24*60*60*1000) },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ─── Group Chat ───────────────────────────────────────────────────────────────
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String, default: "👥" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isActive: { type: Boolean, default: true },
  lastMessage: { type: String },
  lastMessageTime: { type: Date },
}, { timestamps: true });

// ─── Group Message ─────────────────────────────────────────────────────────────
const groupMessageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  messageType: { type: String, enum: ["text", "voice", "image", "video"], default: "text" },
  mediaData: { type: String },
  mediaMimeType: { type: String },
  duration: { type: Number },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  deletedForEveryone: { type: Boolean, default: false },
  reactions: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, emoji: String }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

// ─── Push Subscription ────────────────────────────────────────────────────────
const pushSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subscription: { type: Object, required: true },
  deviceName: { type: String },
}, { timestamps: true });

module.exports = {
  Result: mongoose.model("Result", resultSchema),
  Announcement: mongoose.model("Announcement", announcementSchema),
  Event: mongoose.model("Event", eventSchema),
  Message: mongoose.model("Message", messageSchema),
  SchoolCalendar: mongoose.model("SchoolCalendar", schoolCalendarSchema),
  Earnings: mongoose.model("Earnings", earningsSchema),
  Withdrawal: mongoose.model("Withdrawal", withdrawalSchema),
  FeeSettings: mongoose.model("FeeSettings", feeSettingsSchema),
  Story: mongoose.model("Story", storySchema),
  Group: mongoose.model("Group", groupSchema),
  GroupMessage: mongoose.model("GroupMessage", groupMessageSchema),
  PushSubscription: mongoose.model("PushSubscription", pushSubscriptionSchema),
};
