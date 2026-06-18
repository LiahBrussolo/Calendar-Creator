'use strict';

const { daysInMonth, dayOfWeek } = require('./calendar');
const { monthNames, dayNamesLong, dayNamesNarrow, isRTL } = require('./i18n');

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Lay a month out as weeks of 7 cells (null = blank). The week always starts on
// Sunday. Each real cell knows only whether it is in range (for range dimming).
function monthMatrix(year, month0, activeSet) {
  const total = daysInMonth(year, month0);
  const firstDow = dayOfWeek(year, month0 + 1, 1); // 0=Sunday .. 6=Saturday
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push({ day: d, inRange: activeSet.has(d) });
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Drop leading/trailing weeks with no in-range day, so a date range's selected
// days sit at the top of the month instead of wherever they fall in the grid.
function trimToRange(weeks) {
  const live = (wk) => wk.some((c) => c && c.inRange);
  let s = 0;
  while (s < weeks.length && !live(weeks[s])) s += 1;
  let e = weeks.length - 1;
  while (e >= s && !live(weeks[e])) e -= 1;
  return weeks.slice(s, e + 1);
}

const SHARED_CSS = `
  :root{
    --paper:#FCFBF9; --ink:#33302B; --muted:#B3AA9E; --accent:#746558;
    --soft:#AD9E90; --line:#E4DDD3; --head:#746558; --head-ink:#FBFAF8;
  }
  *{ box-sizing:border-box; margin:0; padding:0; }
  body{ font-family:'Segoe UI', system-ui, 'Noto Sans', sans-serif; color:var(--ink);
        background:var(--paper); -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .page{ background:var(--paper); }
`;

// ---- Version: whole year (or range) on one page, narrow weekday letters ----
function buildYearOnePageHTML(plan, locale) {
  const names = monthNames(locale);
  const narrow = dayNamesNarrow(locale); // index 0=Sunday .. 6=Saturday
  const rtl = isRTL(locale);
  const isRange = plan.mode === 'range';
  const head = narrow.map((l) => `<th>${esc(l)}</th>`).join('');

  const miniHTML = plan.months.map((m) => {
    const active = new Set(m.days.map((d) => d.day));
    const weeks = trimToRange(monthMatrix(m.year, m.month0, active));
    const title = isRange ? `${names[m.month0]} ${m.year}` : names[m.month0];
    const body = weeks.map((wk) => '<tr>' + wk.map((c) => {
      if (!c) return '<td></td>';
      return `<td class="${c.inRange ? '' : 'out'}">${c.day}</td>`;
    }).join('') + '</tr>').join('');
    return `<section class="mini"><h2>${esc(title)}</h2>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`;
  }).join('');

  const css = `${SHARED_CSS}
    @page{ size:A4 landscape; margin:0; }
    .page{ ${isRange ? 'min-height:100vh;' : 'height:100vh;'} padding:11mm 12mm; display:flex; flex-direction:column; }
    .title{ font-size:20pt; font-weight:300; letter-spacing:.18em; color:var(--accent);
            text-transform:uppercase; margin-bottom:6mm; ${rtl ? 'text-align:right;' : ''} }
    .grid{ ${isRange ? '' : 'flex:1;'} display:grid; grid-template-columns:repeat(4,1fr);
           grid-auto-rows:${isRange ? 'auto' : '1fr'}; align-content:start; gap:6mm 7mm; }
    .mini{ display:flex; flex-direction:column; overflow:hidden; }
    .mini h2{ font-size:10.5pt; font-weight:600; color:var(--accent); margin-bottom:1.6mm;
              letter-spacing:.01em; }
    .mini table{ width:100%; border-collapse:collapse; table-layout:fixed; ${isRange ? '' : 'flex:1;'} }
    .mini th{ font-size:6.6pt; font-weight:600; color:var(--muted); padding-bottom:1mm; text-align:center; }
    .mini td{ font-size:8pt; color:var(--ink); text-align:center; padding:.6mm 0; }
    .mini td.out{ color:var(--muted); opacity:.45; }`;

  return `<!doctype html><html lang="${esc(locale)}" dir="${rtl ? 'rtl' : 'ltr'}"><head>
    <meta charset="utf-8"><style>${css}</style></head>
    <body><section class="page"><div class="title">${esc(plan.label)}</div>
    <div class="grid">${miniHTML}</div></section></body></html>`;
}

// ---- Version: one month per page, full weekday names ----
function buildMonthPerPageHTML(plan, locale) {
  const names = monthNames(locale);
  const long = dayNamesLong(locale); // index 0=Sunday .. 6=Saturday
  const rtl = isRTL(locale);
  const headRow = long.map((l) => `<th>${esc(l)}</th>`).join('');
  const last = plan.months.length - 1;

  const pages = plan.months.map((m, idx) => {
    const active = new Set(m.days.map((d) => d.day));
    const weeks = monthMatrix(m.year, m.month0, active);
    const body = weeks.map((wk) => '<tr>' + wk.map((c) => {
      if (!c) return '<td class="empty"></td>';
      return `<td class="${c.inRange ? '' : 'out'}"><span class="num">${c.day}</span></td>`;
    }).join('') + '</tr>').join('');
    const brk = idx < last ? ' brk' : '';
    return `<section class="page month${brk}">
      <header><h1>${esc(names[m.month0])}</h1><span class="yr">${m.year}</span></header>
      <table class="cal"><thead><tr>${headRow}</tr></thead><tbody>${body}</tbody></table>
    </section>`;
  }).join('');

  const css = `${SHARED_CSS}
    @page{ size:A4 landscape; margin:0; }
    .month{ height:100vh; padding:13mm 14mm; display:flex; flex-direction:column; overflow:hidden; }
    .brk{ break-after:page; }
    header{ display:flex; align-items:baseline; gap:5mm; margin-bottom:5mm;
            ${rtl ? 'flex-direction:row-reverse;' : ''} }
    h1{ font-size:30pt; font-weight:300; letter-spacing:.04em; color:var(--ink); }
    .yr{ font-size:16pt; font-weight:300; color:var(--soft); letter-spacing:.1em; }
    .cal{ width:100%; flex:1; border-collapse:collapse; table-layout:fixed; }
    .cal th{ font-size:10.5pt; font-weight:600; color:var(--accent); text-align:${rtl ? 'right' : 'left'};
             padding:0 0 3mm 2.5mm; letter-spacing:.02em; }
    .cal td{ border:.4mm solid var(--line); vertical-align:top; padding:2mm 2.5mm; width:14.28%; }
    .cal td.empty{ background:transparent; border-color:transparent; }
    .num{ font-size:13pt; color:var(--ink); }
    .cal td.out .num{ color:var(--muted); opacity:.5; }`;

  return `<!doctype html><html lang="${esc(locale)}" dir="${rtl ? 'rtl' : 'ltr'}"><head>
    <meta charset="utf-8"><style>${css}</style></head><body>${pages}</body></html>`;
}

module.exports = { buildYearOnePageHTML, buildMonthPerPageHTML };
