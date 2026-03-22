const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
      required: true,
    },
    // ── Payment type ──────────────────────────────────────────────────
    paymentType: {
      type: String,
      enum: [
        "school_fee_termly",  // Full term school fee
        "school_fee_monthly", // Monthly school fee
        "school_fee_2terms",  // Two terms at once (discount)
        "test_fee",           // Exam/test results fee
      ],
      required: true,
    },
    // ── Zambian term info ─────────────────────────────────────────────
    termYear: { type: Number },
    termNumber: { type: Number, min: 1, max: 3 }, // 1, 2, or 3
    termNumber2: { type: Number }, // Second term (for 2-term payments)
    month: { type: Number }, // 1-12 for monthly payments
    
    // ── Amount ────────────────────────────────────────────────────────
    amount: { type: Number, required: true },
    currency: { type: String, default: "ZMW" },
    
    // ── Payment proof ─────────────────────────────────────────────────
    proofImageData: { type: String }, // base64 receipt image
    proofImageMime: { type: String },
    mobileMoneyRef: { type: String }, // Mobile money transaction ref
    mobileMoneyProvider: {
      type: String,
      enum: ["Airtel Money", "MTN MoMo", "Zamtel Kwacha", "Bank Transfer", "Cash"],
    },
    phoneNumber: { type: String },
    
    // ── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    
    // ── Expiry ────────────────────────────────────────────────────────
    expiresAt: { type: Date }, // Auto-calculated based on term
    isExpired: { type: Boolean, default: false },
    
    // ── Test fee specific ─────────────────────────────────────────────
    testResultAccessed: { type: Boolean, default: false }, // Once viewed, fee consumed
    testResultAccessedAt: { type: Date },
    
    // ── Developer fee tracking ────────────────────────────────────────
    developerFeeProcessed: { type: Boolean, default: false },
    
    notes: { type: String },
  },
  { timestamps: true }
);

// ── Virtual: is this payment currently valid ──────────────────────────
paymentSchema.virtual("isValid").get(function () {
  if (this.status !== "approved") return false;
  if (this.isExpired) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  if (this.paymentType === "test_fee" && this.testResultAccessed) return false;
  return true;
});

// ── Auto-expire before saving ─────────────────────────────────────────
paymentSchema.pre("save", function (next) {
  if (this.expiresAt && new Date() > this.expiresAt && !this.isExpired) {
    this.isExpired = true;
  }
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);
