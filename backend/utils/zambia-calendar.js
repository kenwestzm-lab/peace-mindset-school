// ═══════════════════════════════════════════════════════════════════════
// ZAMBIAN SCHOOL CALENDAR
// Based on Ministry of Education, Zambia official school calendar
// Three learning terms per year
// ═══════════════════════════════════════════════════════════════════════

const ZAMBIAN_TERMS = {
  2025: [
    { term: 1, name: "First Term",  open: "2025-01-27", close: "2025-04-04" },
    { term: 2, name: "Second Term", open: "2025-05-06", close: "2025-08-08" },
    { term: 3, name: "Third Term",  open: "2025-09-09", close: "2025-12-05" },
  ],
  2026: [
    { term: 1, name: "First Term",  open: "2026-01-26", close: "2026-04-03" },
    { term: 2, name: "Second Term", open: "2026-05-05", close: "2026-08-07" },
    { term: 3, name: "Third Term",  open: "2026-09-08", close: "2026-12-04" },
  ],
  2027: [
    { term: 1, name: "First Term",  open: "2027-02-01", close: "2027-04-09" },
    { term: 2, name: "Second Term", open: "2027-05-11", close: "2027-08-13" },
    { term: 3, name: "Third Term",  open: "2027-09-14", close: "2027-12-10" },
  ],
};

// Grace period after term closes before payment expires (days)
const GRACE_DAYS = 3;

// ── Get current term ───────────────────────────────────────────────────
const getCurrentTerm = (date = new Date()) => {
  const year = date.getFullYear();
  const terms = ZAMBIAN_TERMS[year] || ZAMBIAN_TERMS[2026];
  
  for (const t of terms) {
    const open = new Date(t.open);
    const close = new Date(t.close);
    // Add grace period to close date
    const expiry = new Date(close);
    expiry.setDate(expiry.getDate() + GRACE_DAYS);
    
    if (date >= open && date <= expiry) {
      return {
        ...t,
        year,
        openDate: open,
        closeDate: close,
        expiryDate: expiry,
        isActive: date <= close,
        inGracePeriod: date > close && date <= expiry,
        daysUntilExpiry: Math.ceil((expiry - date) / (1000 * 60 * 60 * 24)),
        daysUntilClose: Math.ceil((close - date) / (1000 * 60 * 60 * 24)),
      };
    }
  }
  
  // Between terms — find next upcoming term
  for (const t of terms) {
    const open = new Date(t.open);
    if (date < open) {
      return {
        ...t,
        year,
        openDate: open,
        closeDate: new Date(t.close),
        expiryDate: new Date(new Date(t.close).setDate(new Date(t.close).getDate() + GRACE_DAYS)),
        isActive: false,
        isBetweenTerms: true,
        daysUntilOpen: Math.ceil((open - date) / (1000 * 60 * 60 * 24)),
      };
    }
  }
  
  // End of year — return last term of next year
  const nextYear = year + 1;
  const nextTerms = ZAMBIAN_TERMS[nextYear];
  if (nextTerms) {
    const t = nextTerms[0];
    return {
      ...t,
      year: nextYear,
      openDate: new Date(t.open),
      closeDate: new Date(t.close),
      isActive: false,
      isBetweenTerms: true,
    };
  }
  
  return null;
};

// ── Get a specific term ────────────────────────────────────────────────
const getTerm = (year, term) => {
  const terms = ZAMBIAN_TERMS[year];
  if (!terms) return null;
  const t = terms.find(x => x.term === term);
  if (!t) return null;
  const close = new Date(t.close);
  const expiry = new Date(close);
  expiry.setDate(expiry.getDate() + GRACE_DAYS);
  return {
    ...t,
    year,
    openDate: new Date(t.open),
    closeDate: close,
    expiryDate: expiry,
    isActive: new Date() >= new Date(t.open) && new Date() <= expiry,
  };
};

// ── Calculate school fee payment expiry ───────────────────────────────
const getPaymentExpiry = (year, term, type = "termly") => {
  const t = getTerm(year, term);
  if (!t) return null;
  
  if (type === "termly") {
    // Expires 3 days after term closes
    return t.expiryDate;
  }
  
  if (type === "monthly") {
    // Expires at end of current calendar month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }
  
  return t.expiryDate;
};

// ── Get monthly breakdown for a term ──────────────────────────────────
const getTermMonths = (year, term) => {
  const t = getTerm(year, term);
  if (!t) return [];
  
  const months = [];
  const start = new Date(t.openDate);
  const end = new Date(t.closeDate);
  
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current <= end) {
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    months.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      monthName: current.toLocaleString('en-ZM', { month: 'long' }),
      startDate: new Date(Math.max(current, start)),
      endDate: new Date(Math.min(monthEnd, end)),
      expiryDate: new Date(new Date(Math.min(monthEnd, end)).setDate(new Date(Math.min(monthEnd, end)).getDate() + GRACE_DAYS)),
    });
    current.setMonth(current.getMonth() + 1);
  }
  return months;
};

// ── Check if a payment is still valid ─────────────────────────────────
const isPaymentValid = (payment) => {
  if (!payment || payment.status !== "approved") return false;
  if (payment.isExpired) return false;
  if (payment.expiresAt && new Date() > new Date(payment.expiresAt)) return false;
  return true;
};

// ── Get all available terms parent can pay for ────────────────────────
const getPayableTerms = (year = new Date().getFullYear()) => {
  const current = getCurrentTerm();
  const terms = [];
  
  for (const y of [year, year + 1]) {
    const yearTerms = ZAMBIAN_TERMS[y] || [];
    for (const t of yearTerms) {
      const expiry = new Date(new Date(t.close).setDate(new Date(t.close).getDate() + GRACE_DAYS));
      if (expiry >= new Date()) {
        terms.push({ ...t, year: y, expiryDate: expiry });
      }
    }
  }
  
  return terms.slice(0, 4); // Max 4 payable terms ahead
};

module.exports = {
  ZAMBIAN_TERMS,
  GRACE_DAYS,
  getCurrentTerm,
  getTerm,
  getPaymentExpiry,
  getTermMonths,
  isPaymentValid,
  getPayableTerms,
};
