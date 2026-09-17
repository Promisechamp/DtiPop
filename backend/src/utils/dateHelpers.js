// ============================================================
// DATE PARSING
// ============================================================

/**
 * Parse a date string safely.
 * For date-only strings (YYYY-MM-DD), create a local date.
 * This avoids timezone shifting.
 */
export const parseDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

// ============================================================
// FREQUENCY PARSING
// ============================================================

/**
 * Parse a frequency string into number of days.
 * Supports:
 * - 'daily' → 1
 * - 'weekly' → 7
 * - 'biweekly' → 14
 * - 'monthly' → 30 (approx)
 * - 'yearly' → 365
 * - 'every 2 weeks' → 14
 * - 'every 3 months' → 90
 * - 'every 6 months' → 180
 * - 'every year' → 365
 * - Any numeric like '30 days', '2 weeks', '3 months', '1 year'
 * - Also handles 'every X days/weeks/months/years'
 * 
 * Returns null if unable to parse.
 */
export const parseFrequencyToDays = (frequency) => {
  if (!frequency) return null;
  const lower = frequency.toLowerCase().trim();

  // Common keywords
  if (lower === 'daily') return 1;
  if (lower === 'weekly') return 7;
  if (lower === 'biweekly') return 14;
  if (lower === 'monthly') return 30;
  if (lower === 'yearly' || lower === 'annual') return 365;

  // Try to match "every X unit"
  const match = lower.match(/every\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('day')) return num;
    if (unit.startsWith('week')) return num * 7;
    if (unit.startsWith('month')) return num * 30;
    if (unit.startsWith('year')) return num * 365;
  }

  // Try numeric only: "30", "7" etc - assume days
  const numOnly = parseInt(lower, 10);
  if (!isNaN(numOnly) && numOnly > 0) return numOnly;

  return null;
};

/**
 * Calculate the next due date given a start date (YYYY-MM-DD) and frequency in days.
 * Returns date string in YYYY-MM-DD.
 */
export const calculateNextDueDate = (startDate, days) => {
  if (!startDate || !days) return null;
  const date = new Date(startDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// ============================================================
// WARRANTY HELPERS
// ============================================================

/**
 * Calculate warranty end date from start date and duration in months.
 * Returns YYYY-MM-DD.
 */
export const calculateWarrantyEnd = (startDate, months) => {
  if (!startDate || !months) return null;

  const date = parseDate(startDate);
  if (!date || Number.isNaN(date.getTime())) return null;

  date.setMonth(date.getMonth() + Number(months));

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Get warranty status:
 * - 'expired'
 * - 'expiring' (≤30 days)
 * - 'active'
 */
export const getWarrantyStatus = (endDate) => {
  const end = parseDate(endDate);
  if (!end) return 'expired';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < today) return 'expired';

  const daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 30) return 'expiring';
  return 'active';
};

/**
 * Get days remaining until warranty end.
 * Returns 0 if expired or no date.
 */
export const getDaysRemaining = (endDate) => {
  const end = parseDate(endDate);
  if (!end) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < today) return 0;

  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
};

// ============================================================
// DATE COMPARISON HELPERS
// ============================================================

/**
 * Check if a given date is overdue (today > date)
 */
export const isOverdue = (dateString) => {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

/**
 * Get days between two dates (end - start), returns integer.
 */
export const daysBetween = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e - s;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  parseDate,
  parseFrequencyToDays,
  calculateNextDueDate,
  calculateWarrantyEnd,
  getWarrantyStatus,
  getDaysRemaining,
  isOverdue,
  daysBetween,
};