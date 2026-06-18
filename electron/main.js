'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const { htmlToPdf } = require('./render-pdf');
const { generate } = require('./generate');

const ICON = path.join(__dirname, '..', 'build', 'icon.png');

function createWindow() {
  const win = new BrowserWindow({
    width: 940,
    height: 760,
    minWidth: 760,
    minHeight: 620,
    show: false,
    backgroundColor: '#EFEDEC',
    icon: fs.existsSync(ICON) ? ICON : undefined,
    title: 'Calendar',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
}

ipcMain.handle('generate', (_e, payload) => generate(payload, app.getPath('downloads'), htmlToPdf));
ipcMain.handle('reveal', (_e, filePath) => shell.showItemInFolder(filePath));

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
