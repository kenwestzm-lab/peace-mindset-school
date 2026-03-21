const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentType: {
      type: String,
      enum: ["school_fee_monthly", "school_fee_term", "test_fee", "event_fee"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "ZMW",
    },
    mobileMoneyProvider: {
      type: String,
      enum: ["Airtel Money", "MTN MoMo"],
      required: true,
    },
    transactionId: {
      type: String,
      required: [true, "Transaction ID / proof is required"],
      trim: true,
    },
    proofUrl: {
      type: String, // Cloudinary URL for screenshot
    },
    proofPublicId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    // For school fees: period covered
    periodStart: {
      type: Date,
    },
    periodEnd: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    // For event fees
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    // Term number (1, 2, or 3)
    term: {
      type: Number,
      min: 1,
      max: 3,
    },
    // Developer platform fee
    platformFee: {
      type: Number,
      default: 0,
    },
    platformFeeStatus: {
      type: String,
      enum: ["pending", "credited"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
