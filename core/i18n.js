'use strict';

// Localization via the platform's Intl/ICU data. Names depend only on the
// locale, never on the target year, so a fixed reference week/year is used.

const DAY_MS = 86400000;
const REF_SUNDAY = Date.UTC(2023, 0, 1); // 2023-01-01 is a Sunday
const REF_YEAR = 2023;

const fmt = (locale, opts) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...opts });

// index 0=Sunday .. 6=Saturday
function dayName(locale, index, style) {
  return fmt(locale, { weekday: style }).format(new Date(REF_SUNDAY + index * DAY_MS));
}

function monthNames(locale) {
  return Array.from({ length: 12 }, (_, m) =>
    fmt(locale, { month: 'long' }).format(new Date(Date.UTC(REF_YEAR, m, 1))));
}

function dayNamesLong(locale) {
  return Array.from({ length: 7 }, (_, i) => dayName(locale, i, 'long'));
}

function dayNamesNarrow(locale) {
  return Array.from({ length: 7 }, (_, i) => dayName(locale, i, 'narrow'));
}

function isRTL(locale) {
  const loc = new Intl.Locale(locale);
  const info = typeof loc.getTextInfo === 'function' ? loc.getTextInfo() : loc.textInfo;
  return Boolean(info) && info.direction === 'rtl';
}

module.exports = { monthNames, dayNamesLong, dayNamesNarrow, isRTL };
