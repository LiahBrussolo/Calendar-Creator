'use strict';

// End-to-end: loads the real renderer (with preload) and drives every output
// through the real window.api bridge, checking for console/CSP errors.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const { htmlToPdf } = require('../electron/render-pdf');
const { generate } = require('../electron/generate');

app.on('window-all-closed', () => {});
const tmpDir = path.join(__dirname, '..', '_e2e');

ipcMain.handle('generate', (_e, payload) => generate(payload, tmpDir, htmlToPdf));
ipcMain.handle('reveal', () => {});

app.whenReady().then(async () => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const messages = [];
  win.webContents.on('console-message', (_e, _lvl, msg) => messages.push(msg));

  await new Promise((resolve, reject) => {
    win.webContents.once('did-finish-load', resolve);
    win.webContents.once('did-fail-load', (_e, c, d) => reject(new Error(`${c} ${d}`)));
    win.loadFile(path.join(__dirname, '..', 'src', 'index.html')).catch(() => {});
  });

  const info = await win.webContents.executeJavaScript(`(async () => {
    const out = { apiType: typeof window.api, langCount: window.LANGUAGES.length,
                  hasEnglish: window.LANGUAGES.some(l => l.code === 'en'),
                  theme: document.documentElement.getAttribute('data-theme'), results: {} };
    for (const t of ['excel-view', 'excel-list', 'pdf-year', 'pdf-month']) {
      const r = await window.api.generate({ type: t, mode: 'year', year: 2026, locale: 'en' });
      out.results[t] = r.name;
    }
    const rr = await window.api.generate({ type: 'pdf-month', mode: 'range', locale: 'fr',
      start: { year: 2026, month0: 2, day: 15 }, end: { year: 2026, month0: 5, day: 10 } });
    out.results.range = rr.name;
    return out;
  })()`);

  const bad = messages.filter((m) => /refused|violates|uncaught|error/i.test(m));
  console.log('api bridge   :', info.apiType);
  console.log('languages    :', info.langCount, '| has English:', info.hasEnglish);
  console.log('theme applied:', info.theme);
  console.log('files created:', fs.readdirSync(tmpDir).length, 'of 5');
  Object.entries(info.results).forEach(([k, v]) => console.log('   •', k.padEnd(11), v));
  console.log('console errors:', bad.length ? bad : 'none');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  app.quit();
});
