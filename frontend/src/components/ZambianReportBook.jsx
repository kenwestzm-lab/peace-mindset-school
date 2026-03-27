import { useState, useEffect } from "react";
import api from "../utils/api";

// ── Zambian ECZ Subject Lists ────────────────────────────────────────
const SUBJECTS_BY_GRADE = {
  baby_class: ["Number Work","English Language","Environmental Science","Creative Activities","Physical Education","Religious Education","Social Studies"],
  reception: ["Mathematics","English Language","Environmental Science","Creative Activities","Physical Education","Religious Education","Social Studies","Local Language"],
  "1": ["Mathematics","English Language","Local Language","Environmental Science","Social Studies","Religious Education","Creative & Technology Studies","Physical Education","Expressive Arts"],
  "2": ["Mathematics","English Language","Local Language","Environmental Science","Social Studies","Religious Education","Creative & Technology Studies","Physical Education","Expressive Arts"],
  "3": ["Mathematics","English Language","Local Language","Environmental Science","Social Studies","Religious Education","Creative & Technology Studies","Physical Education","Expressive Arts"],
  "4": ["Mathematics","English Language","Local Language","Environmental Science","Social Studies","Religious Education","Creative & Technology Studies","Physical Education","Expressive Arts"],
  "5": ["Mathematics","English Language","Zambian Language","Integrated Science","Social Studies","Religious Education","Creative & Technology Studies","Physical Education","Home Economics","Agriculture"],
  "6": ["Mathematics","English Language","Zambian Language","Integrated Science","Social Studies","Religious Education","Creative & Technology Studies","Physical Education","Home Economics","Agriculture"],
  "7": ["Mathematics","English Language","Zambian Language","Integrated Science","Social Studies","Religious Education","Creative & Technology Studies","Physical Education","Home Economics","Agriculture","Business Studies"],
};

const GRADE_LABELS = {
  baby_class:"Baby Class", reception:"Reception",
  "1":"Grade 1","2":"Grade 2","3":"Grade 3","4":"Grade 4",
  "5":"Grade 5","6":"Grade 6","7":"Grade 7",
};

const CONDUCT_OPTIONS = ["Excellent","Good","Fair","Poor"];
const CONDUCT_FIELDS = ["punctuality","neatness","respect","participation","cooperation"];

function getLetterGrade(total) {
  if (total >= 80) return { letter:"A", label:"Distinction", color:"#16a34a" };
  if (total >= 65) return { letter:"B", label:"Merit",       color:"#2563eb" };
  if (total >= 50) return { letter:"C", label:"Credit",      color:"#7c3aed" };
  if (total >= 40) return { letter:"D", label:"Pass",        color:"#d97706" };
  if (total >= 30) return { letter:"E", label:"Weak Pass",   color:"#ea580c" };
  return              { letter:"F", label:"Fail",        color:"#dc2626" };
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Source+Sans+3:wght@300;400;600&display=swap');
  .rb-root { font-family:'Source Sans 3',sans-serif; background:#0d1117; min-height:100vh; color:#e6edf3; }
  .rb-header { background:linear-gradient(135deg,#1a2744 0%,#0f1923 100%); border-bottom:2px solid #c9a84c; padding:1.5rem 2rem; display:flex; align-items:center; gap:1.5rem; }
  .rb-school-crest { width:64px; height:64px; background:#c9a84c; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Bitter',serif; font-size:24px; font-weight:700; color:#0f1923; flex-shrink:0; }
  .rb-school-name { font-family:'Bitter',serif; font-size:22px; font-weight:700; color:#c9a84c; line-height:1.2; }
  .rb-school-sub { font-size:12px; color:#8b949e; letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
  .rb-tabs { display:flex; background:#161b22; border-bottom:1px solid #30363d; padding:0 2rem; }
  .rb-tab { padding:1rem 1.5rem; font-size:14px; font-weight:600; border:none; background:transparent; color:#8b949e; cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-1px; transition:all 0.2s; }
  .rb-tab:hover { color:#e6edf3; }
  .rb-tab.active { color:#c9a84c; border-bottom-color:#c9a84c; }
  .rb-body { padding:2rem; max-width:900px; margin:0 auto; }
  .rb-card { background:#161b22; border:1px solid #30363d; border-radius:12px; padding:1.5rem; margin-bottom:1.25rem; }
  .rb-card-title { font-family:'Bitter',serif; font-size:15px; font-weight:600; color:#c9a84c; margin-bottom:1.25rem; padding-bottom:0.75rem; border-bottom:1px solid #21262d; display:flex; align-items:center; gap:8px; }
  .rb-label { font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#8b949e; margin-bottom:6px; font-weight:600; }
  .rb-input { width:100%; background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:10px 14px; color:#e6edf3; font-size:14px; font-family:'Source Sans 3',sans-serif; outline:none; transition:border-color 0.2s; box-sizing:border-box; }
  .rb-input:focus { border-color:#c9a84c; }
  .rb-input option { background:#161b22; }
  .rb-input-sm { width:70px; background:#0d1117; border:1px solid #30363d; border-radius:6px; padding:8px 10px; color:#e6edf3; font-size:14px; font-family:'Source Sans 3',sans-serif; outline:none; text-align:center; }
  .rb-input-sm:focus { border-color:#c9a84c; }
  .rb-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
  .rb-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem; }
  .rb-subject-table { width:100%; border-collapse:collapse; }
  .rb-subject-table th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#8b949e; padding:8px 12px; background:#0d1117; font-weight:600; }
  .rb-subject-table td { padding:10px 12px; border-bottom:1px solid #21262d; vertical-align:middle; }
  .rb-subject-table tr:last-child td { border-bottom:none; }
  .rb-grade-pill { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; }
  .rb-total-display { font-size:18px; font-weight:700; font-family:'Bitter',serif; }
  .rb-btn { padding:12px 24px; border-radius:8px; border:none; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:'Source Sans 3',sans-serif; }
  .rb-btn-gold { background:#c9a84c; color:#0f1923; }
  .rb-btn-gold:hover { background:#d4b56a; transform:translateY(-1px); }
  .rb-btn-outline { background:transparent; color:#c9a84c; border:1px solid #c9a84c; }
  .rb-btn-outline:hover { background:rgba(201,168,76,0.1); }
  .rb-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
  .rb-success-toast { position:fixed; top:20px; right:20px; background:#238636; color:#fff; padding:12px 20px; border-radius:8px; font-size:14px; font-weight:600; z-index:9999; animation:slideIn 0.3s ease; }
  .rb-error-toast { position:fixed; top:20px; right:20px; background:#da3633; color:#fff; padding:12px 20px; border-radius:8px; font-size:14px; font-weight:600; z-index:9999; }
  @keyframes slideIn { from { transform:translateX(100%); opacity:0; } to { transform:translateX(0); opacity:1; } }
  .rb-empty { text-align:center; padding:4rem 2rem; color:#8b949e; }
  .rb-empty-icon { font-size:48px; margin-bottom:1rem; }
  .rb-loading { text-align:center; padding:3rem; color:#8b949e; font-size:14px; }
  textarea.rb-input { resize:vertical; min-height:80px; }
  .rb-select-conduct { background:#0d1117; border:1px solid #30363d; border-radius:6px; padding:7px 10px; color:#e6edf3; font-size:13px; outline:none; width:100%; }
  .rb-select-conduct:focus { border-color:#c9a84c; }
  .rb-select-conduct option { background:#161b22; }
  .rb-report-view { background:#fff; color:#1a1a1a; border-radius:12px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.4); }
  .rb-report-header { background:#1a2744; padding:1.5rem 2rem; text-align:center; border-bottom:4px solid #c9a84c; }
  .rb-report-title { font-family:'Bitter',serif; font-size:22px; font-weight:700; color:#c9a84c; margin-bottom:4px; }
  .rb-report-subtitle { font-size:12px; color:#8b9abc; letter-spacing:2px; text-transform:uppercase; }
  .rb-report-student-bar { background:#f4f6fb; border-bottom:1px solid #dde3f0; padding:1rem 2rem; display:flex; gap:2rem; flex-wrap:wrap; }
  .rb-report-field { flex:1; min-width:140px; }
  .rb-report-field-label { font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#7a8298; font-weight:600; }
  .rb-report-field-val { font-size:15px; font-weight:600; color:#1a2744; margin-top:2px; }
  .rb-report-body { padding:1.5rem 2rem; }
  .rb-report-section-title { font-family:'Bitter',serif; font-size:13px; font-weight:700; color:#1a2744; text-transform:uppercase; letter-spacing:1.5px; border-bottom:2px solid #1a2744; padding-bottom:6px; margin:1.25rem 0 1rem; }
  .rb-report-table { width:100%; border-collapse:collapse; font-size:13px; }
  .rb-report-table th { background:#1a2744; color:#c9a84c; padding:8px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.8px; }
  .rb-report-table td { padding:9px 12px; border-bottom:1px solid #e8ecf4; color:#1a1a1a; }
  .rb-report-table tr:nth-child(even) td { background:#f8f9fd; }
  .rb-conduct-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:0.75rem; margin-top:0.75rem; }
  .rb-conduct-item { background:#f4f6fb; border-radius:8px; padding:0.75rem; }
  .rb-conduct-key { font-size:11px; color:#7a8298; text-transform:uppercase; letter-spacing:0.8px; font-weight:600; }
  .rb-conduct-val { font-size:14px; font-weight:600; color:#1a2744; margin-top:2px; }
  .rb-comment-box { background:#f4f6fb; border-left:4px solid #c9a84c; padding:0.75rem 1rem; border-radius:0 8px 8px 0; font-size:13px; color:#333; line-height:1.6; margin-bottom:0.75rem; }
  .rb-comment-who { font-size:10px; color:#7a8298; text-transform:uppercase; letter-spacing:1px; font-weight:600; margin-bottom:4px; }
  .rb-report-footer { background:#1a2744; padding:1rem 2rem; display:flex; justify-content:space-between; align-items:center; }
  .rb-footer-text { font-size:11px; color:#8b9abc; }
  .rb-sig-line { border-top:1px solid #8b9abc; margin-top:40px; padding-top:4px; font-size:10px; color:#8b9abc; text-align:center; min-width:120px; }
`;

// ── Admin: Enter Results Panel ────────────────────────────────────────
function AdminEntryPanel({ socket }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [term, setTerm] = useState("1");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [subjects, setSubjects] = useState([]);
  const [conduct, setConduct] = useState({});
  const [attendance, setAttendance] = useState({ present:"", absent:"", total:"" });
  const [classComment, setClassComment] = useState("");
  const [headComment, setHeadComment] = useState("");
  const [position, setPosition] = useState("");
  const [totalPupils, setTotalPupils] = useState("");
  const [nextTermDate, setNextTermDate] = useState("");
  const [promoted, setPromoted] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [toast, setToast] = useState({ msg:"", type:"" });
  const [existingCard, setExistingCard] = useState(null);

  // Load real students from API
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.get("/children/admin/all");
        setStudents(res.data.children || []);
      } catch (err) {
        showToast("Failed to load students: " + (err.response?.data?.error || err.message), "error");
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, []);

  const student = students.find((s) => s._id === selectedStudent);

  // When student/term/year changes, load existing card if any
  useEffect(() => {
    if (!student) return;
    const subjectList = SUBJECTS_BY_GRADE[student.grade] || SUBJECTS_BY_GRADE["1"] || [];
    setSubjects(subjectList.map((name) => ({ name, ca:"", exam:"", total:0, grade_letter:"", teacher_comment:"" })));
    setConduct({});
    setAttendance({ present:"", absent:"", total:"" });
    setClassComment(""); setHeadComment(""); setPosition(""); setTotalPupils(""); setNextTermDate(""); setPromoted(true);
    setExistingCard(null);

    const loadExisting = async () => {
      try {
        const res = await api.get(`/report-cards/child/${student._id}`);
        const cards = res.data.reportCards || [];
        const existing = cards.find(c => String(c.term) === String(term) && Number(c.year) === Number(year));
        if (existing) {
          setExistingCard(existing);
          // Populate form with existing data
          const subList = SUBJECTS_BY_GRADE[student.grade] || SUBJECTS_BY_GRADE["1"] || [];
          setSubjects(subList.map((name) => {
            const found = existing.subjects?.find(s => s.name === name);
            return found
              ? { name, ca: found.continuous_assessment, exam: found.end_of_term_exam, total: found.total, grade_letter: found.grade_letter, teacher_comment: found.teacher_comment || "" }
              : { name, ca:"", exam:"", total:0, grade_letter:"", teacher_comment:"" };
          }));
          setConduct(existing.conduct || {});
          setAttendance({ present: existing.attendance?.days_present || "", absent: existing.attendance?.days_absent || "", total: existing.attendance?.total_school_days || "" });
          setClassComment(existing.class_teacher_comment || "");
          setHeadComment(existing.head_teacher_comment || "");
          setPosition(existing.position_in_class || "");
          setTotalPupils(existing.total_pupils || "");
          setNextTermDate(existing.next_term_opens ? existing.next_term_opens.split("T")[0] : "");
          setPromoted(existing.promoted !== undefined ? existing.promoted : true);
        }
      } catch {}
    };
    loadExisting();
  }, [selectedStudent, student, term, year]);

  const updateSubject = (idx, field, value) => {
    setSubjects((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      const ca = parseFloat(field === "ca" ? value : next[idx].ca) || 0;
      const exam = parseFloat(field === "exam" ? value : next[idx].exam) || 0;
      const total = Math.min(100, ca + exam);
      const grade = getLetterGrade(total);
      next[idx].total = total;
      next[idx].grade_letter = (ca || exam) ? grade.letter : "";
      return next;
    });
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:"", type:"" }), 3500);
  };

  const handleSave = async (publish = false) => {
    if (!student) return showToast("Select a student first", "error");
    setSaving(true);
    try {
      const payload = {
        childId: student._id,
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
        position_in_class: position ? parseInt(position) : null,
        total_pupils: totalPupils ? parseInt(totalPupils) : null,
        next_term_opens: nextTermDate || null,
        promoted,
        isPublished: publish,
      };

      const res = await api.post("/report-cards", payload);
      setExistingCard(res.data.reportCard);

      if (publish) {
        showToast(`✅ Report published — parent will be notified!`);
      } else {
        showToast("💾 Draft saved successfully");
      }
    } catch (err) {
      showToast("❌ " + (err.response?.data?.error || err.message), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingStudents) {
    return <div className="rb-loading">⏳ Loading students...</div>;
  }

  return (
    <div>
      {toast.msg && (
        <div className={toast.type === "error" ? "rb-error-toast" : "rb-success-toast"}>
          {toast.msg}
        </div>
      )}

      {/* Student & Term */}
      <div className="rb-card">
        <div className="rb-card-title"><span>📋</span> Student & Term
          {existingCard && <span style={{ marginLeft:"auto", fontSize:11, color: existingCard.isPublished ? "#3fb950" : "#d97706", fontWeight:400 }}>{existingCard.isPublished ? "✅ Published" : "📝 Draft saved"}</span>}
        </div>
        <div className="rb-grid-3">
          <div>
            <div className="rb-label">Student</div>
            <select className="rb-input" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
              <option value="">— Select Student —</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({GRADE_LABELS[s.grade] || s.grade})</option>
              ))}
            </select>
          </div>
          <div>
            <div className="rb-label">Term</div>
            <select className="rb-input" value={term} onChange={(e) => setTerm(e.target.value)}>
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          <div>
            <div className="rb-label">Year</div>
            <select className="rb-input" value={year} onChange={(e) => setYear(e.target.value)}>
              {[2024,2025,2026,2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        {student && (
          <div style={{ marginTop:"1rem", background:"rgba(201,168,76,0.1)", border:"1px solid rgba(201,168,76,0.3)", borderRadius:"8px", padding:"0.75rem 1rem", display:"flex", alignItems:"center", gap:"12px" }}>
            <div style={{ width:40, height:40, borderRadius:"50%", background:"#c9a84c", color:"#0f1923", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:16, flexShrink:0 }}>
              {student.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:15, color:"#c9a84c" }}>{student.name}</div>
              <div style={{ fontSize:12, color:"#8b949e" }}>{GRADE_LABELS[student.grade] || student.grade} · Term {term} · {year}</div>
            </div>
          </div>
        )}
      </div>

      {/* Subjects */}
      {student && subjects.length > 0 && (
        <div className="rb-card">
          <div className="rb-card-title">
            <span>📚</span> Academic Results
            <span style={{ fontSize:11, color:"#8b949e", fontWeight:400, marginLeft:"auto" }}>CA = out of 40 · Exam = out of 60 · Total = out of 100</span>
          </div>
          <table className="rb-subject-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th style={{ width:80, textAlign:"center" }}>CA (40)</th>
                <th style={{ width:80, textAlign:"center" }}>Exam (60)</th>
                <th style={{ width:80, textAlign:"center" }}>Total</th>
                <th style={{ width:60, textAlign:"center" }}>Grade</th>
                <th>Teacher Comment</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subj, i) => {
                const gradeInfo = subj.total > 0 ? getLetterGrade(subj.total) : null;
                return (
                  <tr key={subj.name}>
                    <td style={{ fontWeight:600, fontSize:14 }}>{subj.name}</td>
                    <td style={{ textAlign:"center" }}>
                      <input className="rb-input-sm" type="number" min="0" max="40" value={subj.ca} onChange={(e) => updateSubject(i,"ca",e.target.value)} placeholder="0"/>
                    </td>
                    <td style={{ textAlign:"center" }}>
                      <input className="rb-input-sm" type="number" min="0" max="60" value={subj.exam} onChange={(e) => updateSubject(i,"exam",e.target.value)} placeholder="0"/>
                    </td>
                    <td style={{ textAlign:"center" }}>
                      <span className="rb-total-display" style={{ color: gradeInfo?.color || "#8b949e" }}>
                        {subj.total > 0 ? subj.total : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign:"center" }}>
                      {gradeInfo && (
                        <span className="rb-grade-pill" style={{ background: gradeInfo.color + "22", color: gradeInfo.color }}>
                          {gradeInfo.letter}
                        </span>
                      )}
                    </td>
                    <td>
                      <input className="rb-input" type="text" style={{ padding:"6px 10px", fontSize:13 }} placeholder="Optional comment" value={subj.teacher_comment} onChange={(e) => updateSubject(i,"teacher_comment",e.target.value)}/>
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
        <div className="rb-grid-2">
          <div className="rb-card">
            <div className="rb-card-title"><span>🌟</span> Conduct</div>
            {CONDUCT_FIELDS.map((field) => (
              <div key={field} style={{ marginBottom:"0.75rem" }}>
                <div className="rb-label" style={{ textTransform:"capitalize" }}>{field}</div>
                <select className="rb-select-conduct" value={conduct[field] || ""} onChange={(e) => setConduct((prev) => ({ ...prev, [field]: e.target.value }))}>
                  <option value="">— Select —</option>
                  {CONDUCT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="rb-card">
            <div className="rb-card-title"><span>📅</span> Attendance & Position</div>
            {[["Days Present","present"],["Days Absent","absent"],["Total School Days","total"]].map(([label, key]) => (
              <div key={key} style={{ marginBottom:"0.75rem" }}>
                <div className="rb-label">{label}</div>
                <input className="rb-input" type="number" value={attendance[key]} onChange={(e) => setAttendance((p) => ({ ...p, [key]: e.target.value }))} placeholder="e.g. 65"/>
              </div>
            ))}
            <div className="rb-grid-2" style={{ gap:"0.75rem" }}>
              <div>
                <div className="rb-label">Position in Class</div>
                <input className="rb-input" type="number" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. 5"/>
              </div>
              <div>
                <div className="rb-label">Total Pupils</div>
                <input className="rb-input" type="number" value={totalPupils} onChange={(e) => setTotalPupils(e.target.value)} placeholder="e.g. 40"/>
              </div>
            </div>
            <div style={{ marginTop:"0.75rem" }}>
              <div className="rb-label">Next Term Opens</div>
              <input className="rb-input" type="date" value={nextTermDate} onChange={(e) => setNextTermDate(e.target.value)}/>
            </div>
            <div style={{ marginTop:"0.75rem" }}>
              <div className="rb-label">Promotion Status</div>
              <select className="rb-input" value={promoted ? "yes" : "no"} onChange={(e) => setPromoted(e.target.value === "yes")}>
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
          <div className="rb-grid-2">
            <div>
              <div className="rb-label">Class Teacher Comment</div>
              <textarea className="rb-input" value={classComment} onChange={(e) => setClassComment(e.target.value)} placeholder="Comment on student's overall performance..."/>
            </div>
            <div>
              <div className="rb-label">Head Teacher Comment</div>
              <textarea className="rb-input" value={headComment} onChange={(e) => setHeadComment(e.target.value)} placeholder="Head teacher remarks..."/>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {student && (
        <div style={{ display:"flex", gap:"1rem", justifyContent:"flex-end", marginTop:"0.5rem" }}>
          <button className="rb-btn rb-btn-outline" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? "Saving..." : "💾 Save Draft"}
          </button>
          <button className="rb-btn rb-btn-gold" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? "Publishing..." : "🚀 Publish to Parent"}
          </button>
        </div>
      )}

      {!student && (
        <div className="rb-empty">
          <div className="rb-empty-icon">📋</div>
          <div style={{ fontSize:15 }}>Select a student above to enter their report card</div>
        </div>
      )}
    </div>
  );
}

// ── Parent: View Report Book ─────────────────────────────────────────
function ParentReportView({ socket, childId, childName }) {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newReportAlert, setNewReportAlert] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!childId) { setLoading(false); return; }
    const fetchReports = async () => {
      try {
        const res = await api.get(`/report-cards/child/${childId}`);
        const cards = res.data.reportCards || [];
        setReports(cards);
        if (cards.length > 0) setSelectedReport(cards[0]);
      } catch (err) {
        setError("Failed to load report cards: " + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [childId]);

  // Real-time: listen for new published reports
  useEffect(() => {
    if (!socket) return;
    const handler = async (data) => {
      setNewReportAlert(data);
      setTimeout(() => setNewReportAlert(null), 6000);
      // Refresh report list
      try {
        const res = await api.get(`/report-cards/child/${childId}`);
        const cards = res.data.reportCards || [];
        setReports(cards);
        if (cards.length > 0 && !selectedReport) setSelectedReport(cards[0]);
      } catch {}
    };
    socket.on("report_published", handler);
    return () => socket.off("report_published", handler);
  }, [socket, childId, selectedReport]);

  const avgTotal = selectedReport && selectedReport.subjects?.length > 0
    ? Math.round(selectedReport.subjects.reduce((s, sub) => s + (sub.total || 0), 0) / selectedReport.subjects.length)
    : 0;

  if (loading) return <div className="rb-loading">⏳ Loading report cards...</div>;
  if (error) return <div className="rb-empty"><div className="rb-empty-icon">❌</div><div style={{ fontSize:14 }}>{error}</div></div>;

  return (
    <div>
      {newReportAlert && (
        <div className="rb-success-toast">
          📬 New report published for {newReportAlert.studentName} — Term {newReportAlert.term}!
        </div>
      )}

      {reports.length === 0 ? (
        <div className="rb-empty">
          <div className="rb-empty-icon">📭</div>
          <div style={{ fontSize:15 }}>No report cards published yet</div>
          <div style={{ fontSize:13, marginTop:8, color:"#6e7681" }}>Your child's report cards will appear here when published by the school</div>
        </div>
      ) : (
        <>
          {/* Term selector */}
          <div style={{ display:"flex", gap:"0.75rem", marginBottom:"1.25rem", flexWrap:"wrap" }}>
            {reports.map((r) => (
              <button
                key={r._id}
                className={`rb-btn ${selectedReport?._id === r._id ? "rb-btn-gold" : "rb-btn-outline"}`}
                style={{ padding:"8px 18px", fontSize:13 }}
                onClick={() => setSelectedReport(r)}
              >
                Term {r.term} · {r.year}
              </button>
            ))}
          </div>

          {selectedReport && (
            <div className="rb-report-view">
              {/* Header */}
              <div className="rb-report-header">
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"1rem" }}>
                  <div style={{ width:56, height:56, background:"#c9a84c", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bitter',serif", fontWeight:700, fontSize:22, color:"#0f1923" }}>P</div>
                  <div style={{ textAlign:"left" }}>
                    <div className="rb-report-title">Peace Mindset School</div>
                    <div className="rb-report-subtitle">Academic Progress Report · Term {selectedReport.term}, {selectedReport.year}</div>
                  </div>
                </div>
              </div>

              {/* Student Info */}
              <div className="rb-report-student-bar">
                {[
                  ["Pupil Name", childName || "Student"],
                  ["Grade", GRADE_LABELS[selectedReport.grade] || selectedReport.grade],
                  ["Term", `Term ${selectedReport.term}, ${selectedReport.year}`],
                  ["Average", selectedReport.subjects?.length > 0 ? `${avgTotal}% (${getLetterGrade(avgTotal).letter})` : "N/A"],
                  ["Position", selectedReport.position_in_class ? `${selectedReport.position_in_class} of ${selectedReport.total_pupils}` : "N/A"],
                  ["Status", selectedReport.promoted ? "✓ Promoted" : "✗ Repeat"],
                ].map(([label, val]) => (
                  <div key={label} className="rb-report-field">
                    <div className="rb-report-field-label">{label}</div>
                    <div className="rb-report-field-val" style={{ color: label === "Status" ? (selectedReport.promoted ? "#16a34a" : "#dc2626") : label === "Average" ? getLetterGrade(avgTotal).color : undefined }}>{val}</div>
                  </div>
                ))}
              </div>

              <div className="rb-report-body">
                {/* Academic Results */}
                {selectedReport.subjects?.length > 0 && (
                  <>
                    <div className="rb-report-section-title">Academic Results</div>
                    <table className="rb-report-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th style={{ textAlign:"center" }}>CA (40)</th>
                          <th style={{ textAlign:"center" }}>Exam (60)</th>
                          <th style={{ textAlign:"center" }}>Total (100)</th>
                          <th style={{ textAlign:"center" }}>Grade</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.subjects.map((subj) => {
                          const g = getLetterGrade(subj.total);
                          return (
                            <tr key={subj.name}>
                              <td style={{ fontWeight:600 }}>{subj.name}</td>
                              <td style={{ textAlign:"center" }}>{subj.continuous_assessment}</td>
                              <td style={{ textAlign:"center" }}>{subj.end_of_term_exam}</td>
                              <td style={{ textAlign:"center", fontWeight:700, fontSize:15, color:g.color }}>{subj.total}</td>
                              <td style={{ textAlign:"center" }}>
                                <span style={{ background:g.color+"22", color:g.color, padding:"2px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>{g.letter} — {g.label}</span>
                              </td>
                              <td style={{ fontSize:12, color:"#555" }}>{subj.teacher_comment || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {/* Grade Key */}
                    <div style={{ background:"#f4f6fb", borderRadius:8, padding:"0.75rem 1rem", marginTop:"0.75rem", display:"flex", gap:"1rem", flexWrap:"wrap", fontSize:12, color:"#555" }}>
                      <strong style={{ color:"#1a2744" }}>Key:</strong>
                      {[{l:"A",t:"80–100%",c:"#16a34a"},{l:"B",t:"65–79%",c:"#2563eb"},{l:"C",t:"50–64%",c:"#7c3aed"},{l:"D",t:"40–49%",c:"#d97706"},{l:"E",t:"30–39%",c:"#ea580c"},{l:"F",t:"0–29%",c:"#dc2626"}].map((g) => (
                        <span key={g.l}><span style={{ fontWeight:700, color:g.c, marginRight:2 }}>{g.l}</span> {g.t}</span>
                      ))}
                    </div>
                  </>
                )}

                {/* Attendance */}
                {selectedReport.attendance?.total_school_days > 0 && (
                  <>
                    <div className="rb-report-section-title">Attendance</div>
                    <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }}>
                      {[
                        ["Days Present", selectedReport.attendance.days_present, "#16a34a"],
                        ["Days Absent", selectedReport.attendance.days_absent, "#dc2626"],
                        ["Total School Days", selectedReport.attendance.total_school_days, "#1a2744"],
                        ["Attendance %", Math.round((selectedReport.attendance.days_present / selectedReport.attendance.total_school_days) * 100) + "%", "#7c3aed"],
                      ].map(([label, val, color]) => (
                        <div key={label} style={{ background:"#f4f6fb", borderRadius:8, padding:"0.75rem 1.25rem", minWidth:120, flex:1 }}>
                          <div style={{ fontSize:11, color:"#7a8298", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>{label}</div>
                          <div style={{ fontSize:22, fontWeight:700, fontFamily:"'Bitter',serif", color, marginTop:4 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Conduct */}
                {selectedReport.conduct && Object.keys(selectedReport.conduct).length > 0 && (
                  <>
                    <div className="rb-report-section-title">Conduct</div>
                    <div className="rb-conduct-grid">
                      {Object.entries(selectedReport.conduct).filter(([,v]) => v).map(([key, val]) => (
                        <div key={key} className="rb-conduct-item">
                          <div className="rb-conduct-key" style={{ textTransform:"capitalize" }}>{key}</div>
                          <div className="rb-conduct-val" style={{ color: val==="Excellent"?"#16a34a":val==="Good"?"#2563eb":val==="Fair"?"#d97706":"#dc2626" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Comments */}
                {(selectedReport.class_teacher_comment || selectedReport.head_teacher_comment) && (
                  <>
                    <div className="rb-report-section-title">Comments</div>
                    {selectedReport.class_teacher_comment && (
                      <div>
                        <div className="rb-comment-who">Class Teacher</div>
                        <div className="rb-comment-box">{selectedReport.class_teacher_comment}</div>
                      </div>
                    )}
                    {selectedReport.head_teacher_comment && (
                      <div>
                        <div className="rb-comment-who">Head Teacher</div>
                        <div className="rb-comment-box">{selectedReport.head_teacher_comment}</div>
                      </div>
                    )}
                  </>
                )}

                {/* Next Term */}
                {selectedReport.next_term_opens && (
                  <div style={{ background:"rgba(201,168,76,0.1)", border:"1px solid rgba(201,168,76,0.3)", borderRadius:8, padding:"0.75rem 1rem", marginTop:"1rem", fontSize:13, color:"#7a5c1e" }}>
                    <strong>Next term opens:</strong>{" "}
                    {new Date(selectedReport.next_term_opens).toLocaleDateString("en-ZM", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="rb-report-footer">
                <div className="rb-footer-text">Peace Mindset School · Lusaka, Zambia</div>
                <div style={{ display:"flex", gap:"2rem" }}>
                  <div className="rb-sig-line">Class Teacher</div>
                  <div className="rb-sig-line">Head Teacher</div>
                  <div className="rb-sig-line">Parent / Guardian</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────
export default function ZambianReportBook({ socket, isAdmin = false, childId, childName }) {
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
          <button className={`rb-tab ${activeTab === "admin" ? "active" : ""}`} onClick={() => setActiveTab("admin")}>
            📝 Enter Results
          </button>
        )}
        <button className={`rb-tab ${activeTab === "view" ? "active" : ""}`} onClick={() => setActiveTab("view")}>
          📖 View Report Book
        </button>
      </div>
      <div className="rb-body">
        {activeTab === "admin" && isAdmin && <AdminEntryPanel socket={socket} />}
        {activeTab === "view" && <ParentReportView socket={socket} childId={childId} childName={childName} />}
      </div>
    </div>
  );
}
