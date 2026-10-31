/**
 * js/waterLogic.js
 * Pure domain logic and calculations for AquaPulse Water Intake Tracker.
 * Zero DOM or storage side-effects — 100% unit-testable in Node.js and Browser.
 */

export const DEFAULT_DAILY_GOAL_ML = 2500;
export const MIN_DAILY_GOAL_ML = 500;
export const MAX_DAILY_GOAL_ML = 10000;
export const MIN_ENTRY_ML = 1;
export const MAX_ENTRY_ML = 5000;

export const VESSEL_PRESETS = [
  { id: 'cup_150', amountMl: 150, vesselLabel: 'Small Cup', beverageType: 'water', shortTag: '+150 ml' },
  { id: 'glass_250', amountMl: 250, vesselLabel: 'Glass', beverageType: 'water', shortTag: '+250 ml' },
  { id: 'bottle_500', amountMl: 500, vesselLabel: 'Bottle', beverageType: 'water', shortTag: '+500 ml' },
  { id: 'flask_750', amountMl: 750, vesselLabel: 'Sports Flask', beverageType: 'water', shortTag: '+750 ml' }
];

export const BEVERAGE_TYPES = {
  water: { label: 'Pure Water', badgeClass: 'bev-water' },
  sparkling: { label: 'Sparkling Water', badgeClass: 'bev-sparkling' },
  electrolyte: { label: 'Electrolyte Mix', badgeClass: 'bev-electrolyte' },
  tea: { label: 'Herbal Tea', badgeClass: 'bev-tea' },
  coconut: { label: 'Coconut Water', badgeClass: 'bev-coconut' }
};

/**
 * Escapes HTML special characters to prevent XSS injection.
 * @param {string} unsafe
 * @returns {string}
 */
export function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a milliliter value with locale-friendly comma separators.
 * @param {number} ml
 * @returns {string}
 */
export function formatVolume(ml) {
  const num = Math.round(Number(ml) || 0);
  return `${num.toLocaleString('en-US')} ml`;
}

/**
 * Returns local date string in YYYY-MM-DD format.
 * @param {Date} [dateObj]
 * @returns {string}
 */
export function getLocalDateString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns local 24h time string in HH:MM format.
 * @param {Date} [dateObj]
 * @returns {string}
 */
export function getLocalTimeString(dateObj = new Date()) {
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Validates and sanitizes a hydration entry payload.
 * @param {object} input
 * @returns {{ valid: boolean, error?: string, entry?: object }}
 */
export function validateHydrationInput(input = {}) {
  const rawAmount = Number(input.amountMl);
  if (!Number.isFinite(rawAmount) || Math.round(rawAmount) < MIN_ENTRY_ML || Math.round(rawAmount) > MAX_ENTRY_ML) {
    return {
      valid: false,
      error: `Volume must be between ${MIN_ENTRY_ML} ml and ${MAX_ENTRY_ML} ml.`
    };
  }

  const amountMl = Math.round(rawAmount);
  const bevKey = input.beverageType && BEVERAGE_TYPES[input.beverageType] ? input.beverageType : 'water';
  const dateStr = typeof input.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date.trim())
    ? input.date.trim()
    : getLocalDateString();
  const timeStr = typeof input.time === 'string' && /^\d{2}:\d{2}$/.test(input.time.trim())
    ? input.time.trim()
    : getLocalTimeString();

  const vesselLabel = typeof input.vesselLabel === 'string' && input.vesselLabel.trim()
    ? input.vesselLabel.trim().slice(0, 40)
    : 'Custom';
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 120) : '';
  const createdAt = Number.isFinite(Number(input.createdAt)) ? Number(input.createdAt) : Date.now();
  const id = typeof input.id === 'string' && input.id.trim()
    ? input.id.trim()
    : `wt_${createdAt}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    valid: true,
    entry: {
      id,
      amountMl,
      beverageType: bevKey,
      vesselLabel,
      date: dateStr,
      time: timeStr,
      note,
      createdAt
    }
  };
}

/**
 * Validates daily goal input in milliliters.
 * @param {number|string} goalInput
 * @returns {{ valid: boolean, error?: string, dailyGoalMl?: number }}
 */
export function validateDailyGoal(goalInput) {
  const num = Number(goalInput);
  if (!Number.isFinite(num) || Math.round(num) < MIN_DAILY_GOAL_ML || Math.round(num) > MAX_DAILY_GOAL_ML) {
    return {
      valid: false,
      error: `Daily goal must be between ${MIN_DAILY_GOAL_ML} ml and ${MAX_DAILY_GOAL_ML} ml.`
    };
  }
  return {
    valid: true,
    dailyGoalMl: Math.round(num)
  };
}

/**
 * Sorts hydration entries newest first by date, time, and createdAt.
 * @param {Array} entries
 * @returns {Array}
 */
export function sortEntriesNewestFirst(entries = []) {
  return [...entries].sort((a, b) => {
    const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
    if (dateCmp !== 0) return dateCmp;
    const timeCmp = String(b.time || '').localeCompare(String(a.time || ''));
    if (timeCmp !== 0) return timeCmp;
    return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
  });
}

/**
 * Calculates daily progress metrics for a target YYYY-MM-DD date.
 * @param {Array} entries
 * @param {string} targetDate
 * @param {number} [dailyGoalMl]
 */
export function calculateDailySummary(entries = [], targetDate = getLocalDateString(), dailyGoalMl = DEFAULT_DAILY_GOAL_ML) {
  const goalMl = Math.max(MIN_DAILY_GOAL_ML, Number(dailyGoalMl) || DEFAULT_DAILY_GOAL_ML);
  const entriesForDate = sortEntriesNewestFirst(
    entries.filter(e => e && e.date === targetDate)
  );

  const totalMl = entriesForDate.reduce((sum, item) => sum + (Number(item.amountMl) || 0), 0);
  const rawPercentage = Math.round((totalMl / goalMl) * 100);
  const clampedPercentage = Math.min(100, Math.max(0, rawPercentage));
  const remainingMl = Math.max(0, goalMl - totalMl);
  const isGoalMet = totalMl >= goalMl;

  return {
    date: targetDate,
    totalMl,
    goalMl,
    rawPercentage,
    clampedPercentage,
    remainingMl,
    isGoalMet,
    entryCount: entriesForDate.length,
    entriesForDate
  };
}

/**
 * Shifts a YYYY-MM-DD date string by deltaDays.
 * @param {string} dateStr
 * @param {number} deltaDays
 * @returns {string}
 */
export function shiftDateString(dateStr, deltaDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates current hydration streak (consecutive days meeting dailyGoalMl).
 * If today meets the goal, counts backwards from today; otherwise counts backwards from yesterday.
 * @param {Array} entries
 * @param {number} dailyGoalMl
 * @param {string} [referenceDate]
 * @returns {number}
 */
export function calculateHydrationStreak(entries = [], dailyGoalMl = DEFAULT_DAILY_GOAL_ML, referenceDate = getLocalDateString()) {
  const goalMl = Math.max(MIN_DAILY_GOAL_ML, Number(dailyGoalMl) || DEFAULT_DAILY_GOAL_ML);
  const totalsByDate = new Map();

  for (const e of entries) {
    if (!e || !e.date) continue;
    const prev = totalsByDate.get(e.date) || 0;
    totalsByDate.set(e.date, prev + (Number(e.amountMl) || 0));
  }

  let cursor = referenceDate;
  if ((totalsByDate.get(cursor) || 0) < goalMl) {
    cursor = shiftDateString(referenceDate, -1);
  }

  let streak = 0;
  while ((totalsByDate.get(cursor) || 0) >= goalMl) {
    streak += 1;
    cursor = shiftDateString(cursor, -1);
  }
  return streak;
}

/**
 * Filters hydration entries by date range, specific date, beverage type, and search query.
 * @param {Array} entries
 * @param {object} options
 * @returns {Array}
 */
export function filterHydrationEntries(entries = [], {
  rangeType = 'all',
  referenceDate = getLocalDateString(),
  customDate = '',
  beverageType = 'all',
  searchQuery = ''
} = {}) {
  const query = (searchQuery || '').toLowerCase().trim();
  const sorted = sortEntriesNewestFirst(entries);

  let minDate = null;
  let maxDate = null;

  if (rangeType === 'today') {
    minDate = referenceDate;
    maxDate = referenceDate;
  } else if (rangeType === '7days') {
    minDate = shiftDateString(referenceDate, -6);
    maxDate = referenceDate;
  } else if (rangeType === 'month') {
    minDate = `${referenceDate.slice(0, 7)}-01`;
    maxDate = referenceDate;
  } else if (rangeType === 'custom' && customDate) {
    minDate = customDate;
    maxDate = customDate;
  }

  return sorted.filter(entry => {
    if (!entry || !entry.date) return false;
    if (minDate && entry.date < minDate) return false;
    if (maxDate && entry.date > maxDate) return false;
    if (beverageType && beverageType !== 'all' && entry.beverageType !== beverageType) return false;

    if (query) {
      const bevLabel = (BEVERAGE_TYPES[entry.beverageType]?.label || entry.beverageType || '').toLowerCase();
      const vessel = (entry.vesselLabel || '').toLowerCase();
      const note = (entry.note || '').toLowerCase();
      const dateMatch = entry.date.includes(query) || (entry.time && entry.time.includes(query));
      const amountMatch = String(entry.amountMl).includes(query);
      if (!bevLabel.includes(query) && !vessel.includes(query) && !note.includes(query) && !dateMatch && !amountMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Aggregates hydration entries by date (YYYY-MM-DD) for the per-day summary table.
 * @param {Array} entries
 * @param {number} [dailyGoalMl]
 * @returns {Array}
 */
export function aggregateByDay(entries = [], dailyGoalMl = DEFAULT_DAILY_GOAL_ML) {
  const goalMl = Math.max(MIN_DAILY_GOAL_ML, Number(dailyGoalMl) || DEFAULT_DAILY_GOAL_ML);
  const map = new Map();

  for (const e of entries) {
    if (!e || !e.date) continue;
    if (!map.has(e.date)) {
      map.set(e.date, {
        date: e.date,
        totalMl: 0,
        entryCount: 0,
        entries: []
      });
    }
    const bucket = map.get(e.date);
    bucket.totalMl += Number(e.amountMl) || 0;
    bucket.entryCount += 1;
    bucket.entries.push(e);
  }

  return Array.from(map.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(day => {
      const percentage = Math.round((day.totalMl / goalMl) * 100);
      return {
        ...day,
        goalMl,
        percentage,
        isGoalMet: day.totalMl >= goalMl
      };
    });
}

/**
 * Computes the 7-day hydration trend ending on referenceDate (oldest to newest).
 * @param {Array} entries
 * @param {number} [dailyGoalMl]
 * @param {string} [referenceDate]
 * @returns {Array}
 */
export function computeLast7DaysTrend(entries = [], dailyGoalMl = DEFAULT_DAILY_GOAL_ML, referenceDate = getLocalDateString()) {
  const goalMl = Math.max(MIN_DAILY_GOAL_ML, Number(dailyGoalMl) || DEFAULT_DAILY_GOAL_ML);
  const totalsByDate = new Map();

  for (const e of entries) {
    if (!e || !e.date) continue;
    totalsByDate.set(e.date, (totalsByDate.get(e.date) || 0) + (Number(e.amountMl) || 0));
  }

  const days = [];
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let offset = -6; offset <= 0; offset++) {
    const dateStr = shiftDateString(referenceDate, offset);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const dayName = offset === 0 ? 'Today' : weekdayNames[dt.getUTCDay()];
    const totalMl = totalsByDate.get(dateStr) || 0;
    const percentage = Math.round((totalMl / goalMl) * 100);

    days.push({
      date: dateStr,
      shortLabel: dayName,
      dayNumber: String(d).padStart(2, '0'),
      totalMl,
      goalMl,
      percentage,
      barHeightPercent: Math.min(100, Math.max(totalMl > 0 ? 8 : 0, percentage)),
      isGoalMet: totalMl >= goalMl
    });
  }

  return days;
}

/**
 * Creates a standardized JSON backup envelope for export.
 * @param {Array} entries
 * @param {object} settings
 * @returns {string}
 */
export function createBackupEnvelope(entries = [], settings = { dailyGoalMl: DEFAULT_DAILY_GOAL_ML }) {
  const cleanEntries = sortEntriesNewestFirst(entries);
  const envelope = {
    app: 'AquaPulse-WaterIntakeTracker',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    recordCount: cleanEntries.length,
    data: {
      entries: cleanEntries,
      settings: {
        dailyGoalMl: Number(settings?.dailyGoalMl) || DEFAULT_DAILY_GOAL_ML,
        unit: 'ml'
      }
    }
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Validates a backup JSON string before restoring.
 * @param {string} jsonString
 * @returns {{ valid: boolean, error?: string, entries?: Array, settings?: object }}
 */
export function validateBackupEnvelope(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Backup file must contain a valid JSON object.' };
    }
    if (parsed.app !== 'AquaPulse-WaterIntakeTracker') {
      return { valid: false, error: 'Invalid backup header: not an AquaPulse Water Intake backup file.' };
    }
    if (!parsed.data || !Array.isArray(parsed.data.entries)) {
      return { valid: false, error: 'Backup payload is missing the entries array.' };
    }

    const validEntries = [];
    for (const raw of parsed.data.entries) {
      const check = validateHydrationInput(raw);
      if (check.valid) {
        validEntries.push(check.entry);
      }
    }

    const goalCheck = validateDailyGoal(parsed.data.settings?.dailyGoalMl ?? DEFAULT_DAILY_GOAL_ML);
    const dailyGoalMl = goalCheck.valid ? goalCheck.dailyGoalMl : DEFAULT_DAILY_GOAL_ML;

    return {
      valid: true,
      entries: validEntries,
      settings: {
        dailyGoalMl,
        unit: 'ml'
      }
    };
  } catch {
    return { valid: false, error: 'Malformed JSON file.' };
  }
}
