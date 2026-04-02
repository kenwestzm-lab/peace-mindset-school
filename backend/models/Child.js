
const mongoose = require("mongoose");

const childSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Child name is required"], trim: true },
    grade: { type: String, required: true },
    gradeTeacher: { type: String, trim: true },
    teacherPhone: { type: String, trim: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    studentId: { type: String, trim: true },
    dob: { type: Date },
    gender: { type: String, enum: ["male","female","other"], default: "male" },

    // ── Profile picture — stored as Cloudinary URL permanently ──────
    profilePic: { type: String, default: null },
    profilePicPublicId: { type: String, default: null },

    isActive: { type: Boolean, default: true },
    removedReason: { type: String },
    removedAt: { type: Date },
    paymentStatus: {
      type: String,
      enum: ["paid","unpaid","partial","expired"],
      default: "unpaid",
    },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

childSchema.virtual("testFee").get(function () {
  const lower = ["Baby Class","Reception","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5"];
  return lower.includes(this.grade) ? 30 : 40;
});

childSchema.set("toJSON", { virtuals: true });
childSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Child", childSchema);
