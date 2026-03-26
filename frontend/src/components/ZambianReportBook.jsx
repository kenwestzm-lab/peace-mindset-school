import { useState, useEffect, useCallback } from "react";

// ── Zambian ECZ Subject Lists ────────────────────────────────────────
const SUBJECTS_BY_GRADE = {
  baby_class: [
    "Number Work",
    "English Language",
    "Environmental Science",
    "Creative Activities",
    "Physical Education",
    "Religious Education",
    "Social Studies",
  ],
  reception: [
    "Mathematics",
    "English Language",
    "Environmental Science",
    "Creative Activities",
    "Physical Education",
    "Religious Education",
    "Social Studies",
    "Local Language",
  ],
  "1": [
    "Mathematics",
    "English Language",
    "Local Language",
    "Environmental Science",
    "Social Studies",
    "Religious Education",
    "Creative & Technology Studies",
    "Physical Education",
    "Expressive Arts",
  ],
  "2": [
    "Mathematics",
    "English Language",
    "Local Language",
    "Environmental Science",
    "Social Studies",
    "Religious Education",
    "Creative & Technology Studies",
    "Physical Education",
    "Expressive Arts",
  ],
  "3": [
    "Mathematics",
    "English Language",
    "Local Language",
    "Environmental Science",
    "Social Studies",
    "Religious Education",
    "Creative & Technology Studies",
    "Physical Education",
    "Expressive Arts",
  ],
  "4": [
    "Mathematics",
    "English Language",
    "Local Language",
    "Environmental Science",
    "Social Studies",
    "Religious Education",
    "Creative & Technology Studies",
    "Physical Education",
    "Expressive Arts",
  ],
  "5": [
    "Mathematics",
    "English Language",
    "Zambian Language",
    "Integrated Science",
    "Social Studies",
    "Religious Education",
    "Creative & Technology Studies",
    "Physical Education",
    "Home Economics",
    "Agriculture",
  ],
  "6": [
    "Mathematics",
    "English Language",
    "Zambian Language",
    "Integrated Science",
    "Social Studies",
    "Religious Education",
    "Creative & Technology Studies",
    "Physical Education",
    "Home Economics",
    "Agriculture",
  ],
  "7": [
    "Mathematics",
    "English Language",
    "Zambian Language",
    "Integrated Science",
    "Social Studies",
    "Religious Education",
    "Creative & Technology Studies",
    "Physical Education",
    "Home Economics",
    "Agriculture",
    "Business Studies",
  ],
};

const GRADE_LABELS = {
  baby_class: "Baby Class",
  reception: "Reception",
  "1": "Grade 1",
  "2": "Grade 2",
  "3": "Grade 3",
  "4": "Grade 4",
  "5": "Grade 5",
  "6": "Grade 6",
  "7": "Grade 7",
};

const CONDUCT_OPTIONS = ["Excellent", "Good", "Fair", "Poor"];
const CONDUCT_FIELDS = ["punctuality", "neatness", "respect", "participation", "cooperation"];

// ── Grade Calculator ─────────────────────────────────────────────────
function getLetterGrade(total) {
  if (total >= 80) return { letter: "A", label: "Distinction", color: "#16a34a" };
  if (total >= 65) return { letter: "B", label: "Merit", color: "#2563eb" };
  if (total >= 50) return { letter: "C", label: "Credit", color: "#7c3aed" };
  if (total >= 40) return { letter: "D", label: "Pass", color: "#d97706" };
  if (total >= 30) return { letter: "E", label: "Weak Pass", color: "#ea580c" };
  return { letter: "F", label: "Fail", color: "#dc2626" };
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Source+Sans+3:wght@300;400;600&display=swap');

  .rb-root {
    font-family: 'Source Sans 3', sans-serif;
    background: #0d1117;
    min-height: 100vh;
    color: #e6edf3;
  }
  .rb-header {
    background: linear-gradient(135deg, #1a2744 0%, #0f1923 100%);
    border-bottom: 2px solid #c9a84c;
    padding: 1.5rem 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  .rb-school-crest {
    width: 64px;
    height: 64px;
    background: #c9a84c;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Bitter', serif;
    font-size: 24px;
    font-weight: 700;
    color: #0f1923;
    flex-shrink: 0;
  }
  .rb-school-name {
    font-family: 'Bitter', serif;
    font-size: 22px;
    font-weight: 700;
    color: #c9a84c;
    line-height: 1.2;
  }
  .rb-school-sub {
    font-size: 12px;
    color: #8b949e;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 2px;
  }
  .rb-tabs {
    display: flex;
    gap: 0;
    background: #161b22;
    border-bottom: 1px solid #30363d;
    padding: 0 2rem;
  }
  .rb-tab {
    padding: 1rem 1.5rem;
    font-size: 14px;
    font-weight: 600;
    border: none;
    background: transparent;
    color: #8b949e;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    margin-bottom: -1px;
    transition: all 0.2s;
    letter-spacing: 0.5px;
  }
  .rb-tab:hover { color: #e6edf3; }
  .rb-tab.active { color: #c9a84c; border-bottom-color: #c9a84c; }
  .rb-body { padding: 2rem; max-width: 900px; margin: 0 auto; }
  .rb-card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.25rem;
  }
  .rb-card-title {
    font-family: 'Bitter', serif;
    font-size: 15px;
    font-weight: 600;
    color: #c9a84c;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #21262d;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rb-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #8b949e;
    margin-bottom: 6px;
    font-weight: 600;
  }
  .rb-input {
    width: 100%;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 10px 14px;
    color: #e6edf3;
    font-size: 14px;
    font-family: 'Source Sans 3', sans-serif;
    outline: none;
    transition: border-color 0.2s;
  }
  .rb-input:focus { border-color: #c9a84c; }
  .rb-input option { background: #161b22; }
  .rb-input-sm {
    width: 70px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 8px 10px;
    color: #e6edf3;
    font-size: 14px;
    font-family: 'Source Sans 3', sans-serif;
    outline: none;
    text-align: center;
  }
  .rb-input-sm:focus { border-color: #c9a84c; outline: none; }
  .rb-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .rb-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
  .rb-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0.75rem; }
  .rb-field { margin-bottom: 0; }
  .rb-subject-table { width: 100%; border-collapse: collapse; }
  .rb-subject-table th {
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #8b949e;
    padding: 8px 12px;
    background: #0d1117;
    font-weight: 600;
  }
  .rb-subject-table th:first-child { border-radius: 8px 0 0 8px; }
  .rb-subject-table th:last-child { border-radius: 0 8px 8px 0; }
  .rb-subject-table td { padding: 10px 12px; border-bottom: 1px solid #21262d; vertical-align: middle; }
  .rb-subject-table tr:last-child td { border-bottom: none; }
  .rb-subject-name { font-size: 14px; font-weight: 600; }
  .rb-grade-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .rb-total-display {
    font-size: 18px;
    font-weight: 700;
    font-family: 'Bitter', serif;
  }
  .rb-btn {
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Source Sans 3', sans-serif;
    letter-spacing: 0.5px;
  }
  .rb-btn-gold {
    background: #c9a84c;
    color: #0f1923;
  }
  .rb-btn-gold:hover { background: #d4b56a; transform: translateY(-1px); }
  .rb-btn-outline {
    background: transparent;
    color: #c9a84c;
    border: 1px solid #c9a84c;
  }
  .rb-btn-outline:hover { background: rgba(201,168,76,0.1); }
  .rb-btn-danger {
    background: transparent;
    color: #f85149;
    border: 1px solid #f85149;
  }
  .rb-publish-banner {
    background: linear-gradient(135deg, #1a3a2a, #0f2419);
    border: 1px solid #238636;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }
  .rb-published-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #238636;
    color: #fff;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }
  .rb-dot-green {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #3fb950;
    display: inline-block;
  }
  /* Report Book Print Style */
  .rb-report-view {
    background: #fff;
    color: #1a1a1a;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  .rb-report-header {
    background: #1a2744;
    padding: 1.5rem 2rem;
    text-align: center;
    border-bottom: 4px solid #c9a84c;
  }
  .rb-report-title {
    font-family: 'Bitter', serif;
    font-size: 22px;
    font-weight: 700;
    color: #c9a84c;
    margin-bottom: 4px;
  }
  .rb-report-subtitle {
    font-size: 12px;
    color: #8b9abc;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .rb-report-student-bar {
    background: #f4f6fb;
    border-bottom: 1px solid #dde3f0;
    padding: 1rem 2rem;
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
  }
  .rb-report-field { flex: 1; min-width: 140px; }
  .rb-report-field-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #7a8298; font-weight: 600; }
  .rb-report-field-val { font-size: 15px; font-weight: 600; color: #1a2744; margin-top: 2px; }
  .rb-report-body { padding: 1.5rem 2rem; }
  .rb-report-section-title {
    font-family: 'Bitter', serif;
    font-size: 13px;
    font-weight: 700;
    color: #1a2744;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    border-bottom: 2px solid #1a2744;
    padding-bottom: 6px;
    margin: 1.25rem 0 1rem;
  }
  .rb-report-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .rb-report-table th {
    background: #1a2744;
    color: #c9a84c;
    padding: 8px 12px;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
  .rb-report-table td { padding: 9px 12px; border-bottom: 1px solid #e8ecf4; color: #1a1a1a; }
  .rb-report-table tr:nth-child(even) td { background: #f8f9fd; }
  .rb-conduct-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; margin-top: 0.75rem; }
  .rb-conduct-item { background: #f4f6fb; border-radius: 8px; padding: 0.75rem; }
  .rb-conduct-key { font-size: 11px; color: #7a8298; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
  .rb-conduct-val { font-size: 14px; font-weight: 600; color: #1a2744; margin-top: 2px; }
  .rb-comment-box { background: #f4f6fb; border-left: 4px solid #c9a84c; padding: 0.75rem 1rem; border-radius: 0 8px 8px 0; font-size: 13px; color: #333; line-height: 1.6; margin-bottom: 0.75rem; }
  .rb-comment-who { font-size: 10px; color: #7a8298; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 4px; }
  .rb-report-footer { background: #1a2744; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
  .rb-footer-text { font-size: 11px; color: #8b9abc; }
  .rb-sig-line { border-top: 1px solid #8b9abc; margin-top: 40px; padding-top: 4px; font-size: 10px; color: #8b9abc; text-align: center; min-width: 120px; }
  .rb-empty { text-align: center; padding: 4rem 2rem; color: #8b949e; }
  .rb-empty-icon { font-size: 48px; margin-bottom: 1rem; }
  .rb-empty-text { font-size: 15px; }
  textarea.rb-input { resize: vertical; min-height: 80px; }
  .rb-select-conduct {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 7px 10px;
    color: #e6edf3;
    font-size: 13px;
    font-family: 'Source Sans 3', sans-serif;
    outline: none;
    width: 100%;
  }
  .rb-select-conduct:focus { border-color: #c9a84c; }
  .rb-select-conduct option { background: #161b22; }
  .rb-row { display: flex; gap: 0.75rem; align-items: center; }
  .rb-success-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #238636;
    color: #fff;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 9999;
    animation: slideIn 0.3s ease;
  }
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .rb-loading { text-align: center; padding: 3rem; color: #8b949e; font-size: 14px; }
  .rb-badge-term {
    background: rgba(201,168,76,0.15);
    color: #c9a84c;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }
  .rb-position { display: flex; align-items: baseline; gap: 4px; }
  .rb-position-num { font-size: 28px; font-weight: 700; font-family: 'Bitter', serif; color: #c9a84c; }
  .rb-position-label { font-size: 12px; color: #8b949e; }
`;

// ── Mock data for demo ───────────────────────────────────────────────
const MOCK_STUDENTS = [
  { _id: "s1", name: "Mulenga Mary", grade: "2", parentId: "p1" },
  { _id: "s2", name: "Chanda John", grade: "5", parentId: "p2" },
  { _id: "s3", name: "Mutale Grace", grade: "baby_class", parentId: "p3" },
  { _id: "s4", name: "Bwalya Peter", grade: "7", parentId: "p4" },
  { _id: "s5", name: "Ngosa Faith", grade: "reception", parentId: "p5" },
];

// ── Admin: Enter Results ─────────────────────────────────────────────
function AdminEntryPanel({ socket, token, isAdmin, onPublish }) {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [students] = useState(MOCK_STUDENTS);
  const [term, setTerm] = useState("1");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [subjects, setSubjects] = useState([]);
  const [conduct, setConduct] = useState({});
  const [attendance, setAttendance] = useState({ present: "", absent: "", total: "" });
  const [classComment, setClassComment] = useState("");
  const [headComment, setHeadComment] = useState("");
  const [position, setPosition] = useState("");
  const [totalPupils, setTotalPupils] = useState("");
  const [nextTermDate, setNextTermDate] = useState("");
  const [promoted, setPromoted] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const student = students.find((s) => s._id === selectedStudent);

  useEffect(() => {
    if (!student) return;
    const subjectList = SUBJECTS_BY_GRADE[student.grade] || [];
    setSubjects(
      subjectList.map((name) => ({
        name,
        ca: "",
        exam: "",
        total: 0,
        grade_letter: "",
        teacher_comment: "",
      }))
    );
    setConduct({});
  }, [selectedStudent, student]);

  const updateSubject = (idx, field, value) => {
    setSubjects((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      const ca = parseFloat(field === "ca" ? value : next[idx].ca) || 0;
      const exam = parseFloat(field === "exam" ? value : next[idx].exam) || 0;
      const total = Math.min(100, ca + exam);
      const grade = getLetterGrade(total);
      next[idx].total = total;
      next[idx].grade_letter = ca || exam ? grade.letter : "";
      return next;
    });
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSave = async (publish = false) => {
    if (!student) return alert("Select a student first");
    setSaving(true);
    // In production: POST to /api/report-cards
    // Here we demo the shape:
    const payload = {
      studentId: student._id,
      grade: student.grade,
      term,
      year: parseInt(year),
      subjects: subjects.map((s) => ({
        name: s.name,
        continuous_assessment: parseFloat(s.ca) || 0,
        end_of_term_exam: parseFloat(s.exam) || 0,
        total: s.total,
        grade_letter: s.grade_letter,
        teacher_comment: s.teacher_comment,
      })),
      conduct,
      attendance: {
        days_present: parseInt(attendance.present) || 0,
        days_absent: parseInt(attendance.absent) || 0,
        total_school_days: parseInt(attendance.total) || 0,
      },
      class_teacher_comment: classComment,
      head_teacher_comment: headComment,
      position_in_class: parseInt(position) || null,
      total_pupils: parseInt(totalPupils) || null,
      next_term_opens: nextTermDate || null,
      promoted,
      isPublished: publish,
    };

    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);

    if (publish) {
      // socket.emit or API PATCH /api/report-cards/:id/publish
      showToast(`✅ Report published — parent notified!`);
      onPublish && onPublish(payload);
    } else {
      showToast("💾 Draft saved successfully");
    }
  };

  return (
    <div>
      {toast && <div className="rb-success-toast">{toast}</div>}

      {/* Student & Term Selection */}
      <div className="rb-card">
        <div className="rb-card-title">
          <span>📋</span> Student & Term
        </div>
        <div className="rb-grid-3" style={{ gap: "1rem" }}>
          <div className="rb-field">
            <div className="rb-label">Student</div>
            <select
              className="rb-input"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="">— Select Student —</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({GRADE_LABELS[s.grade]})
                </option>
              ))}
            </select>
          </div>
          <div className="rb-field">
            <div className="rb-label">Term</div>
            <select
              className="rb-input"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          <div className="rb-field">
            <div className="rb-label">Year</div>
            <select
              className="rb-input"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {student && (
          <div
            style={{
              marginTop: "1rem",
              background: "rgba(201,168,76,0.1)",
              border: "1px solid rgba(201,168,76,0.3)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#c9a84c",
                color: "#0f1923",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {student.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#c9a84c" }}>
                {student.name}
              </div>
              <div style={{ fontSize: 12, color: "#8b949e" }}>
                {GRADE_LABELS[student.grade]} · Term {term} · {year}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subjects */}
      {student && subjects.length > 0 && (
        <div className="rb-card">
          <div className="rb-card-title">
            <span>📚</span> Academic Results
            <span style={{ fontSize: 11, color: "#8b949e", fontWeight: 400, marginLeft: "auto" }}>
              CA = out of 40 · Exam = out of 60 · Total = out of 100
            </span>
          </div>
          <table className="rb-subject-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th style={{ width: 80, textAlign: "center" }}>CA (40)</th>
                <th style={{ width: 80, textAlign: "center" }}>Exam (60)</th>
                <th style={{ width: 80, textAlign: "center" }}>Total</th>
                <th style={{ width: 60, textAlign: "center" }}>Grade</th>
                <th>Teacher Comment</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subj, i) => {
                const gradeInfo =
                  subj.total > 0 ? getLetterGrade(subj.total) : null;
                return (
                  <tr key={subj.name}>
                    <td className="rb-subject-name">{subj.name}</td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        className="rb-input-sm"
                        type="number"
                        min="0"
                        max="40"
                        value={subj.ca}
                        onChange={(e) => updateSubject(i, "ca", e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        className="rb-input-sm"
                        type="number"
                        min="0"
                        max="60"
                        value={subj.exam}
                        onChange={(e) => updateSubject(i, "exam", e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        className="rb-total-display"
                        style={{ color: gradeInfo?.color || "#8b949e" }}
                      >
                        {subj.total > 0 ? subj.total : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {gradeInfo && (
                        <span
                          className="rb-grade-pill"
                          style={{
                            background: gradeInfo.color + "22",
                            color: gradeInfo.color,
                          }}
                        >
                          {gradeInfo.letter}
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        className="rb-input"
                        type="text"
                        style={{ padding: "6px 10px", fontSize: 13 }}
                        placeholder="Optional comment"
                        value={subj.teacher_comment}
                        onChange={(e) =>
                          updateSubject(i, "teacher_comment", e.target.value)
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Conduct & Attendance */}
      {student && (
        <div className="rb-grid-2" style={{ gap: "1rem" }}>
          <div className="rb-card">
            <div className="rb-card-title"><span>🌟</span> Conduct</div>
            {CONDUCT_FIELDS.map((field) => (
              <div key={field} style={{ marginBottom: "0.75rem" }}>
                <div className="rb-label" style={{ textTransform: "capitalize" }}>
                  {field}
                </div>
                <select
                  className="rb-select-conduct"
                  value={conduct[field] || ""}
                  onChange={(e) =>
                    setConduct((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                >
                  <option value="">— Select —</option>
                  {CONDUCT_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="rb-card">
            <div className="rb-card-title"><span>📅</span> Attendance & Position</div>
            <div style={{ marginBottom: "0.75rem" }}>
              <div className="rb-label">Days Present</div>
              <input
                className="rb-input"
                type="number"
                value={attendance.present}
                onChange={(e) =>
                  setAttendance((p) => ({ ...p, present: e.target.value }))
                }
                placeholder="e.g. 62"
              />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <div className="rb-label">Days Absent</div>
              <input
                className="rb-input"
                type="number"
                value={attendance.absent}
                onChange={(e) =>
                  setAttendance((p) => ({ ...p, absent: e.target.value }))
                }
                placeholder="e.g. 3"
              />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <div className="rb-label">Total School Days</div>
              <input
                className="rb-input"
                type="number"
                value={attendance.total}
                onChange={(e) =>
                  setAttendance((p) => ({ ...p, total: e.target.value }))
                }
                placeholder="e.g. 65"
              />
            </div>
            <div className="rb-grid-2" style={{ gap: "0.75rem" }}>
              <div>
                <div className="rb-label">Position in Class</div>
                <input
                  className="rb-input"
                  type="number"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>
              <div>
                <div className="rb-label">Total Pupils</div>
                <input
                  className="rb-input"
                  type="number"
                  value={totalPupils}
                  onChange={(e) => setTotalPupils(e.target.value)}
                  placeholder="e.g. 40"
                />
              </div>
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <div className="rb-label">Next Term Opens</div>
              <input
                className="rb-input"
                type="date"
                value={nextTermDate}
                onChange={(e) => setNextTermDate(e.target.value)}
              />
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <div className="rb-label">Promotion Status</div>
              <select
                className="rb-input"
                value={promoted ? "yes" : "no"}
                onChange={(e) => setPromoted(e.target.value === "yes")}
              >
                <option value="yes">Promoted to next grade</option>
                <option value="no">Repeat grade</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      {student && (
        <div className="rb-card">
          <div className="rb-card-title"><span>💬</span> Teacher Comments</div>
          <div className="rb-grid-2" style={{ gap: "1rem" }}>
            <div>
              <div className="rb-label">Class Teacher Comment</div>
              <textarea
                className="rb-input"
                value={classComment}
                onChange={(e) => setClassComment(e.target.value)}
                placeholder="Comment on student's overall performance and behaviour..."
              />
            </div>
            <div>
              <div className="rb-label">Head Teacher Comment</div>
              <textarea
                className="rb-input"
                value={headComment}
                onChange={(e) => setHeadComment(e.target.value)}
                placeholder="Head teacher remarks..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Save / Publish */}
      {student && (
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "flex-end",
            marginTop: "0.5rem",
          }}
        >
          <button
            className="rb-btn rb-btn-outline"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? "Saving..." : "💾 Save Draft"}
          </button>
          <button
            className="rb-btn rb-btn-gold"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? "Publishing..." : "🚀 Publish to Parent"}
          </button>
        </div>
      )}

      {!student && (
        <div className="rb-empty">
          <div className="rb-empty-icon">📋</div>
          <div className="rb-empty-text">Select a student to enter results</div>
        </div>
      )}
    </div>
  );
}

// ── Parent: View Report Book ─────────────────────────────────────────
function ParentReportView({ socket, childId, childName }) {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [newReportAlert, setNewReportAlert] = useState(null);

  // Demo data
  useEffect(() => {
    const demo = [
      {
        _id: "r1",
        term: "1",
        year: 2026,
        grade: "2",
        isPublished: true,
        position_in_class: 3,
        total_pupils: 38,
        promoted: true,
        attendance: { days_present: 62, days_absent: 3, total_school_days: 65 },
        subjects: [
          { name: "Mathematics", continuous_assessment: 36, end_of_term_exam: 54, total: 90, grade_letter: "A", teacher_comment: "Excellent work!" },
          { name: "English Language", continuous_assessment: 30, end_of_term_exam: 45, total: 75, grade_letter: "B", teacher_comment: "Good progress" },
          { name: "Local Language", continuous_assessment: 28, end_of_term_exam: 40, total: 68, grade_letter: "B", teacher_comment: "" },
          { name: "Environmental Science", continuous_assessment: 25, end_of_term_exam: 38, total: 63, grade_letter: "C", teacher_comment: "" },
          { name: "Social Studies", continuous_assessment: 32, end_of_term_exam: 48, total: 80, grade_letter: "A", teacher_comment: "" },
          { name: "Religious Education", continuous_assessment: 34, end_of_term_exam: 52, total: 86, grade_letter: "A", teacher_comment: "Outstanding" },
          { name: "Creative & Technology Studies", continuous_assessment: 27, end_of_term_exam: 42, total: 69, grade_letter: "B", teacher_comment: "" },
          { name: "Physical Education", continuous_assessment: 35, end_of_term_exam: 55, total: 90, grade_letter: "A", teacher_comment: "Very active" },
          { name: "Expressive Arts", continuous_assessment: 29, end_of_term_exam: 44, total: 73, grade_letter: "B", teacher_comment: "" },
        ],
        conduct: {
          punctuality: "Excellent",
          neatness: "Good",
          respect: "Excellent",
          participation: "Good",
          cooperation: "Excellent",
        },
        class_teacher_comment:
          "Mary has shown remarkable dedication this term. She is a pleasure to teach and consistently gives her best effort in all subjects.",
        head_teacher_comment:
          "An outstanding student. Keep up the excellent work!",
        next_term_opens: "2026-05-06",
      },
      {
        _id: "r2",
        term: "3",
        year: 2025,
        grade: "2",
        isPublished: true,
        position_in_class: 5,
        total_pupils: 38,
        promoted: true,
        attendance: { days_present: 60, days_absent: 5, total_school_days: 65 },
        subjects: [
          { name: "Mathematics", continuous_assessment: 33, end_of_term_exam: 50, total: 83, grade_letter: "A", teacher_comment: "" },
          { name: "English Language", continuous_assessment: 28, end_of_term_exam: 42, total: 70, grade_letter: "B", teacher_comment: "" },
        ],
        conduct: { punctuality: "Good", neatness: "Good", respect: "Excellent", participation: "Fair", cooperation: "Good" },
        class_teacher_comment: "Good performance throughout the term.",
        head_teacher_comment: "Well done. Continue working hard.",
        next_term_opens: "2026-01-12",
      },
    ];
    setReports(demo);
    setSelectedReport(demo[0]);
  }, [childId]);

  // Listen for real-time report published event
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      setNewReportAlert(data);
      setTimeout(() => setNewReportAlert(null), 5000);
    };
    socket.on("report_published", handler);
    return () => socket.off("report_published", handler);
  }, [socket]);

  const avgTotal = selectedReport
    ? Math.round(
        selectedReport.subjects.reduce((s, sub) => s + sub.total, 0) /
          selectedReport.subjects.length
      )
    : 0;

  return (
    <div>
      {newReportAlert && (
        <div className="rb-success-toast">
          📬 New report published for {newReportAlert.studentName} — Term{" "}
          {newReportAlert.term}!
        </div>
      )}

      {/* Term selector */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        {reports.map((r) => (
          <button
            key={r._id}
            className={`rb-btn ${selectedReport?._id === r._id ? "rb-btn-gold" : "rb-btn-outline"}`}
            style={{ padding: "8px 18px", fontSize: 13 }}
            onClick={() => setSelectedReport(r)}
          >
            Term {r.term} · {r.year}
          </button>
        ))}
      </div>

      {selectedReport && (
        <div className="rb-report-view">
          {/* Report Header */}
          <div className="rb-report-header">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: "#c9a84c",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Bitter', serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "#0f1923",
                  flexShrink: 0,
                }}
              >
                P
              </div>
              <div style={{ textAlign: "left" }}>
                <div className="rb-report-title">Peace Mindset School</div>
                <div className="rb-report-subtitle">
                  Academic Progress Report · Term {selectedReport.term},{" "}
                  {selectedReport.year}
                </div>
              </div>
            </div>
          </div>

          {/* Student Info Bar */}
          <div className="rb-report-student-bar">
            <div className="rb-report-field">
              <div className="rb-report-field-label">Pupil Name</div>
              <div className="rb-report-field-val">
                {childName || "Mulenga Mary"}
              </div>
            </div>
            <div className="rb-report-field">
              <div className="rb-report-field-label">Grade</div>
              <div className="rb-report-field-val">
                {GRADE_LABELS[selectedReport.grade]}
              </div>
            </div>
            <div className="rb-report-field">
              <div className="rb-report-field-label">Term</div>
              <div className="rb-report-field-val">
                Term {selectedReport.term}, {selectedReport.year}
              </div>
            </div>
            <div className="rb-report-field">
              <div className="rb-report-field-label">Class Average</div>
              <div
                className="rb-report-field-val"
                style={{ color: getLetterGrade(avgTotal).color }}
              >
                {avgTotal}% ({getLetterGrade(avgTotal).letter})
              </div>
            </div>
            <div className="rb-report-field">
              <div className="rb-report-field-label">Position</div>
              <div className="rb-report-field-val" style={{ color: "#c9a84c" }}>
                {selectedReport.position_in_class} of{" "}
                {selectedReport.total_pupils}
              </div>
            </div>
            <div className="rb-report-field">
              <div className="rb-report-field-label">Status</div>
              <div
                className="rb-report-field-val"
                style={{ color: selectedReport.promoted ? "#16a34a" : "#dc2626" }}
              >
                {selectedReport.promoted ? "✓ Promoted" : "✗ Repeat"}
              </div>
            </div>
          </div>

          <div className="rb-report-body">
            {/* Academic Results */}
            <div className="rb-report-section-title">Academic Results</div>
            <table className="rb-report-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th style={{ textAlign: "center" }}>CA (40)</th>
                  <th style={{ textAlign: "center" }}>Exam (60)</th>
                  <th style={{ textAlign: "center" }}>Total (100)</th>
                  <th style={{ textAlign: "center" }}>Grade</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {selectedReport.subjects.map((subj) => {
                  const g = getLetterGrade(subj.total);
                  return (
                    <tr key={subj.name}>
                      <td style={{ fontWeight: 600, color: "#1a1a1a" }}>
                        {subj.name}
                      </td>
                      <td style={{ textAlign: "center", color: "#444" }}>
                        {subj.continuous_assessment}
                      </td>
                      <td style={{ textAlign: "center", color: "#444" }}>
                        {subj.end_of_term_exam}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: 15,
                          color: g.color,
                        }}
                      >
                        {subj.total}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            background: g.color + "22",
                            color: g.color,
                            padding: "2px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {g.letter} — {g.label}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "#555" }}>
                        {subj.teacher_comment || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Grading Key */}
            <div
              style={{
                background: "#f4f6fb",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                marginTop: "0.75rem",
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                fontSize: 12,
                color: "#555",
              }}
            >
              <strong style={{ color: "#1a2744" }}>Key:</strong>
              {[
                { l: "A", t: "80–100%", c: "#16a34a" },
                { l: "B", t: "65–79%", c: "#2563eb" },
                { l: "C", t: "50–64%", c: "#7c3aed" },
                { l: "D", t: "40–49%", c: "#d97706" },
                { l: "E", t: "30–39%", c: "#ea580c" },
                { l: "F", t: "0–29%", c: "#dc2626" },
              ].map((g) => (
                <span key={g.l}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: g.c,
                      marginRight: 2,
                    }}
                  >
                    {g.l}
                  </span>{" "}
                  {g.t}
                </span>
              ))}
            </div>

            {/* Attendance */}
            <div className="rb-report-section-title">Attendance</div>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              {[
                {
                  label: "Days Present",
                  val: selectedReport.attendance.days_present,
                  color: "#16a34a",
                },
                {
                  label: "Days Absent",
                  val: selectedReport.attendance.days_absent,
                  color: "#dc2626",
                },
                {
                  label: "Total School Days",
                  val: selectedReport.attendance.total_school_days,
                  color: "#1a2744",
                },
                {
                  label: "Attendance %",
                  val:
                    Math.round(
                      (selectedReport.attendance.days_present /
                        selectedReport.attendance.total_school_days) *
                        100
                    ) + "%",
                  color: "#7c3aed",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: "#f4f6fb",
                    borderRadius: 8,
                    padding: "0.75rem 1.25rem",
                    minWidth: 120,
                    flex: 1,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#7a8298", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      fontFamily: "'Bitter', serif",
                      color: item.color,
                      marginTop: 4,
                    }}
                  >
                    {item.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Conduct */}
            <div className="rb-report-section-title">Conduct</div>
            <div className="rb-conduct-grid">
              {Object.entries(selectedReport.conduct).map(([key, val]) => (
                <div key={key} className="rb-conduct-item">
                  <div
                    className="rb-conduct-key"
                    style={{ textTransform: "capitalize" }}
                  >
                    {key}
                  </div>
                  <div
                    className="rb-conduct-val"
                    style={{
                      color:
                        val === "Excellent"
                          ? "#16a34a"
                          : val === "Good"
                          ? "#2563eb"
                          : val === "Fair"
                          ? "#d97706"
                          : "#dc2626",
                    }}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </div>

            {/* Comments */}
            <div className="rb-report-section-title">Comments</div>
            <div>
              <div className="rb-comment-who">Class Teacher</div>
              <div className="rb-comment-box">
                {selectedReport.class_teacher_comment}
              </div>
            </div>
            <div>
              <div className="rb-comment-who">Head Teacher</div>
              <div className="rb-comment-box">
                {selectedReport.head_teacher_comment}
              </div>
            </div>

            {/* Next Term */}
            {selectedReport.next_term_opens && (
              <div
                style={{
                  background: "rgba(201,168,76,0.1)",
                  border: "1px solid rgba(201,168,76,0.3)",
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                  marginTop: "1rem",
                  fontSize: 13,
                  color: "#7a5c1e",
                }}
              >
                <strong>Next term opens:</strong>{" "}
                {new Date(selectedReport.next_term_opens).toLocaleDateString(
                  "en-ZM",
                  { weekday: "long", year: "numeric", month: "long", day: "numeric" }
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="rb-report-footer">
            <div className="rb-footer-text">
              Peace Mindset School · Lusaka, Zambia
            </div>
            <div style={{ display: "flex", gap: "2rem" }}>
              <div className="rb-sig-line">Class Teacher</div>
              <div className="rb-sig-line">Head Teacher</div>
              <div className="rb-sig-line">Parent / Guardian</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export default function ZambianReportBook({
  socket,
  token,
  isAdmin = false,
  childId,
  childName,
}) {
  const [activeTab, setActiveTab] = useState(isAdmin ? "admin" : "view");

  return (
    <div className="rb-root">
      <style>{styles}</style>

      <div className="rb-header">
        <div className="rb-school-crest">P</div>
        <div>
          <div className="rb-school-name">Peace Mindset School</div>
          <div className="rb-school-sub">Academic Report Book — Zambian ECZ Standard</div>
        </div>
      </div>

      <div className="rb-tabs">
        {isAdmin && (
          <button
            className={`rb-tab ${activeTab === "admin" ? "active" : ""}`}
            onClick={() => setActiveTab("admin")}
          >
            📝 Enter Results
          </button>
        )}
        <button
          className={`rb-tab ${activeTab === "view" ? "active" : ""}`}
          onClick={() => setActiveTab("view")}
        >
          📖 View Report Book
        </button>
      </div>

      <div className="rb-body">
        {activeTab === "admin" && isAdmin && (
          <AdminEntryPanel socket={socket} token={token} isAdmin={isAdmin} />
        )}
        {activeTab === "view" && (
          <ParentReportView
            socket={socket}
            childId={childId}
            childName={childName}
          />
        )}
      </div>
    </div>
  );
}
