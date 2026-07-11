'use strict';

const { dayNamesLong } = require('./i18n');

// Weekly hourly-schedule model: 7 day columns, time/section rows.
// Week starts on Monday (change WEEK_START to 0 for Sunday).
const WEEK_START = 1;

// "Morning / Afternoon / Evening / Night" isn't cleanly exposed by Intl, so these
// four words are translated here (curated), with an English fallback for others.
const DAYPARTS = {
  en: ['Morning', 'Afternoon', 'Evening', 'Night'],
  fr: ['Matin', 'Après-midi', 'Soir', 'Nuit'],
  es: ['Mañana', 'Tarde', 'Noche', 'Madrugada'],
  de: ['Morgen', 'Nachmittag', 'Abend', 'Nacht'],
  it: ['Mattina', 'Pomeriggio', 'Sera', 'Notte'],
  pt: ['Manhã', 'Tarde', 'Noite', 'Madrugada'],
  nl: ['Ochtend', 'Middag', 'Avond', 'Nacht'],
  ru: ['Утро', 'День', 'Вечер', 'Ночь'],
  uk: ['Ранок', 'День', 'Вечір', 'Ніч'],
  pl: ['Rano', 'Popołudnie', 'Wieczór', 'Noc'],
  cs: ['Ráno', 'Odpoledne', 'Večer', 'Noc'],
  ro: ['Dimineață', 'După-amiază', 'Seară', 'Noapte'],
  hu: ['Reggel', 'Délután', 'Este', 'Éjszaka'],
  el: ['Πρωί', 'Απόγευμα', 'Βράδυ', 'Νύχτα'],
  sv: ['Morgon', 'Eftermiddag', 'Kväll', 'Natt'],
  da: ['Morgen', 'Eftermiddag', 'Aften', 'Nat'],
  no: ['Morgen', 'Ettermiddag', 'Kveld', 'Natt'],
  fi: ['Aamu', 'Iltapäivä', 'Ilta', 'Yö'],
  tr: ['Sabah', 'Öğleden sonra', 'Akşam', 'Gece'],
  ar: ['صباح', 'بعد الظهر', 'مساء', 'ليل'],
  he: ['בוקר', 'צהריים', 'ערב', 'לילה'],
  fa: ['صبح', 'بعد از ظهر', 'عصر', 'شب'],
  hi: ['सुबह', 'दोपहर', 'शाम', 'रात'],
  bn: ['সকাল', 'দুপুর', 'সন্ধ্যা', 'রাত'],
  zh: ['上午', '下午', '傍晚', '夜晚'],
  'zh-Hant': ['上午', '下午', '傍晚', '夜晚'],
  ja: ['朝', '昼', '夕方', '夜'],
  ko: ['아침', '오후', '저녁', '밤'],
  th: ['เช้า', 'บ่าย', 'เย็น', 'กลางคืน'],
  vi: ['Sáng', 'Chiều', 'Tối', 'Đêm'],
  id: ['Pagi', 'Siang', 'Sore', 'Malam'],
  ms: ['Pagi', 'Tengah hari', 'Petang', 'Malam'],
  sw: ['Asubuhi', 'Mchana', 'Jioni', 'Usiku'],
};
const DAYPART_ORDER = ['morning', 'afternoon', 'evening', 'night'];
const DEFAULT_ROWS = 4; // untitled rows for a day-part with no time range set

function daypartLabels(locale) {
  return DAYPARTS[locale] || DAYPARTS[locale.split('-')[0]] || DAYPARTS.en;
}

function orderedDayNames(locale) {
  const names = dayNamesLong(locale); // 0=Sunday .. 6=Saturday
  return Array.from({ length: 7 }, (_, i) => names[(WEEK_START + i) % 7]);
}

// Localized dates for the 7 columns, starting from the given Monday (any year).
// Returns 7 empty strings when no start date is set.
function weekDates(startISO, locale) {
  if (!startISO) return Array(7).fill('');
  const [y, mo, d] = startISO.split('-').map(Number);
  const base = new Date(Date.UTC(2000, mo - 1, d));
  base.setUTCFullYear(y); // avoid the 2-digit-year remap for any year
  const fmt = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', dateStyle: 'long' });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(base.getTime() + i * 86400000)));
}

function formatTime(minutes, format, locale) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC', hour: '2-digit', minute: '2-digit',
    hourCycle: format === '12h' ? 'h12' : 'h23',
  }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
}

// Rows for a day-part range { startMin, endMin } in minutes (may wrap past
// midnight): one per hour of its duration. Unset → the default block.
function rangeHours(range) {
  if (!range) return DEFAULT_ROWS;
  let mins = range.endMin - range.startMin;
  if (mins <= 0) mins += 24 * 60;
  return Math.max(1, Math.round(mins / 60));
}

// Build the grid: { dayHeaders: [7], rows: [{ label, kind }] }.
// kind: 'time' (labeled), 'section' (day-part divider), 'blank' (untitled).
function buildScheduleGrid(config, locale) {
  const names = orderedDayNames(locale);
  const dates = weekDates(config.startDate, locale);
  const dayHeaders = names.map((name, i) => ({ name, date: dates[i] }));
  const rows = [];

  if (config.labelMode === 'time') {
    const step = config.step; // minutes
    for (let t = 0; t < 24 * 60; t += step) {
      rows.push({ label: formatTime(t, config.format, locale), kind: 'time' });
    }
  } else {
    const names = daypartLabels(locale);
    DAYPART_ORDER.forEach((key, i) => {
      rows.push({ label: names[i], kind: 'section' });
      const count = rangeHours(config.dayparts && config.dayparts[key]);
      for (let r = 0; r < count; r++) rows.push({ label: '', kind: 'blank' });
    });
  }

  return { dayHeaders, rows };
}

module.exports = { buildScheduleGrid, DAYPART_ORDER, daypartLabels };
