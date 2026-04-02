
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

/* ── Zambian Grade System ────────────────────────────────────────── */
const ZAMBIAN_GRADES = [
  { label:'Distinction', min:80, max:100, color:'#16a34a', bg:'#F0FDF4', border:'#16a34a30', short:'D' },
  { label:'Merit',       min:65, max:79,  color:'#2563eb', bg:'#EFF6FF', border:'#2563eb30', short:'M' },
  { label:'Credit',      min:50, max:64,  color:'#7c3aed', bg:'#F5F3FF', border:'#7c3aed30', short:'CR' },
  { label:'Satisfactory',min:40, max:49,  color:'#d97706', bg:'#FFFBEB', border:'#d97706030', short:'S' },
  { label:'Approaching', min:30, max:39,  color:'#ea580c', bg:'#FFF7ED', border:'#ea580c30', short:'AP' },
  { label:'Unsatisfactory',min:0,max:29,  color:'#dc2626', bg:'#FEF2F2', border:'#dc262630', short:'U' },
];

const getZambianGrade = (total) => {
  // Return null for empty/not-entered subjects — show blank not Unsatisfactory
  if (total === null || total === undefined || total === '' || total === 0) return null;
  const n = Number(total);
  if (n <= 0) return null; // No marks entered — show blank
  return ZAMBIAN_GRADES.find(g => n >= g.min && n <= g.max) || ZAMBIAN_GRADES[5];
};

// Check if a subject had marks actually entered
const hasMarks = (s) => {
  const ca = Number(s.continuous_assessment) || 0;
  const ex = Number(s.end_of_term_exam) || 0;
  return ca > 0 || ex > 0;
};

const GradeBadge = ({ total, small }) => {
  if (total === null || total === undefined || total === '' || Number(total) <= 0) return <span style={{color:'#d1d5db'}}>—</span>;
  const g = getZambianGrade(total);
  if (!g) return <span style={{color:'#d1d5db'}}>—</span>;
  return (
    <span style={{
      background: g.bg, color: g.color,
      border: `1px solid ${g.color}40`,
      borderRadius: small ? 6 : 20,
      padding: small ? '1px 6px' : '3px 10px',
      fontWeight: 800, fontSize: small ? 10 : 12,
      whiteSpace: 'nowrap', display: 'inline-block',
    }}>
      {small ? g.short : g.label}
    </span>
  );
};

/* ── Subjects by Grade ────────────────────────────────────────────── */
const SUBJECTS_BY_GRADE = {
  baby:   ['Literacy','Numeracy','Creative Arts','Physical Education','Social Studies','Oral Communication'],
  pp1:    ['Literacy','Numeracy','Creative Arts','Physical Education','Social Studies','Oral Communication'],
  pp2:    ['Literacy','Numeracy','Creative Arts','Physical Education','Social Studies','Oral Communication'],
  grade1: ['English Language','Mathematics','Expressive Arts','Environmental Science','Social Studies','Home Economics','Physical Education'],
  grade2: ['English Language','Mathematics','Expressive Arts','Environmental Science','Social Studies','Home Economics','Physical Education','Local Language'],
  grade3: ['English Language','Mathematics','Expressive Arts','Environmental Science','Social Studies','Home Economics','Physical Education','Local Language'],
  grade4: ['English Language','Mathematics','Social Studies','Integrated Science','Home Economics','Local Language','Creative & Technology Studies','Physical Education','Expressive Arts'],
  grade5: ['English Language','Mathematics','Social Studies','Integrated Science','Home Economics','Local Language','Creative & Technology Studies','Physical Education','Expressive Arts'],
  grade6: ['English Language','Mathematics','Social Studies','Integrated Science','Home Economics','Local Language','Creative & Technology Studies','Physical Education','Expressive Arts'],
  grade7: ['English Language','Mathematics','Social Studies','Integrated Science','Home Economics','Local Language','Creative & Technology Studies','Physical Education','Expressive Arts'],
};

const GRADE_LABELS = {
  baby:'Baby Class', pp1:'PP1', pp2:'PP2',
  grade1:'Grade 1', grade2:'Grade 2', grade3:'Grade 3', grade4:'Grade 4',
  grade5:'Grade 5', grade6:'Grade 6', grade7:'Grade 7',
};

const normalizeGrade = (g = '') => {
  const s = g.toString().toLowerCase().replace(/\s+/g,'').replace('class','');
  if (s==='baby'||s==='babyclass') return 'baby';
  if (s==='pp1'||s==='nursery1') return 'pp1';
  if (s==='pp2'||s==='nursery2') return 'pp2';
  for (let i = 1; i <= 7; i++) if (s === `grade${i}` || s === `${i}`) return `grade${i}`;
  return 'grade1';
};

const nth = n => { if (!n) return ''; const s=['th','st','nd','rd']; const v=n%100; return s[(v-20)%10]||s[v]||s[0]; };

const CONDUCT_OPTIONS = ['Excellent','Very Good','Good','Satisfactory','Needs Improvement','Poor'];
const TERMS = ['1','2','3'];
const GRADE_KEYS = ['baby','pp1','pp2','grade1','grade2','grade3','grade4','grade5','grade6','grade7'];

/* ── Official School Stamp ───────────────────────────────────────── */
function SchoolStamp() {
  const today = new Date().toLocaleDateString('en-ZM',{day:'2-digit',month:'long',year:'numeric'}).toUpperCase();
  return (
    <div style={{display:'flex', justifyContent:'center', padding:'10px 0'}}>
      <div style={{
        border: '3px solid #1a56db',
        borderRadius: 4,
        padding: '14px 22px',
        textAlign: 'center',
        position: 'relative',
        minWidth: 240,
        maxWidth: 300,
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 0 0 1px #1a56db, inset 0 0 0 1px #1a56db',
        outline: '2px dashed #1a56db',
        outlineOffset: '4px',
      }}>
        <div style={{fontSize:9,fontWeight:700,color:'#1a56db',letterSpacing:'0.12em',textTransform:'uppercase',borderBottom:'1.5px solid #1a56db',paddingBottom:6,marginBottom:6}}>
          MIN. OF PRIMARY &amp; SECONDARY EDUCATION
        </div>
        <div style={{fontSize:11,fontWeight:800,color:'#1a56db',letterSpacing:'0.06em',textTransform:'uppercase',lineHeight:1.3,marginBottom:4}}>
          THE HEAD<br/>PEACE MINDSET PRIVATE SCHOOL
        </div>
        <div style={{fontSize:14,fontWeight:900,color:'#dc2626',letterSpacing:'0.08em',margin:'8px 0',fontStyle:'italic'}}>
          {today}
        </div>
        <div style={{borderTop:'1.5px solid #1a56db',paddingTop:6,fontSize:9,fontWeight:700,color:'#1a56db',letterSpacing:'0.06em',lineHeight:1.6}}>
          TEL: 0960774535<br/>DISTRICT: MUFULIRA
        </div>
      </div>
    </div>
  );
}

/* ── Report Cover ────────────────────────────────────────────────── */
function ReportCover({ child, card }) {
  const gradeLabel = GRADE_LABELS[normalizeGrade(card?.grade||child?.grade)] || child?.grade || '';
  return (
    <div style={{background:'#fff',borderRadius:12,overflow:'hidden',border:'3px solid #9B1826',marginBottom:0}}>
      <div style={{background:'linear-gradient(135deg,#6B0F1A,#9B1826,#C02035)',padding:'24px 20px',textAlign:'center',position:'relative'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,opacity:0.06,backgroundImage:'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',backgroundSize:'10px 10px'}}/>
        <img src="/logo.webp" alt="School Logo" style={{width:90,height:90,objectFit:'contain',marginBottom:12,filter:'drop-shadow(0 3px 6px rgba(0,0,0,0.4))',borderRadius:'50%',border:'3px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.1)',padding:4}} onError={e=>e.target.style.display='none'}/>
        <h1 style={{color:'#fff',fontSize:20,fontWeight:900,margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'0.06em',lineHeight:1.2,textShadow:'0 2px 4px rgba(0,0,0,0.3)'}}>
          Peace Mindset Private School
        </h1>
        <p style={{color:'rgba(255,255,255,0.8)',fontSize:13,margin:'0 0 4px',fontStyle:'italic'}}>Better Education · Better Future</p>
        <p style={{color:'rgba(255,255,255,0.6)',fontSize:11,margin:0}}>Mufulira District, Zambia · Tel: 0960774535</p>
      </div>
      <div style={{background:'linear-gradient(135deg,#FEF3C7,#FDE68A)',borderTop:'3px solid #D97706',borderBottom:'3px solid #D97706',padding:'12px 24px',textAlign:'center'}}>
        <h2 style={{color:'#78350F',fontSize:15,fontWeight:900,margin:0,textTransform:'uppercase',letterSpacing:'0.1em'}}>
          📋 End of Term {card?.term} Report — {card?.year}
        </h2>
      </div>
      <div style={{padding:'20px 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px 24px'}}>
          {[
            ['Student Name', child?.name || ''],
            ['Grade / Class', gradeLabel],
            ['Student ID', child?.studentId || (child?._id||'').toString().slice(-6).toUpperCase() || 'N/A'],
            ['Term', `Term ${card?.term}`],
            ['Academic Year', String(card?.year||'')],
            ['Class Teacher', card?.class_teacher_name || '—'],
          ].map(([label,val])=>(
            <div key={label} style={{borderBottom:'1.5px solid #f3f4f6',paddingBottom:10}}>
              <div style={{fontSize:10,color:'#9ca3af',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3}}>{label}</div>
              <div style={{fontSize:15,fontWeight:800,color:'#111827'}}>{val}</div>
            </div>
          ))}
        </div>
        {card?.position_in_class && (
          <div style={{marginTop:16,background:'linear-gradient(135deg,#9B1826,#C02035)',borderRadius:12,padding:'14px 20px',textAlign:'center',color:'#fff',boxShadow:'0 4px 12px rgba(155,24,38,0.3)'}}>
            <div style={{fontSize:11,opacity:0.8,marginBottom:3,textTransform:'uppercase',letterSpacing:'0.08em'}}>Position in Class</div>
            <div style={{fontSize:32,fontWeight:900,lineHeight:1}}>{card.position_in_class}{nth(card.position_in_class)}</div>
            {card.total_pupils && <div style={{fontSize:12,opacity:0.75,marginTop:2}}>out of {card.total_pupils} pupils</div>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Subjects Table ──────────────────────────────────────────────── */
function SubjectsTable({ subjects }) {
  const enteredSubjects = subjects.filter(s =>
    (Number(s.continuous_assessment)||0) > 0 || (Number(s.end_of_term_exam)||0) > 0
  );
  const totalAll = enteredSubjects.reduce((s,x)=>s+(+x.total||0),0);
  const avg = enteredSubjects.length ? Math.round(totalAll/enteredSubjects.length) : 0;
  const avgGrade = enteredSubjects.length > 0 ? getZambianGrade(avg) : null;
  return (
    <div style={{background:'#fff',border:'2px solid #9B1826',borderRadius:12,overflow:'hidden'}}>
      <div style={{background:'linear-gradient(135deg,#9B1826,#C02035)',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h3 style={{color:'#fff',margin:0,fontSize:14,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.06em'}}>📚 Academic Performance</h3>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Class Average</div>
          <div style={{fontSize:18,fontWeight:900,color:'#fff'}}>{avg}%</div>
        </div>
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead>
            <tr style={{background:'linear-gradient(135deg,#FEF3C7,#FDE68A)'}}>
              {['Subject','CA (40%)','Exam (60%)','Total','Grade','Remarks'].map(h=>(
                <th key={h} style={{padding:'10px 10px',textAlign:'center',fontWeight:800,fontSize:11,color:'#78350F',borderBottom:'2px solid #D97706',textTransform:'uppercase',letterSpacing:'0.04em',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((s,i)=>{
              const g = getZambianGrade(s.total);
              return (
                <tr key={i} style={{background:i%2===0?'#fff':'#FAFAFA',transition:'background .15s'}}>
                  <td style={{padding:'10px 12px',fontWeight:700,color:'#111827',borderBottom:'1px solid #f3f4f6'}}>{s.name}</td>
                  <td style={{padding:'10px',textAlign:'center',color:'#374151',borderBottom:'1px solid #f3f4f6',fontWeight:600}}>{s.continuous_assessment||'—'}</td>
                  <td style={{padding:'10px',textAlign:'center',color:'#374151',borderBottom:'1px solid #f3f4f6',fontWeight:600}}>{s.end_of_term_exam||'—'}</td>
                  <td style={{padding:'10px',textAlign:'center',fontWeight:800,fontSize:15,color:'#111827',borderBottom:'1px solid #f3f4f6'}}>{s.total||'—'}</td>
                  <td style={{padding:'10px',textAlign:'center',borderBottom:'1px solid #f3f4f6'}}>
                    {g ? (
                      <span style={{background:g.bg,color:g.color,border:`1px solid ${g.color}40`,borderRadius:20,padding:'3px 10px',fontWeight:800,fontSize:11,whiteSpace:'nowrap'}}>
                        {g.label}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{padding:'10px',fontSize:12,color:'#6b7280',borderBottom:'1px solid #f3f4f6',fontStyle:s.teacher_comment?'italic':'normal'}}>{s.teacher_comment||'—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:'linear-gradient(135deg,#F3F4F6,#E5E7EB)',fontWeight:800}}>
              <td style={{padding:'12px 12px',color:'#111827',fontSize:13}}>
                AVERAGE <span style={{fontSize:10,fontWeight:400,color:'#6b7280'}}>({enteredSubjects.length}/{subjects.length} subjects)</span>
              </td>
              <td colSpan={2} style={{padding:'12px',textAlign:'center',color:'#6b7280',fontSize:12}}>——</td>
              <td style={{padding:'12px',textAlign:'center',fontSize:18,fontWeight:900,color:'#9B1826'}}>{avg}%</td>
              <td style={{padding:'12px',textAlign:'center'}}>
                {avgGrade && (
                  <span style={{background:avgGrade.bg,color:avgGrade.color,border:`1px solid ${avgGrade.color}40`,borderRadius:20,padding:'4px 12px',fontWeight:900,fontSize:12}}>{avgGrade.label}</span>
                )}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {/* Grade key */}
      <div style={{padding:'10px 14px',background:'#F9FAFB',borderTop:'1px solid #e5e7eb',display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
        <span style={{fontSize:11,fontWeight:700,color:'#374151',marginRight:4}}>KEY:</span>
        {ZAMBIAN_GRADES.map(g=>(
          <span key={g.label} style={{fontSize:11,color:g.color,fontWeight:700,background:g.bg,padding:'1px 8px',borderRadius:10,border:`1px solid ${g.color}30`}}>
            {g.label}: {g.min}–{g.max}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Bottom Info Panels ──────────────────────────────────────────── */
function BottomPanel({ card }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
      <div style={{background:'#fff',border:'1.5px solid #e5e7eb',borderRadius:12,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
        <h4 style={{margin:'0 0 12px',fontSize:12,fontWeight:800,color:'#374151',textTransform:'uppercase',letterSpacing:'0.08em',display:'flex',alignItems:'center',gap:6}}>
          <span>📅</span> Attendance
        </h4>
        {[['Days Present',card?.attendance?.days_present,'#16a34a'],['Days Absent',card?.attendance?.days_absent,'#dc2626'],['Total School Days',card?.attendance?.total_school_days,'#2563eb']].map(([l,v,c])=>(
          <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f9fafb'}}>
            <span style={{fontSize:13,color:'#6b7280'}}>{l}</span>
            <span style={{fontSize:15,fontWeight:800,color:c}}>{v??'—'}</span>
          </div>
        ))}
      </div>
      <div style={{background:'#fff',border:'1.5px solid #e5e7eb',borderRadius:12,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
        <h4 style={{margin:'0 0 12px',fontSize:12,fontWeight:800,color:'#374151',textTransform:'uppercase',letterSpacing:'0.08em',display:'flex',alignItems:'center',gap:6}}>
          <span>🌟</span> Conduct
        </h4>
        {Object.entries(card?.conduct||{}).slice(0,5).map(([k,v])=>(
          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #f9fafb'}}>
            <span style={{fontSize:12,color:'#6b7280',textTransform:'capitalize'}}>{k.replace(/_/g,' ')}</span>
            <span style={{fontSize:12,fontWeight:700,color:'#374151'}}>{v||'—'}</span>
          </div>
        ))}
      </div>
      <div style={{background:'#fff',border:'1.5px solid #e5e7eb',borderRadius:12,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
        <h4 style={{margin:'0 0 10px',fontSize:12,fontWeight:800,color:'#374151',textTransform:'uppercase',letterSpacing:'0.08em'}}>✏️ Class Teacher</h4>
        <p style={{fontSize:13,color:'#374151',fontStyle:'italic',margin:'0 0 14px',lineHeight:1.6,minHeight:36}}>"{card?.class_teacher_comment||'No comment.'}"</p>
        <div style={{borderTop:'1.5px solid #e5e7eb',paddingTop:8,display:'flex',justifyContent:'space-between',fontSize:11,color:'#9ca3af'}}>
          <span>Signature: ___________</span>
          <span>Date: {new Date().toLocaleDateString('en-ZM')}</span>
        </div>
      </div>
      <div style={{background:'#fff',border:'1.5px solid #e5e7eb',borderRadius:12,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
        <h4 style={{margin:'0 0 10px',fontSize:12,fontWeight:800,color:'#374151',textTransform:'uppercase',letterSpacing:'0.08em'}}>🏫 Head Teacher</h4>
        <p style={{fontSize:13,color:'#374151',fontStyle:'italic',margin:'0 0 14px',lineHeight:1.6,minHeight:36}}>"{card?.head_teacher_comment||'No comment.'}"</p>
        <div style={{borderTop:'1.5px solid #e5e7eb',paddingTop:8,display:'flex',justifyContent:'space-between',fontSize:11}}>
          <span style={{color:'#9ca3af'}}>Signature: ___________</span>
          {card?.next_term_opens && <span style={{color:'#16a34a',fontWeight:700}}>Next Term: {new Date(card.next_term_opens).toLocaleDateString('en-ZM',{day:'numeric',month:'long',year:'numeric'})}</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Full Report View (printable) ────────────────────────────────── */
function ReportView({ card, child, onClose }) {
  const download = () => {
    const el = document.getElementById('rpt-area');
    if (!el) return;
    const win = window.open('','_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Report — ${child?.name}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#f3f4f6;padding:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      table{border-collapse:collapse;width:100%;}
      @media print{body{padding:8px;background:#fff;}}
    </style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(()=>win.print(),600);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:9000,overflowY:'auto',padding:'16px 12px 40px'}}>
      <div style={{maxWidth:700,margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
          <h2 style={{color:'#fff',margin:0,fontSize:18,fontWeight:800}}>📋 {child?.name} — Report Book</h2>
          <div style={{display:'flex',gap:8}}>
            <button onClick={download} style={{padding:'9px 20px',background:'#16a34a',border:'none',borderRadius:20,color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
              ⬇ Download / Print
            </button>
            <button onClick={onClose} style={{padding:'9px 18px',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:20,color:'#fff',fontSize:13,cursor:'pointer'}}>
              ✕ Close
            </button>
          </div>
        </div>
        <div id="rpt-area" style={{display:'flex',flexDirection:'column',gap:14,background:'#f3f4f6',padding:14,borderRadius:14}}>
          <ReportCover child={child} card={card}/>
          {card.subjects?.length > 0 && <SubjectsTable subjects={card.subjects}/>}
          <BottomPanel card={card}/>
          <div style={{background:'#fff',border:`2px solid ${card.promoted!==false?'#16a34a':'#dc2626'}`,borderRadius:12,padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
            <span style={{fontSize:15,fontWeight:800,color:'#374151'}}>Promotion Status</span>
            <span style={{fontSize:16,fontWeight:900,color:card.promoted!==false?'#16a34a':'#dc2626'}}>
              {card.promoted!==false?'✅ PROMOTED':'❌ NOT PROMOTED'}
            </span>
          </div>
          {/* Official Stamp */}
          <div style={{background:'#fff',border:'1.5px solid #e5e7eb',borderRadius:12,padding:'16px 20px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'#374151',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,textAlign:'center'}}>Official School Stamp</div>
            <SchoolStamp/>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Admin: Create Report 5-Step Form ───────────────────────────── */
function AdminCreateReport({ children, onSaved, onClose }) {
  const [step,     setStep]    = useState(1);
  const [childId,  setChildId] = useState('');
  const [term,     setTerm]    = useState('1');
  const [year,     setYear]    = useState(String(new Date().getFullYear()));
  const [grade,    setGrade]   = useState('grade1');
  const [subjects, setSubjects]= useState([]);
  const [attend,   setAttend]  = useState({days_present:'',days_absent:'',total_school_days:''});
  const [conduct,  setConduct] = useState({Discipline:'',Respect:'',Participation:'',Cooperation:'',Punctuality:''});
  const [tcComment,setTcComment]=useState('');
  const [htComment,setHtComment]=useState('');
  const [position, setPosition]= useState('');
  const [totalPup, setTotalPup]= useState('');
  const [nextTerm, setNextTerm]= useState('');
  const [promoted, setPromoted]= useState(true);
  const [publish,  setPublish] = useState(false);
  const [saving,   setSaving]  = useState(false);

  const selChild = children.find(c=>c._id===childId);

  useEffect(()=>{
    const names = SUBJECTS_BY_GRADE[grade] || SUBJECTS_BY_GRADE.grade1;
    setSubjects(names.map(n=>({name:n,continuous_assessment:'',end_of_term_exam:'',total:0,grade_letter:'',teacher_comment:''})));
  },[grade]);

  useEffect(()=>{
    if(selChild?.grade) setGrade(normalizeGrade(selChild.grade));
  },[selChild]);

  const updateSubject = (i, field, val) => {
    setSubjects(s => s.map((x,j) => {
      if(j!==i) return x;
      const up = {...x,[field]:val};
      if(field==='continuous_assessment'||field==='end_of_term_exam'){
        const ca = field==='continuous_assessment'?+val||0:+x.continuous_assessment||0;
        const ex = field==='end_of_term_exam'?+val||0:+x.end_of_term_exam||0;
        // Total = average of CA and Exam (both out of 100), result is out of 100
        if(ca > 0 || ex > 0) {
          const count = (ca > 0 ? 1 : 0) + (ex > 0 ? 1 : 0);
          up.total = count > 0 ? Math.round((ca + ex) / count) : 0;
        } else {
          up.total = 0;
        }
        const g = (up.total > 0) ? getZambianGrade(up.total) : null;
        up.grade_letter = g ? g.short : '';
      }
      return up;
    }));
  };

  const save = async () => {
    if(!childId){ toast.error('Select a child'); return; }
    setSaving(true);
    try {
      await api.post('/report-cards',{
        childId,grade,term,year:+year,
        subjects:subjects.map(s=>({...s,continuous_assessment:+s.continuous_assessment||0,end_of_term_exam:+s.end_of_term_exam||0})),
        attendance:{days_present:+attend.days_present||0,days_absent:+attend.days_absent||0,total_school_days:+attend.total_school_days||0},
        conduct,
        class_teacher_comment:tcComment,
        head_teacher_comment:htComment,
        position_in_class:position?+position:null,
        total_pupils:totalPup?+totalPup:null,
        next_term_opens:nextTerm||null,
        promoted,
        isPublished:publish,
      });
      toast.success(publish?'✅ Report published! Parent notified.':'✅ Saved as draft.');
      onSaved();
    } catch(e){ toast.error(e.response?.data?.error||'Save failed'); }
    finally{ setSaving(false); }
  };

  const inp = {padding:'10px 13px',background:'#F9FAFB',border:'1.5px solid #e5e7eb',borderRadius:10,color:'#111',fontSize:14,outline:'none',width:'100%',boxSizing:'border-box',transition:'border-color .15s'};
  const sel = {...inp};

  const steps = ['Student','Marks','Attendance','Comments','Review'];

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:9000,overflowY:'auto',padding:'16px 12px 40px'}}>
      <div style={{maxWidth:680,margin:'0 auto',background:'#fff',borderRadius:18,overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,0.5)'}}>
        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#6B0F1A,#9B1826)',padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <h2 style={{color:'#fff',margin:0,fontSize:18,fontWeight:800}}>📋 Create Report Book</h2>
            <p style={{color:'rgba(255,255,255,0.7)',margin:'3px 0 0',fontSize:13}}>{selChild?`${selChild.name} — ${selChild.grade}`:'Select a student to begin'}</p>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.3)',color:'#fff',width:36,height:36,borderRadius:'50%',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {/* Progress Steps */}
        <div style={{display:'flex',background:'#F9FAFB',borderBottom:'1px solid #e5e7eb',overflow:'hidden'}}>
          {steps.map((s,i)=>(
            <button key={s} onClick={()=>{ if(i<step) setStep(i+1); }} style={{flex:1,padding:'11px 4px',background:step===i+1?'#fff':'none',border:'none',color:step===i+1?'#9B1826':step>i+1?'#16a34a':'#9ca3af',fontWeight:700,fontSize:10,cursor:'pointer',borderBottom:step===i+1?'2px solid #9B1826':step>i+1?'2px solid #16a34a':'2px solid transparent',textTransform:'uppercase',letterSpacing:'0.04em',display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <span style={{fontSize:14}}>{step>i+1?'✅':i===0?'👦':i===1?'📝':i===2?'📅':i===3?'✏️':'🚀'}</span>
              {s}
            </button>
          ))}
        </div>

        <div style={{padding:22}}>

          {/* STEP 1: Student */}
          {step===1 && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#6b7280',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>Select Student *</label>
                <select style={{...sel,fontSize:15,fontWeight:600}} value={childId} onChange={e=>setChildId(e.target.value)}>
                  <option value="">— Choose a student —</option>
                  {children.map(c=><option key={c._id} value={c._id}>{c.name} — {c.grade||'Grade ?'}</option>)}
                </select>
                {children.length===0 && <div style={{fontSize:12,color:'#dc2626',marginTop:4}}>⚠️ No students found. Make sure students are registered.</div>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#6b7280',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>Grade</label>
                  <select style={sel} value={grade} onChange={e=>setGrade(e.target.value)}>
                    {GRADE_KEYS.map(k=><option key={k} value={k}>{GRADE_LABELS[k]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#6b7280',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>Term</label>
                  <select style={sel} value={term} onChange={e=>setTerm(e.target.value)}>
                    {TERMS.map(t=><option key={t} value={t}>Term {t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#6b7280',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>Year</label>
                  <select style={sel} value={year} onChange={e=>setYear(e.target.value)}>
                    {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#6b7280',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>Position in Class</label>
                  <input style={inp} type="number" value={position} onChange={e=>setPosition(e.target.value)} placeholder="e.g. 5" min={1}/>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:700,color:'#6b7280',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>Total Pupils</label>
                  <input style={inp} type="number" value={totalPup} onChange={e=>setTotalPup(e.target.value)} placeholder="e.g. 30" min={1}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#6b7280',display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>Next Term Opens</label>
                <input style={inp} type="date" value={nextTerm} onChange={e=>setNextTerm(e.target.value)}/>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:'#F9FAFB',borderRadius:12,border:'1px solid #e5e7eb'}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#111'}}>Promoted to Next Grade?</div>
                  <div style={{fontSize:12,color:'#6b7280',marginTop:2}}>Toggle off if student is not promoted</div>
                </div>
                <div onClick={()=>setPromoted(p=>!p)} style={{width:52,height:28,borderRadius:14,background:promoted?'#16a34a':'#d1d5db',position:'relative',cursor:'pointer',transition:'background .2s',flexShrink:0}}>
                  <div style={{position:'absolute',top:4,left:promoted?26:4,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,0.25)'}}/>
                </div>
              </div>
              <button onClick={()=>{ if(!childId){ toast.error('Select a student first'); return; } setStep(2); }} style={{padding:14,background:childId?'linear-gradient(135deg,#9B1826,#C02035)':'#e5e7eb',border:'none',borderRadius:12,color:childId?'#fff':'#9ca3af',fontWeight:800,fontSize:15,cursor:childId?'pointer':'default',transition:'all .2s'}}>
                Next: Enter Marks →
              </button>
            </div>
          )}

          {/* STEP 2: Marks */}
          {step===2 && (
            <div>
              <div style={{background:'linear-gradient(135deg,#FEF3C7,#FDE68A)',border:'1px solid #D97706',borderRadius:10,padding:'12px 14px',marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:700,color:'#78350F',marginBottom:4}}>📝 Enter Marks — {GRADE_LABELS[grade]}</div>
                <div style={{fontSize:12,color:'#92400E'}}>CA = Continuous Assessment (max 100) · Exam = End of Term Exam (max 100) · Average auto-calculated · Leave blank if subject not taught</div>
              </div>
              {/* Grade legend */}
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
                {ZAMBIAN_GRADES.map(g=>(
                  <span key={g.label} style={{fontSize:10,background:g.bg,color:g.color,border:`1px solid ${g.color}30`,padding:'2px 8px',borderRadius:8,fontWeight:700}}>{g.min}-{g.max}: {g.label}</span>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {subjects.map((s,i)=>{
                  const g = getZambianGrade(s.total);
                  return (
                    <div key={i} style={{background:'#F9FAFB',borderRadius:10,padding:'12px 14px',border:`1.5px solid ${g?g.color+'40':'#e5e7eb'}`,transition:'border-color .2s'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <span style={{fontSize:13,fontWeight:700,color:'#111'}}>{s.name}</span>
                        {g && s.total>0 && <span style={{background:g.bg,color:g.color,border:`1px solid ${g.color}40`,borderRadius:20,padding:'2px 10px',fontWeight:800,fontSize:11}}>{g.label}</span>}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px',gap:8}}>
                        <input style={{...inp,textAlign:'center',background:'#fff'}} type="number" value={s.continuous_assessment} onChange={e=>updateSubject(i,'continuous_assessment',e.target.value)} placeholder="CA (0-100)" min={0} max={100}/>
                        <input style={{...inp,textAlign:'center',background:'#fff'}} type="number" value={s.end_of_term_exam} onChange={e=>updateSubject(i,'end_of_term_exam',e.target.value)} placeholder="Exam (0-100)" min={0} max={100}/>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:18,color:'#9B1826'}}>{s.total||0}</div>
                      </div>
                      <input style={{...inp,marginTop:6,fontSize:12,background:'#fff'}} value={s.teacher_comment} onChange={e=>updateSubject(i,'teacher_comment',e.target.value)} placeholder="Teacher remark (optional)"/>
                    </div>
                  );
                })}
              </div>
              <div style={{display:'flex',gap:10,marginTop:18}}>
                <button onClick={()=>setStep(1)} style={{flex:1,padding:12,background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:12,color:'#374151',fontWeight:700,cursor:'pointer'}}>← Back</button>
                <button onClick={()=>setStep(3)} style={{flex:2,padding:12,background:'linear-gradient(135deg,#9B1826,#C02035)',border:'none',borderRadius:12,color:'#fff',fontWeight:800,cursor:'pointer'}}>Next: Attendance →</button>
              </div>
            </div>
          )}

          {/* STEP 3: Attendance & Conduct */}
          {step===3 && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <label style={{fontSize:13,fontWeight:800,color:'#374151',display:'block',marginBottom:12}}>📅 Attendance Record</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                  {[['days_present','Days Present','#16a34a'],['days_absent','Days Absent','#dc2626'],['total_school_days','Total Days','#2563eb']].map(([k,l,c])=>(
                    <div key={k} style={{background:'#F9FAFB',borderRadius:10,padding:'10px 12px',border:'1.5px solid #e5e7eb'}}>
                      <label style={{fontSize:10,color:c,fontWeight:800,display:'block',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>{l}</label>
                      <input style={{...inp,textAlign:'center',fontWeight:800,fontSize:18,background:'#fff',color:c}} type="number" value={attend[k]} onChange={e=>setAttend(a=>({...a,[k]:e.target.value}))} placeholder="0" min={0}/>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={{fontSize:13,fontWeight:800,color:'#374151',display:'block',marginBottom:12}}>🌟 Conduct / Behaviour</label>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {Object.keys(conduct).map(k=>(
                    <div key={k} style={{display:'flex',alignItems:'center',gap:12,background:'#F9FAFB',borderRadius:10,padding:'10px 14px',border:'1.5px solid #e5e7eb'}}>
                      <span style={{fontSize:13,color:'#374151',width:110,flexShrink:0,textTransform:'capitalize',fontWeight:600}}>{k}</span>
                      <select style={{...sel,flex:1,margin:0}} value={conduct[k]} onChange={e=>setConduct(c=>({...c,[k]:e.target.value}))}>
                        <option value="">— Select —</option>
                        {CONDUCT_OPTIONS.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button onClick={()=>setStep(2)} style={{flex:1,padding:12,background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:12,color:'#374151',fontWeight:700,cursor:'pointer'}}>← Back</button>
                <button onClick={()=>setStep(4)} style={{flex:2,padding:12,background:'linear-gradient(135deg,#9B1826,#C02035)',border:'none',borderRadius:12,color:'#fff',fontWeight:800,cursor:'pointer'}}>Next: Comments →</button>
              </div>
            </div>
          )}

          {/* STEP 4: Comments */}
          {step===4 && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:800,color:'#374151',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.06em'}}>✏️ Class Teacher Comment</label>
                <textarea style={{...inp,resize:'vertical',minHeight:100,lineHeight:1.6,fontFamily:'inherit'}} value={tcComment} onChange={e=>setTcComment(e.target.value)} placeholder="e.g. A hardworking student who shows great potential. Keep it up!"/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:800,color:'#374151',display:'block',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.06em'}}>🏫 Head Teacher Comment</label>
                <textarea style={{...inp,resize:'vertical',minHeight:100,lineHeight:1.6,fontFamily:'inherit'}} value={htComment} onChange={e=>setHtComment(e.target.value)} placeholder="e.g. We are proud of your academic achievements this term. Keep working hard!"/>
              </div>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button onClick={()=>setStep(3)} style={{flex:1,padding:12,background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:12,color:'#374151',fontWeight:700,cursor:'pointer'}}>← Back</button>
                <button onClick={()=>setStep(5)} style={{flex:2,padding:12,background:'linear-gradient(135deg,#9B1826,#C02035)',border:'none',borderRadius:12,color:'#fff',fontWeight:800,cursor:'pointer'}}>Next: Review & Publish →</button>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Publish */}
          {step===5 && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {/* Summary */}
              <div style={{background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)',border:'1.5px solid #16a34a',borderRadius:14,padding:18}}>
                <h3 style={{margin:'0 0 12px',color:'#15803d',fontSize:16,fontWeight:800}}>✅ Report Ready to Save</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13,color:'#166534'}}>
                  <div><strong>Student:</strong> {selChild?.name||'—'}</div>
                  <div><strong>Grade:</strong> {GRADE_LABELS[grade]}</div>
                  <div><strong>Term:</strong> Term {term} {year}</div>
                  <div><strong>Subjects:</strong> {subjects.length}</div>
                  <div><strong>Position:</strong> {position||'—'}/{totalPup||'—'}</div>
                  <div><strong>Status:</strong> {promoted?'Promoted':'Not Promoted'}</div>
                </div>
              </div>
              {/* Publish toggle */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',background:'#FFF7ED',border:'2px solid #FB923C',borderRadius:14}}>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:'#9a3412'}}>🚀 Publish to Parent Now</div>
                  <div style={{fontSize:13,color:'#c2410c',marginTop:2}}>Parent will see this report immediately via real-time notification</div>
                </div>
                <div onClick={()=>setPublish(p=>!p)} style={{width:56,height:30,borderRadius:15,background:publish?'#9B1826':'#d1d5db',position:'relative',cursor:'pointer',transition:'background .2s',flexShrink:0}}>
                  <div style={{position:'absolute',top:5,left:publish?28:5,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 4px rgba(0,0,0,0.25)'}}/>
                </div>
              </div>
              {!publish && <div style={{background:'#FEF3C7',border:'1px solid #D97706',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#92400E'}}>💡 Saved as draft — parent won't see it until you click Publish.</div>}
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setStep(4)} style={{flex:1,padding:14,background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:12,color:'#374151',fontWeight:700,cursor:'pointer'}}>← Back</button>
                <button onClick={save} disabled={saving} style={{flex:2,padding:14,background:saving?'#e5e7eb':'linear-gradient(135deg,#9B1826,#C02035)',border:'none',borderRadius:12,color:saving?'#9ca3af':'#fff',fontWeight:800,fontSize:15,cursor:saving?'default':'pointer',boxShadow:saving?'none':'0 4px 14px rgba(155,24,38,0.35)',transition:'all .2s'}}>
                  {saving?'⏳ Saving...' : publish?'🚀 Save & Publish to Parent':'💾 Save as Draft'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function ZambianReportBook({ isAdmin, socket }) {
  const [children,    setChildren]    = useState([]);
  const [selChild,    setSelChild]    = useState(null);
  const [reportCards, setReportCards] = useState([]);
  const [fileResults, setFileResults] = useState([]);
  const [selCard,     setSelCard]     = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [payments,    setPayments]    = useState([]);
  const fileRef = useRef(null);

  // ── Load children correctly for admin vs parent
  const loadChildren = useCallback(async () => {
    try {
      if (isAdmin) {
        // Admin: fetch ALL children directly
        const r = await api.get('/children');
        setChildren(r.data.children || []);
      } else {
        // Parent: fetch their own children
        const r = await api.get('/children');
        setChildren(r.data.children || []);
      }
    } catch(e) { console.error('loadChildren:', e); toast.error('Failed to load students'); }
  },[isAdmin]);

  const loadResults = useCallback(async(childId) => {
    if(!childId) return;
    setLoading(true);
    try {
      const [rc, fr] = await Promise.all([
        api.get(`/report-cards/child/${childId}`),
        api.get(`/results/child/${childId}`).catch(()=>({data:{results:[]}})),
      ]);
      setReportCards(rc.data.reportCards || []);
      setFileResults(fr.data.results || []);
      if(!isAdmin){
        const py = await api.get('/payments/my');
        setPayments(py.data.payments || []);
      }
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  },[isAdmin]);

  useEffect(()=>{ loadChildren(); },[loadChildren]);

  useEffect(()=>{
    if(!socket) return;
    const onResult  = ()=>{ if(selChild) loadResults(selChild._id); toast.success('📋 New result!'); };
    const onPublish = ()=>{ if(selChild) loadResults(selChild._id); toast.success('📋 Report published!'); };
    socket.on('new_result', onResult);
    socket.on('report_published', onPublish);
    return()=>{ socket.off('new_result',onResult); socket.off('report_published',onPublish); };
  },[socket,selChild,loadResults]);

  const hasAccess = useCallback((term,year)=>{
    if(isAdmin) return true;
    return payments.some(p=>p.paymentType==='test_fee'&&p.status==='approved'&&!p.isExpired&&+p.termNumber===+term&&+p.termYear===+year);
  },[payments,isAdmin]);

  const uploadFile = async(file)=>{
    if(!file||!selChild) return;
    if(file.size>10*1024*1024){ toast.error('Max 10MB'); return; }
    setUploading(true);
    const tid = toast.loading('Uploading file...');
    try{
      const b64 = await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(file);});
      const up = await api.post('/media/upload',{mediaData:b64,mimeType:file.type,folder:'peace-mindset/results'});
      await api.post('/results',{childId:selChild._id,title:file.name.replace(/\.[^.]+$/,''),term:1,year:new Date().getFullYear(),fileUrl:up.data.url,filePublicId:up.data.publicId});
      toast.success('✅ File uploaded! Parent notified.',{id:tid});
      loadResults(selChild._id);
    }catch(e){ toast.error(e.response?.data?.error||'Upload failed',{id:tid}); }
    finally{ setUploading(false); }
  };

  const publishCard = async(id)=>{
    try{ await api.patch(`/report-cards/${id}/publish`); toast.success('✅ Published! Parent sees it now.'); loadResults(selChild._id); }
    catch{ toast.error('Publish failed'); }
  };

  const deleteCard = async(id)=>{
    if(!window.confirm('Delete this report card?')) return;
    try{ await api.delete(`/report-cards/${id}`); loadResults(selChild._id); toast.success('Deleted'); }
    catch{ toast.error('Delete failed'); }
  };

  /* ── RENDER ── */
  return (
    <div>
      {showCreate && isAdmin && (
        <AdminCreateReport
          children={children}
          onSaved={()=>{ setShowCreate(false); if(selChild) loadResults(selChild._id); }}
          onClose={()=>setShowCreate(false)}
        />
      )}
      {selCard && <ReportView card={selCard} child={selChild} onClose={()=>setSelCard(null)}/>}

      <div style={{padding:'16px 14px 80px',maxWidth:720,margin:'0 auto'}}>

        {/* Header */}
        <div style={{background:'linear-gradient(135deg,#6B0F1A,#9B1826)',borderRadius:16,padding:'18px 20px',marginBottom:20,boxShadow:'0 4px 16px rgba(155,24,38,0.3)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
            <div>
              <h2 style={{fontSize:22,fontWeight:900,color:'#fff',margin:0,display:'flex',alignItems:'center',gap:8}}>
                📋 {isAdmin?'Report Books':'My Results'}
              </h2>
              <p style={{color:'rgba(255,255,255,0.7)',fontSize:13,margin:'5px 0 0'}}>{isAdmin?'Create, manage and publish Zambian student report books':'View and download your academic report books'}</p>
            </div>
            {isAdmin && selChild && (
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button onClick={()=>fileRef.current?.click()} disabled={uploading} style={{padding:'10px 18px',background:'rgba(255,255,255,0.15)',border:'1.5px solid rgba(255,255,255,0.35)',borderRadius:20,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                  {uploading?'⏳ Uploading...':'📎 Upload PDF/Word'}
                </button>
                <button onClick={()=>setShowCreate(true)} style={{padding:'10px 18px',background:'#fff',border:'none',borderRadius:20,color:'#9B1826',fontSize:13,fontWeight:800,cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
                  + Create Report Book
                </button>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" style={{display:'none'}} onChange={e=>{ uploadFile(e.target.files[0]); e.target.value=''; }}/>
        </div>

        {/* Student selector */}
        <div style={{background:'var(--bg-card,#1F2937)',border:'1px solid var(--border,#374151)',borderRadius:14,padding:18,marginBottom:20}}>
          <label style={{fontSize:11,fontWeight:800,color:'var(--text-muted,#9ca3af)',display:'block',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.08em'}}>
            👦 {isAdmin?'Select Student':'Select Child'} ({children.length} {isAdmin?'students':'children'})
          </label>
          <select
            value={selChild?._id||''}
            onChange={e=>{ const c=children.find(x=>x._id===e.target.value); setSelChild(c||null); if(c) loadResults(c._id); }}
            style={{padding:'12px 14px',background:'var(--bg-elevated,#111827)',border:'1.5px solid var(--border,#374151)',borderRadius:10,color:'var(--text,#fff)',fontSize:15,fontWeight:600,outline:'none',width:'100%',cursor:'pointer'}}
          >
            <option value="">— {isAdmin?'Choose a student':'Choose your child'} —</option>
            {children.map(c=><option key={c._id} value={c._id}>{c.name}{c.grade?` — ${c.grade}`:''}</option>)}
          </select>
          {children.length===0 && !loading && (
            <div style={{marginTop:8,fontSize:12,color:'#f87171',background:'rgba(239,68,68,0.1)',padding:'8px 12px',borderRadius:8,border:'1px solid rgba(239,68,68,0.2)'}}>
              ⚠️ {isAdmin?'No students registered yet. Add students in Manage Children.':'No children registered. Ask admin to add your children.'}
            </div>
          )}
        </div>

        {!selChild ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-muted,#6b7280)'}}>
            <div style={{fontSize:64,marginBottom:16}}>📚</div>
            <div style={{fontSize:18,fontWeight:700,color:'var(--text,#fff)',marginBottom:8}}>Select a {isAdmin?'student':'child'} to view reports</div>
            <div style={{fontSize:13}}>Reports will appear here once selected</div>
            {isAdmin && children.length > 0 && (
              <button onClick={()=>{ const c=children[0]; setSelChild(c); loadResults(c._id); }} style={{marginTop:20,padding:'12px 28px',background:'linear-gradient(135deg,#9B1826,#C02035)',border:'none',borderRadius:20,color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer'}}>
                View {children[0]?.name}&apos;s Reports
              </button>
            )}
          </div>
        ) : loading ? (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'60px 20px'}}>
            <div style={{textAlign:'center'}}>
              <div className="spinner"/>
              <div style={{marginTop:12,fontSize:13,color:'var(--text-muted,#9ca3af)'}}>Loading reports...</div>
            </div>
          </div>
        ) : (
          <>
            {/* Digital Report Cards */}
            {reportCards.length > 0 && (
              <div style={{marginBottom:24}}>
                <div style={{fontSize:11,fontWeight:800,color:'var(--text-muted,#9ca3af)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                  <span>📋</span> Digital Report Books ({reportCards.length})
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {reportCards.map(card=>{
                    const access = hasAccess(card.term,card.year);
                    const avg = card.subjects?.length ? Math.round(card.subjects.reduce((s,x)=>s+(+x.total||0),0)/card.subjects.length) : 0;
                    const avgG = getZambianGrade(avg);
                    return (
                      <div key={card._id} style={{background:'var(--bg-card,#1F2937)',border:`2px solid ${card.isPublished?'rgba(155,24,38,0.5)':'rgba(255,255,255,0.08)'}`,borderRadius:14,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.15)'}}>
                        <div style={{background:card.isPublished?'linear-gradient(135deg,#9B1826,#C02035)':'rgba(255,255,255,0.04)',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div>
                            <div style={{fontSize:15,fontWeight:800,color:card.isPublished?'#fff':'var(--text,#fff)'}}>
                              {GRADE_LABELS[normalizeGrade(card.grade||selChild.grade)]||card.grade} · Term {card.term} · {card.year}
                            </div>
                            <div style={{fontSize:12,color:card.isPublished?'rgba(255,255,255,0.7)':'var(--text-muted,#9ca3af)',marginTop:2,display:'flex',gap:10,flexWrap:'wrap'}}>
                              <span>{card.isPublished?'✅ Published':'📝 Draft'}</span>
                              {card.subjects?.length>0 && <span>· {card.subjects.length} subjects</span>}
                              {card.position_in_class && <span>· Position {card.position_in_class}/{card.total_pupils||'?'}</span>}
                            </div>
                          </div>
                          {card.subjects?.length>0 && (
                            <div style={{textAlign:'center',background:'rgba(255,255,255,0.12)',borderRadius:10,padding:'6px 14px',flexShrink:0}}>
                              <div style={{fontSize:22,fontWeight:900,color:'#fff'}}>{avg}%</div>
                              {avgG && <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:700}}>{avgG.label}</div>}
                            </div>
                          )}
                        </div>
                        <div style={{padding:'14px 16px'}}>
                          {!isAdmin && !card.isPublished ? (
                            <div style={{textAlign:'center',padding:'20px 0',color:'var(--text-muted,#9ca3af)'}}>
                              <div style={{fontSize:36,marginBottom:6}}>⏳</div>
                              <div style={{fontSize:13}}>Report not yet published by admin</div>
                            </div>
                          ) : !isAdmin && !access ? (
                            <div style={{background:'rgba(239,68,68,0.08)',border:'1.5px solid rgba(239,68,68,0.2)',borderRadius:10,padding:'16px',textAlign:'center'}}>
                              <div style={{fontSize:32,marginBottom:6}}>🔒</div>
                              <div style={{fontSize:14,fontWeight:800,color:'#f87171',marginBottom:4}}>Test Fee Required</div>
                              <div style={{fontSize:12,color:'var(--text-muted,#9ca3af)'}}>Pay test fee for Term {card.term} {card.year} to unlock this report</div>
                            </div>
                          ) : (
                            <>
                              {card.subjects?.slice(0,4).map((s,i)=>{
                                const g = getZambianGrade(s.total);
                                return (
                                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                                    <span style={{fontSize:13,color:'var(--text,#e5e7eb)'}}>{s.name}</span>
                                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                                      <span style={{fontSize:13,fontWeight:700,color:'var(--text,#e5e7eb)'}}>{s.total||0}/100</span>
                                      {g && <GradeBadge total={s.total} small/>}
                                    </div>
                                  </div>
                                );
                              })}
                              {card.subjects?.length>4 && <div style={{fontSize:12,color:'var(--text-muted,#9ca3af)',textAlign:'center',paddingTop:6}}>+{card.subjects.length-4} more subjects</div>}
                              <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>
                                <button onClick={()=>setSelCard(card)} style={{flex:1,padding:'10px 0',background:'linear-gradient(135deg,#9B1826,#C02035)',border:'none',borderRadius:20,color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',boxShadow:'0 2px 8px rgba(155,24,38,0.3)'}}>
                                  👁 View Full Report
                                </button>
                                {isAdmin && !card.isPublished && (
                                  <button onClick={()=>publishCard(card._id)} style={{padding:'10px 16px',background:'#16a34a',border:'none',borderRadius:20,color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer'}}>🚀 Publish</button>
                                )}
                                {isAdmin && (
                                  <button onClick={()=>deleteCard(card._id)} style={{padding:'10px 14px',background:'rgba(239,68,68,0.1)',border:'1.5px solid rgba(239,68,68,0.3)',borderRadius:20,color:'#f87171',fontSize:13,cursor:'pointer'}}>🗑</button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Uploaded Files */}
            {fileResults.length > 0 && (
              <div style={{marginBottom:24}}>
                <div style={{fontSize:11,fontWeight:800,color:'var(--text-muted,#9ca3af)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>📎 Uploaded Files</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {fileResults.map(r=>(
                    <div key={r._id} style={{background:'var(--bg-card,#1F2937)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'14px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:'var(--text,#fff)',marginBottom:2}}>📄 {r.title}</div>
                        <div style={{fontSize:12,color:'var(--text-muted,#9ca3af)'}}>Term {r.term} · {r.year}</div>
                      </div>
                      {r.isLocked && !isAdmin
                        ? <span style={{fontSize:12,color:'#f87171',background:'rgba(239,68,68,0.1)',padding:'6px 12px',borderRadius:20,border:'1px solid rgba(239,68,68,0.2)',fontWeight:700}}>🔒 Locked</span>
                        : r.fileUrl
                          ? <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" style={{padding:'8px 18px',background:'linear-gradient(135deg,#9B1826,#C02035)',border:'none',borderRadius:20,color:'#fff',fontSize:13,fontWeight:700,textDecoration:'none'}}>⬇ Download</a>
                          : null
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {reportCards.length===0 && fileResults.length===0 && (
              <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-muted,#9ca3af)'}}>
                <div style={{fontSize:52,marginBottom:12}}>📋</div>
                <div style={{fontSize:16,fontWeight:700,color:'var(--text,#fff)',marginBottom:8}}>No reports yet for {selChild.name}</div>
                {isAdmin
                  ? <><div style={{fontSize:13,marginBottom:16}}>Create a digital report book or upload a PDF file</div>
                      <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                        <button onClick={()=>setShowCreate(true)} style={{padding:'12px 24px',background:'linear-gradient(135deg,#9B1826,#C02035)',border:'none',borderRadius:20,color:'#fff',fontWeight:800,cursor:'pointer'}}>+ Create Report Book</button>
                        <button onClick={()=>fileRef.current?.click()} style={{padding:'12px 24px',background:'var(--bg-elevated,#111)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:20,color:'var(--text,#fff)',fontWeight:700,cursor:'pointer'}}>📎 Upload PDF</button>
                      </div></>
                  : <div style={{fontSize:13}}>Results appear here once your admin publishes them</div>
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
