const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  continuous_assessment: { type: Number, default: 0, min: 0, max: 40 },
  end_of_term_exam: { type: Number, default: 0, min: 0, max: 60 },
  total: { type: Number, default: 0, min: 0, max: 100 },
  grade_letter: { type: String, default: "" },
  teacher_comment: { type: String, default: "" },
});

const reportCardSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true },
    grade: { type: String, required: true },
    term: { type: String, enum: ["1", "2", "3"], required: true },
    year: { type: Number, required: true },
    subjects: [subjectSchema],
    conduct: {
      punctuality: { type: String, enum: ["Excellent", "Good", "Fair", "Poor", ""] },
      neatness: { type: String, enum: ["Excellent", "Good", "Fair", "Poor", ""] },
      respect: { type: String, enum: ["Excellent", "Good", "Fair", "Poor", ""] },
      participation: { type: String, enum: ["Excellent", "Good", "Fair", "Poor", ""] },
      cooperation: { type: String, enum: ["Excellent", "Good", "Fair", "Poor", ""] },
    },
    attendance: {
      days_present: { type: Number, default: 0 },
      days_absent: { type: Number, default: 0 },
      total_school_days: { type: Number, default: 0 },
    },
    class_teacher_comment: { type: String, default: "" },
    head_teacher_comment: { type: String, default: "" },
    position_in_class: { type: Number, default: null },
    total_pupils: { type: Number, default: null },
    next_term_opens: { type: Date, default: null },
    promoted: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// One report card per child per term per year
reportCardSchema.index({ child: 1, term: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("ReportCard", reportCardSchema);
