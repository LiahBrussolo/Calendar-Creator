'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  generate: (payload) => ipcRenderer.invoke('generate', payload),
  reveal: (filePath) => ipcRenderer.invoke('reveal', filePath),
});
