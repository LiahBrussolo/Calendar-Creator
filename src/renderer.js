'use strict';

const $ = (id) => document.getElementById(id);
const state = { mode: 'year', locale: 'en', localeLabel: 'English' };

/* ---------- Theme ---------- */
const THEME_KEY = 'calendar.theme';
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}
$('theme').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
});

/* ---------- Input mode ---------- */
// The calendar output buttons carry different labels in the Year vs Date-range tabs.
const CAL_LABELS = {
  year: {
    'excel-view': ['Calendar View', 'One month per column'],
    'excel-list': ['List', 'All months in a single column view'],
    'pdf-year': ['Calendar', 'Full visual of the year on 1 page'],
    'pdf-month': ['Monthly View', 'One month per page'],
  },
  range: {
    'excel-view': ['Calendar View', 'One month per column'],
    'excel-list': ['List', 'Months in a single column view'],
    'pdf-year': ['Calendar View', '12 months / page, with numbered days'],
    'pdf-month': ['Monthly View', 'One month per page'],
  },
};
function applyCalendarLabels(mode) {
  const set = CAL_LABELS[mode];
  if (!set) return;
  for (const type of Object.keys(set)) {
    const btn = document.querySelector(`#calendar-outputs .dl[data-type="${type}"]`);
    if (!btn) continue;
    btn.querySelector('strong').textContent = set[type][0];
    btn.querySelector('em').textContent = set[type][1];
  }
}

$('mode').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  state.mode = btn.dataset.mode;
  document.querySelectorAll('#mode .seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
  $('year-pane').classList.toggle('hidden', state.mode !== 'year');
  $('range-pane').classList.toggle('hidden', state.mode !== 'range');
  $('schedule-pane').classList.toggle('hidden', state.mode !== 'schedule');
  $('calendar-outputs').classList.toggle('hidden', state.mode === 'schedule');
  $('schedule-outputs').classList.toggle('hidden', state.mode !== 'schedule');
  if (state.mode !== 'schedule') applyCalendarLabels(state.mode);
  $('year-err').textContent = '';
  $('range-err').textContent = '';
  $('sched-err').textContent = '';
  if (state.mode === 'range') updateRangeClear();
});
$('year').value = String(new Date().getFullYear());

/* ---------- Date range: custom pickers, linked, with a session clear ---------- */
const rangeClear = $('range-clear');

function updateRangeClear() {
  rangeClear.classList.toggle('hidden', !(fromPicker.getValue() || toPicker.getValue()));
}
const fromPicker = window.createDatePicker($('from-field'), {
  getMax: () => toPicker.getValue() || null, // From can't exceed To
  onChange: (v) => {
    if (v && toPicker.getValue() && toPicker.getValue() < v) toPicker.setValue(''); // To became invalid
    updateRangeClear();
  },
});
const toPicker = window.createDatePicker($('to-field'), {
  getMin: () => fromPicker.getValue() || null, // To can't precede From
  defaultMonth: () => {
    const f = fromPicker.getValue();
    if (!f) return null;
    const [y, m] = f.split('-').map(Number);
    return { y, m: m - 1 }; // open the To picker on the From month
  },
  onChange: () => updateRangeClear(),
});
rangeClear.addEventListener('click', () => {
  fromPicker.setValue('');
  toPicker.setValue('');
  $('range-err').textContent = '';
  updateRangeClear();
});

/* ---------- Hourly schedule ---------- */
state.schedMode = 'time';
state.timeFormat = '24h';
const DAYPARTS = [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening'], ['night', 'Night']];
const partsEls = {};

$('sched-mode').addEventListener('click', (e) => {
  const b = e.target.closest('.subseg-btn');
  if (!b) return;
  state.schedMode = b.dataset.smode;
  document.querySelectorAll('#sched-mode .subseg-btn').forEach((x) => x.classList.toggle('active', x === b));
  $('sched-time-cfg').classList.toggle('hidden', state.schedMode !== 'time');
  $('sched-parts-cfg').classList.toggle('hidden', state.schedMode !== 'dayparts');
  $('sched-err').textContent = '';
});
$('time-format').addEventListener('click', (e) => {
  const b = e.target.closest('.mini-btn');
  if (!b) return;
  state.timeFormat = b.dataset.fmt;
  document.querySelectorAll('#time-format .mini-btn').forEach((x) => x.classList.toggle('active', x === b));
});

$('parts-list').innerHTML = DAYPARTS.map(([key, name]) =>
  `<div class="part-row" data-part="${key}">
     <span class="part-name">${name}</span>
     <div class="part-start" aria-label="${name} start"></div>
     <span class="dash">–</span>
     <div class="part-end" aria-label="${name} end"></div>
   </div>`).join('');
DAYPARTS.forEach(([key]) => {
  const row = $('parts-list').querySelector(`[data-part="${key}"]`);
  partsEls[key] = {
    start: window.createTimePicker(row.querySelector('.part-start'), {}),
    end: window.createTimePicker(row.querySelector('.part-end'), { align: 'right' }),
  };
});

const schedDateClear = $('sched-date-clear');
const schedDatePicker = window.createDatePicker($('sched-date-field'), {
  onChange: () => schedDateClear.classList.toggle('hidden', !schedDatePicker.getValue()),
});
schedDateClear.addEventListener('click', () => { schedDatePicker.setValue(''); schedDateClear.classList.add('hidden'); });

function buildSchedulePayload(type) {
  const startDate = schedDatePicker.getValue() || null;
  if (state.schedMode === 'time') {
    const raw = $('incr-value').value.replace(/\s+/g, '');
    if (!/^\d+$/.test(raw) || parseInt(raw, 10) < 1) throw { field: 'sched', msg: 'Enter how often a row repeats (a whole number).' };
    const step = ($('incr-unit').value === 'hours' ? parseInt(raw, 10) * 60 : parseInt(raw, 10));
    if (step > 1440) throw { field: 'sched', msg: 'That’s longer than a day — pick a smaller increment.' };
    return { type, mode: 'schedule', locale: state.locale, schedule: { labelMode: 'time', format: state.timeFormat, step, startDate, dayparts: {} } };
  }
  const toMinutes = (v) => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
  const dayparts = {};
  for (const [key, name] of DAYPARTS) {
    const s = partsEls[key].start.getValue();
    const en = partsEls[key].end.getValue();
    if (s !== '' && en !== '') {
      if (s === en) throw { field: 'sched', msg: `${name}: start and end can’t be the same.` };
      dayparts[key] = { startMin: toMinutes(s), endMin: toMinutes(en) };
    } else {
      dayparts[key] = null;
    }
  }
  return { type, mode: 'schedule', locale: state.locale, schedule: { labelMode: 'dayparts', startDate, dayparts } };
}

/* ---------- Input parsing (fail fast) ---------- */
function parseYear() {
  const raw = $('year').value.replace(/\s+/g, '');
  if (!/^\d+$/.test(raw)) throw { field: 'year', msg: 'Enter a whole number, e.g. 2026.' };
  const year = parseInt(raw, 10);
  if (year < 1) throw { field: 'year', msg: 'Enter a year of 1 or greater.' };
  return year;
}
const partsOf = (v) => { const [y, m, d] = v.split('-').map(Number); return { year: y, month0: m - 1, day: d }; };
const keyOf = (p) => p.year * 10000 + p.month0 * 100 + p.day;
function parseRange() {
  const f = fromPicker.getValue();
  const t = toPicker.getValue();
  if (!f || !t) throw { field: 'range', msg: 'Choose both a start and an end date.' };
  const start = partsOf(f);
  const end = partsOf(t);
  if (keyOf(start) > keyOf(end)) throw { field: 'range', msg: 'The start date must be on or before the end date.' };
  return { start, end };
}
function buildPayload(type) {
  if (state.mode === 'schedule') return buildSchedulePayload(type);
  if (state.mode === 'year') return { type, mode: 'year', year: parseYear(), locale: state.locale };
  const { start, end } = parseRange();
  return { type, mode: 'range', start, end, locale: state.locale };
}

/* ---------- Language combo box ---------- */
const combo = $('combo');
const langInput = $('lang-input');
const langList = $('lang-list');
const langClear = $('lang-clear');
const LANGS = window.LANGUAGES; // already sorted alphabetically by English name

let visible = [];
let activeIndex = 0;

function renderList(filter) {
  const q = window.stripDiacritics(filter.trim()).toLowerCase();
  langList.innerHTML = '';
  visible = q ? LANGS.filter((l) => l.haystack.includes(q)) : LANGS.slice();

  if (!visible.length) {
    langList.innerHTML = '<div class="combo-empty">No language matches.</div>';
    return;
  }

  visible.forEach((lang, idx) => {
    const el = document.createElement('div');
    el.className = 'combo-item' + (lang.code === state.locale ? ' selected' : '');
    el.setAttribute('role', 'option');
    el.dataset.index = idx;
    const nv = lang.native && lang.native !== lang.name ? `<span class="nv">${lang.native}</span>` : '';
    el.innerHTML = `<span class="nm">${lang.name}</span>${nv}`;
    el.addEventListener('mousedown', (ev) => { ev.preventDefault(); choose(lang); });
    el.addEventListener('mousemove', () => setActive(idx));
    langList.appendChild(el);
  });

  // On open (no query) highlight the current selection; while searching, the top match.
  const selIdx = visible.findIndex((l) => l.code === state.locale);
  setActive(q ? 0 : (selIdx >= 0 ? selIdx : 0));
}

function setActive(idx) {
  activeIndex = idx;
  const items = langList.querySelectorAll('.combo-item');
  items.forEach((el, i) => el.classList.toggle('active', i === idx));
  const cur = items[idx];
  if (cur) cur.scrollIntoView({ block: 'nearest' });
}

function openList() {
  combo.classList.add('open');
  langList.classList.remove('hidden');
  langInput.setAttribute('aria-expanded', 'true');
  renderList('');
  langInput.select();
}
function closeList() {
  combo.classList.remove('open');
  langList.classList.add('hidden');
  langInput.setAttribute('aria-expanded', 'false');
  langInput.value = state.locale === 'en' ? '' : state.localeLabel;
}
function choose(lang) {
  state.locale = lang.code;
  state.localeLabel = lang.name;
  langInput.value = lang.code === 'en' ? '' : lang.name;
  langClear.classList.toggle('hidden', lang.code === 'en');
  closeList();
}

langInput.addEventListener('focus', openList);
langInput.addEventListener('input', () => { combo.classList.add('open'); langList.classList.remove('hidden'); renderList(langInput.value); });
langInput.addEventListener('keydown', (e) => {
  const open = !langList.classList.contains('hidden');
  if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) return openList(); setActive(Math.min(activeIndex + 1, visible.length - 1)); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
  else if (e.key === 'Enter') { e.preventDefault(); if (open && visible[activeIndex]) choose(visible[activeIndex]); }
  else if (e.key === 'Escape') { e.preventDefault(); closeList(); langInput.blur(); }
});
langClear.addEventListener('click', () => { choose(LANGS.find((l) => l.code === 'en')); });
document.addEventListener('mousedown', (e) => { if (!combo.contains(e.target) && combo.classList.contains('open')) closeList(); });

/* ---------- Toast ---------- */
let toastTimer;
const CHECK = '<svg class="t-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const WARN = '<svg class="t-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12" y2="16.5"/></svg>';

function showToast(inner, { error } = {}) {
  const toast = $('toast');
  clearTimeout(toastTimer);
  toast.className = 'toast' + (error ? ' error' : '');
  toast.innerHTML = inner;
  requestAnimationFrame(() => toast.classList.add('show'));
  toastTimer = setTimeout(() => toast.classList.remove('show'), 6500);
}
function toastSuccess(res) {
  showToast(`${CHECK}<div class="t-msg"><b>Saved to Downloads</b><span class="t-sub">${res.name}</span></div>`
    + '<button class="t-action">Show in folder</button>');
  $('toast').querySelector('.t-action').addEventListener('click', () => window.api.reveal(res.path));
}
function toastError(msg) {
  showToast(`${WARN}<div class="t-msg"><b>Couldn’t create the file</b><span class="t-sub">${msg}</span></div>`, { error: true });
}

/* ---------- Download ---------- */
document.querySelectorAll('.dl').forEach((btn) => {
  btn.addEventListener('click', async () => {
    $('year-err').textContent = '';
    $('range-err').textContent = '';
    $('sched-err').textContent = '';
    let payload;
    try {
      payload = buildPayload(btn.dataset.type);
    } catch (e) {
      $(`${e.field}-err`).textContent = e.msg;
      return;
    }
    btn.classList.add('busy');
    try {
      toastSuccess(await window.api.generate(payload));
    } catch (err) {
      toastError(err.message || String(err));
    } finally {
      btn.classList.remove('busy');
    }
  });
});

initTheme();
