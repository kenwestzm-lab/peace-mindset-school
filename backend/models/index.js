const mongoose = require("mongoose");

// ─── Result ──────────────────────────────────────────────────────────────────
const resultSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    term: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
    },
    year: {
      type: Number,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    filePublicId: {
      type: String,
    },
    isLocked: {
      type: Boolean,
      default: true, // Locked until fees paid
    },
    subjects: [
      {
        name: String,
        score: Number,
        grade: String,
        remarks: String,
      },
    ],
  },
  { timestamps: true }
);

// ─── Announcement ─────────────────────────────────────────────────────────────
const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    titleFr: { type: String, trim: true },
    content: { type: String, required: true },
    contentFr: { type: String },
    priority: {
      type: String,
      enum: ["normal", "important", "urgent"],
      default: "normal",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Event ────────────────────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    titleFr: { type: String, trim: true },
    description: { type: String, required: true },
    descriptionFr: { type: String },
    eventDate: { type: Date, required: true },
    paymentRequired: { type: Boolean, default: false },
    paymentAmount: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── Message ──────────────────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["parent", "admin"],
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // The parent involved in the conversation (for grouping chats)
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, "Message too long"],
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Earnings (Developer) ─────────────────────────────────────────────────────
const earningsSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["payment_fee", "manual"],
      default: "payment_fee",
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    amount: { type: Number, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["available", "withdrawn"],
      default: "available",
    },
    withdrawal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Withdrawal",
    },
  },
  { timestamps: true }
);

// ─── Withdrawal ───────────────────────────────────────────────────────────────
const withdrawalSchema = new mongoose.Schema(
  {
    developer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    mobileMoneyProvider: {
      type: String,
      enum: ["Airtel Money", "MTN MoMo"],
      required: true,
    },
    phoneNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    reference: { type: String }, // External payout reference
    notes: { type: String },
    processedAt: { type: Date },
    // Payout API response (when integrated)
    apiResponse: { type: Object },
  },
  { timestamps: true }
);

// ─── Fee Settings ─────────────────────────────────────────────────────────────
const feeSettingsSchema = new mongoose.Schema(
  {
    schoolFeeMonthly: { type: Number, default: 150 },
    schoolFeeTermly: { type: Number, default: 450 },
    testFeeLower: { type: Number, default: 30 }, // Baby Class - Grade 5
    testFeeUpper: { type: Number, default: 40 }, // Grade 6+
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = {
  Result: mongoose.model("Result", resultSchema),
  Announcement: mongoose.model("Announcement", announcementSchema),
  Event: mongoose.model("Event", eventSchema),
  Message: mongoose.model("Message", messageSchema),
  Earnings: mongoose.model("Earnings", earningsSchema),
  Withdrawal: mongoose.model("Withdrawal", withdrawalSchema),
  FeeSettings: mongoose.model("FeeSettings", feeSettingsSchema),
};
