const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yourPencil', {
  setPassThrough: value => ipcRenderer.send('set-pass-through', Boolean(value)),
  setToolbarHover: value => ipcRenderer.send('set-toolbar-hover', Boolean(value)),
  beginShortcutCapture: () => ipcRenderer.invoke('begin-shortcut-capture'),
  saveToolHotkeys: value => ipcRenderer.invoke('save-tool-hotkeys', value),
  loadState: () => ipcRenderer.invoke('load-state'),
  saveState: value => ipcRenderer.invoke('save-state', value),
  captureScreens: () => ipcRenderer.invoke('capture-screens'),
  sampleScreenColor: point => ipcRenderer.invoke('sample-screen-color', point),
  savePng: dataUrl => ipcRenderer.invoke('save-png', dataUrl),
  copyPng: dataUrl => ipcRenderer.invoke('copy-png', dataUrl),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  onPassThroughChanged: callback => ipcRenderer.on('pass-through-changed', (_event,value) => callback(Boolean(value))),
  onGlobalAction: callback => ipcRenderer.on('global-action', (_event,action) => callback(action)),
  onBeforeQuit: callback => ipcRenderer.on('flush-state-before-quit', callback)
});
