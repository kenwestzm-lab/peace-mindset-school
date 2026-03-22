const mongoose = require("mongoose");

const childSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Child name is required"],
      trim: true,
    },
    grade: {
      type: String,
      required: [true, "Grade is required"],
      enum: [
        "Baby Class",
        "Reception",
        "Grade 1",
        "Grade 2",
        "Grade 3",
        "Grade 4",
        "Grade 5",
        "Grade 6",
        "Grade 7",
        "Grade 8",
        "Grade 9",
        "Grade 10",
        "Grade 11",
        "Grade 12",
      ],
    },
    gradeTeacher: {
      type: String,
      required: [true, "Grade teacher is required"],
      trim: true,
    },
    gradeTeacherPhone: {
      type: String,
      required: [true, "Teacher phone is required"],
      trim: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gradeTeacher: { type: String },
  teacherPhone: { type: String },
  isActive: {
      type: Boolean,
      default: true,
    },
    removedReason: {
      type: String,
    },
    removedAt: {
      type: Date,
    },
    // Computed: based on latest approved payment
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid", "partial", "expired"],
      default: "unpaid",
    },
    balance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Virtual: test fee based on grade
childSchema.virtual("testFee").get(function () {
  const lowerGrades = ["Baby Class", "Reception", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"];
  return lowerGrades.includes(this.grade) ? 30 : 40;
});

childSchema.set("toJSON", { virtuals: true });
childSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Child", childSchema);
