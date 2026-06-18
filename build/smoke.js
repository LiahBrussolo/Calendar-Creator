'use strict';

// Dev harness: generates sample outputs to _smoke/ so the pipeline can be
// inspected without the UI. Run with: npm run smoke
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const { planYear, planRange } = require('../core/calendar');
const excel = require('../core/excel');
const pdf = require('../core/pdf');

const outDir = path.join(__dirname, '..', '_smoke');

app.on('window-all-closed', () => {}); // harness has no persistent window; don't auto-quit

async function htmlToPdf(html) {
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });
  const tmp = path.join(app.getPath('temp'), `smoke-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  try {
    await new Promise((resolve, reject) => {
      win.webContents.once('did-finish-load', resolve);
      win.webContents.once('did-fail-load', (_e, code, desc) => reject(new Error(`Render failed (${code}: ${desc}).`)));
      win.loadFile(tmp).catch(() => {});
    });
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
    return await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
  } finally {
    win.destroy();
    fs.unlinkSync(tmp);
  }
}

function countPages(pdfBuffer) {
  return (pdfBuffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
}

app.whenReady().then(async () => {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const year = planYear(2026);
  const range = planRange({ year: 2026, month0: 9, day: 29 }, { year: 2026, month0: 10, day: 16 }); // Oct 29 – Nov 16

  const jobs = [
    ['year-en-view.xlsx', () => excel.buildYearView(year, 'en')],
    ['range-nl-view.xlsx', () => excel.buildYearView(range, 'nl')],
    ['range-nl-list.xlsx', () => excel.buildList(range, 'nl')],
    ['year-en-1page.pdf', () => htmlToPdf(pdf.buildYearOnePageHTML(year, 'en'))],
    ['year-fr-1page.pdf', () => htmlToPdf(pdf.buildYearOnePageHTML(year, 'fr'))],
    ['year-ar-1page.pdf', () => htmlToPdf(pdf.buildYearOnePageHTML(year, 'ar'))],
    ['range-nl-1page.pdf', () => htmlToPdf(pdf.buildYearOnePageHTML(range, 'nl'))],
    ['year-en-month.pdf', () => htmlToPdf(pdf.buildMonthPerPageHTML(year, 'en'))],
    ['jan-en-month.pdf', () => htmlToPdf(pdf.buildMonthPerPageHTML(
      planRange({ year: 2026, month0: 0, day: 1 }, { year: 2026, month0: 0, day: 31 }), 'en'))],
  ];

  for (const [name, fn] of jobs) {
    const buf = await fn();
    fs.writeFileSync(path.join(outDir, name), buf);
    const info = name.endsWith('.pdf') ? `${countPages(buf)} page(s)` : `${buf.length} bytes`;
    console.log(`  ${name.padEnd(22)} ${info}`);
  }
  console.log('Smoke outputs in', outDir);
  app.quit();
});
