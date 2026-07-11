'use strict';

const ExcelJS = require('exceljs');
const { monthNames, isRTL } = require('./i18n');
const schedule = require('./schedule');

// Elegant on-palette tones (ARGB) derived from the app palette.
const HEADER_FILL = 'FF746558'; // dark taupe
const HEADER_INK = 'FFF4F1EC';  // cream
const WEEKEND_FILL = 'FFDFDBD7'; // soft warm grey
const SECTION_FILL = 'FFD6CEC3'; // soft taupe day-part divider
const INK = 'FF322D29';          // near-black
const LINE = 'FFD8D2CA';         // light taupe grid line

const THIN = { style: 'thin', color: { argb: LINE } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const FONT = { name: 'Calibri', size: 11, color: { argb: INK } };
const HEADER_FONT = { name: 'Calibri', size: 12, bold: true, color: { argb: HEADER_INK } };

const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

function headerText(plan, month, names) {
  return plan.mode === 'range' ? `${names[month.month0]} ${month.year}` : names[month.month0];
}

// Version 1 — Year View: months side by side, each a day-number column + a
// wide note column; weekend numbers shaded grey.
async function buildYearView(plan, locale) {
  const names = monthNames(locale);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(plan.mode === 'year' ? plan.label : 'Calendar', {
    views: [{ state: 'frozen', ySplit: 1, rightToLeft: isRTL(locale), showGridLines: false }],
  });

  plan.months.forEach((month, i) => {
    const numCol = 2 * i + 1;
    const noteCol = numCol + 1;
    ws.getColumn(numCol).width = 5;
    ws.getColumn(noteCol).width = 16;

    ws.mergeCells(1, numCol, 1, noteCol);
    const head = ws.getCell(1, numCol);
    head.value = headerText(plan, month, names);
    head.font = HEADER_FONT;
    head.fill = solid(HEADER_FILL);
    head.alignment = { horizontal: 'center', vertical: 'middle' };

    month.days.forEach(({ day, weekend }, i) => {
      const row = i + 2; // compact: the first selected day sits at the top
      const numCell = ws.getCell(row, numCol);
      numCell.value = day;
      numCell.font = FONT;
      numCell.alignment = { horizontal: 'center', vertical: 'middle' };
      numCell.border = BORDER;
      if (weekend) numCell.fill = solid(WEEKEND_FILL);
      ws.getCell(row, noteCol).border = BORDER;
    });
  });

  ws.getRow(1).height = 22;
  return wb.xlsx.writeBuffer();
}

// Version 2 — List: vertical, a month-name header bar then one row per day,
// with a wide note column; weekend numbers shaded grey.
async function buildList(plan, locale) {
  const names = monthNames(locale);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(plan.mode === 'year' ? `${plan.label} list` : 'Calendar list', {
    views: [{ rightToLeft: isRTL(locale), showGridLines: false }],
  });
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 64;

  let row = 0;
  for (const month of plan.months) {
    row += 1;
    ws.mergeCells(row, 1, row, 2);
    const head = ws.getCell(row, 1);
    head.value = headerText(plan, month, names);
    head.font = HEADER_FONT;
    head.fill = solid(HEADER_FILL);
    head.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(row).height = 22;

    for (const { day, weekend } of month.days) {
      row += 1;
      const numCell = ws.getCell(row, 1);
      numCell.value = day;
      numCell.font = FONT;
      numCell.alignment = { horizontal: 'center', vertical: 'middle' };
      numCell.border = BORDER;
      if (weekend) numCell.fill = solid(WEEKEND_FILL);
      ws.getCell(row, 2).border = BORDER;
    }
  }

  return wb.xlsx.writeBuffer();
}

// Weekly hourly schedule: day columns, time / day-part rows.
async function buildSchedule(config, locale) {
  const { dayHeaders, rows } = schedule.buildScheduleGrid(config, locale);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Schedule', {
    views: [{ state: 'frozen', ySplit: 1, rightToLeft: isRTL(locale), showGridLines: false }],
  });

  ws.getColumn(1).width = 14;
  for (let c = 2; c <= 8; c++) ws.getColumn(c).width = 16;

  const corner = ws.getCell(1, 1);
  corner.fill = solid(HEADER_FILL);
  corner.border = BORDER;
  const hasDates = dayHeaders.some((h) => h.date);
  dayHeaders.forEach((h, i) => {
    const cell = ws.getCell(1, i + 2);
    cell.value = h.date
      ? { richText: [
        { text: h.name, font: { name: 'Calibri', size: 12, bold: true, color: { argb: HEADER_INK } } },
        { text: `\n${h.date}`, font: { name: 'Calibri', size: 9, color: { argb: HEADER_INK } } },
      ] }
      : h.name;
    cell.font = HEADER_FONT;
    cell.fill = solid(HEADER_FILL);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDER;
  });
  ws.getRow(1).height = hasDates ? 34 : 24;

  let r = 1;
  for (const row of rows) {
    r += 1;
    if (row.kind === 'section') {
      ws.mergeCells(r, 1, r, 8);
      const cell = ws.getCell(r, 1);
      cell.value = row.label;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: INK } };
      cell.fill = solid(SECTION_FILL);
      cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      ws.getRow(r).height = 20;
    } else {
      const label = ws.getCell(r, 1);
      if (row.label) {
        label.value = row.label;
        label.font = FONT;
        label.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      label.border = BORDER;
      for (let c = 2; c <= 8; c++) ws.getCell(r, c).border = BORDER;
      ws.getRow(r).height = 22;
    }
  }

  return wb.xlsx.writeBuffer();
}

module.exports = { buildYearView, buildList, buildSchedule };
