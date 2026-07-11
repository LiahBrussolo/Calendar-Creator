'use strict';

const fs = require('fs');
const path = require('path');

const { planYear, planRange } = require('../core/calendar');
const excel = require('../core/excel');
const pdf = require('../core/pdf');

function planFromInput({ mode, year, start, end }) {
  if (mode === 'year') {
    if (!Number.isInteger(year)) throw new Error('Enter a valid year.');
    return planYear(year);
  }
  if (mode === 'range') return planRange(start, end);
  throw new Error('Unknown input mode.');
}

const CALENDAR_OUTPUTS = {
  'excel-view': { ext: 'xlsx', suffix: 'Year View', make: (plan, l) => excel.buildYearView(plan, l) },
  'excel-list': { ext: 'xlsx', suffix: 'List', make: (plan, l) => excel.buildList(plan, l) },
  'pdf-year': { ext: 'pdf', suffix: 'Year', make: (plan, l, render) => render(pdf.buildYearOnePageHTML(plan, l)) },
  'pdf-month': { ext: 'pdf', suffix: 'Monthly', make: (plan, l, render) => render(pdf.buildMonthPerPageHTML(plan, l)) },
};
const SCHEDULE_OUTPUTS = {
  'schedule-excel': { ext: 'xlsx', make: (cfg, l) => excel.buildSchedule(cfg, l) },
  'schedule-pdf': { ext: 'pdf', make: (cfg, l, render) => render(pdf.buildScheduleHTML(cfg, l)) },
};

function uniquePath(dir, base, ext) {
  let name = `${base}.${ext}`;
  let n = 1;
  while (fs.existsSync(path.join(dir, name))) name = `${base} (${n++}).${ext}`;
  return path.join(dir, name);
}

// Build the requested output, save it to dir, and return its path + name.
async function generate(payload, dir, htmlToPdf) {
  const locale = payload.locale || 'en';
  let buffer;
  let base;
  let ext;
  if (payload.mode === 'schedule') {
    const out = SCHEDULE_OUTPUTS[payload.type];
    if (!out) throw new Error('Unknown output type.');
    buffer = await out.make(payload.schedule, locale, htmlToPdf);
    base = 'Weekly Schedule';
    ext = out.ext;
  } else {
    const out = CALENDAR_OUTPUTS[payload.type];
    if (!out) throw new Error('Unknown output type.');
    const plan = planFromInput(payload);
    buffer = await out.make(plan, locale, htmlToPdf);
    base = `Calendar ${plan.fileLabel} — ${out.suffix}`;
    ext = out.ext;
  }
  const filePath = uniquePath(dir, base, ext);
  fs.writeFileSync(filePath, buffer);
  return { path: filePath, name: path.basename(filePath) };
}

module.exports = { generate };
