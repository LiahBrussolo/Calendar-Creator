'use strict';

// Pure proleptic-Gregorian date math. No JS Date — works for any integer year.

function isLeap(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function daysInMonth(year, month0) {
  return month0 === 1 && isLeap(year) ? 29 : MONTH_LENGTHS[month0];
}

// Sakamoto's algorithm. month1 is 1-12. Returns 0=Sunday .. 6=Saturday.
function dayOfWeek(year, month1, day) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  if (month1 < 3) y -= 1;
  return ((y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month1 - 1] + day) % 7 + 7) % 7;
}

function isWeekend(dow) {
  return dow === 0 || dow === 6; // Sunday or Saturday
}

const pad2 = (n) => String(n).padStart(2, '0');
const pad4 = (n) => String(Math.abs(n)).padStart(4, '0');
const iso = (p) => `${pad4(p.year)}-${pad2(p.month0 + 1)}-${pad2(p.day)}`;

// Build one month's active days between dStart..dEnd (inclusive).
function buildMonth(year, month0, dStart, dEnd) {
  const days = [];
  for (let d = dStart; d <= dEnd; d++) {
    const dow = dayOfWeek(year, month0 + 1, d);
    days.push({ day: d, dow, weekend: isWeekend(dow) });
  }
  return {
    year,
    month0,
    days,
    firstDow: dayOfWeek(year, month0 + 1, 1),
    total: daysInMonth(year, month0),
    full: dStart === 1 && dEnd === daysInMonth(year, month0),
  };
}

// Whole-year plan: 12 months, every day.
function planYear(year) {
  const months = [];
  for (let m = 0; m < 12; m++) months.push(buildMonth(year, m, 1, daysInMonth(year, m)));
  return { mode: 'year', year, label: String(year), fileLabel: String(year), months };
}

// Range plan: start..end may span months and years. Partial months keep only selected days.
function planRange(start, end) {
  const sKey = start.year * 10000 + start.month0 * 100 + start.day;
  const eKey = end.year * 10000 + end.month0 * 100 + end.day;
  if (sKey > eKey) throw new Error('The start date must be on or before the end date.');

  const months = [];
  let y = start.year;
  let m = start.month0;
  while (y < end.year || (y === end.year && m <= end.month0)) {
    const dStart = y === start.year && m === start.month0 ? start.day : 1;
    const dEnd = y === end.year && m === end.month0 ? end.day : daysInMonth(y, m);
    months.push(buildMonth(y, m, dStart, dEnd));
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  const label = `${iso(start)} – ${iso(end)}`;
  const fileLabel = `${iso(start)} to ${iso(end)}`;
  return { mode: 'range', start, end, label, fileLabel, months };
}

module.exports = { isLeap, daysInMonth, dayOfWeek, isWeekend, planYear, planRange, iso };
