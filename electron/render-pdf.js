'use strict';

const { BrowserWindow, app } = require('electron');
const fs = require('fs');
const path = require('path');

// Render trusted HTML to a PDF buffer via Chromium (handles every script + RTL).
async function htmlToPdf(html) {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  const tmp = path.join(app.getPath('temp'), `calendar-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
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

module.exports = { htmlToPdf };
