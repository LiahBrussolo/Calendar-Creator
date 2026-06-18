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

const OUTPUTS = {
  'excel-view': { ext: 'xlsx', suffix: 'Year View', make: (p, l) => excel.buildYearView(p, l) },
  'excel-list': { ext: 'xlsx', suffix: 'List', make: (p, l) => excel.buildList(p, l) },
  'pdf-year': { ext: 'pdf', suffix: 'Year', make: (p, l, render) => render(pdf.buildYearOnePageHTML(p, l)) },
  'pdf-month': { ext: 'pdf', suffix: 'Monthly', make: (p, l, render) => render(pdf.buildMonthPerPageHTML(p, l)) },
};

function uniquePath(dir, base, ext) {
  let name = `${base}.${ext}`;
  let n = 1;
  while (fs.existsSync(path.join(dir, name))) name = `${base} (${n++}).${ext}`;
  return path.join(dir, name);
}

// Build the requested output, save it to dir, and return its path + name.
async function generate(payload, dir, htmlToPdf) {
  const out = OUTPUTS[payload.type];
  if (!out) throw new Error('Unknown output type.');
  const locale = payload.locale || 'en';
  const plan = planFromInput(payload);
  const buffer = await out.make(plan, locale, htmlToPdf);
  const filePath = uniquePath(dir, `Calendar ${plan.fileLabel} — ${out.suffix}`, out.ext);
  fs.writeFileSync(filePath, buffer);
  return { path: filePath, name: path.basename(filePath) };
}

module.exports = { generate };
