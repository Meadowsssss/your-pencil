// Validates renderer requests and performs privileged desktop/file operations.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createScreenCapture } = require('./screen-capture');
const { createStateStore } = require('./state-store');

function registerIpcHandlers({
  ipcMain, app, clipboard, desktopCapturer, dialog, nativeImage, screen,
  trusted, getOverlay, setPassThrough, setToolbarHover, shortcuts, requestQuit
}) {
  const stateStore = createStateStore(app);
  const screenCapture = createScreenCapture({ desktopCapturer, screen, getOverlay });

  ipcMain.on('set-pass-through', (event, value) => { if (trusted(event)) setPassThrough(value); });
  ipcMain.on('set-toolbar-hover', (event, value) => { if (trusted(event)) setToolbarHover(value); });
  ipcMain.handle('begin-shortcut-capture', event => {
    if (!trusted(event)) return false;
    shortcuts.unregisterAll();
    return true;
  });
  ipcMain.handle('save-tool-hotkeys', (event, next) => trusted(event) ? shortcuts.setToolHotkeys(next) : { ok: false });

  ipcMain.handle('load-state', async event => {
    if (!trusted(event)) return null;
    return stateStore.load();
  });
  ipcMain.handle('save-state', async (event, state) => {
    if (!trusted(event)) return false;
    return stateStore.save(state);
  });

  ipcMain.handle('capture-screens', event => {
    if (!trusted(event)) throw new Error('Untrusted screenshot request');
    return screenCapture.captureScreens();
  });

  ipcMain.handle('sample-screen-color', (event, point) => {
    if (!trusted(event)) throw new Error('Untrusted eyedropper request');
    return screenCapture.sampleScreenColor(point);
  });

  ipcMain.handle('save-png', async (event, dataUrl) => {
    if (!trusted(event) || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) throw new Error('Invalid PNG data');
    const { canceled, filePath } = await dialog.showSaveDialog(getOverlay(), {
      title: 'Save Your Pencil screenshot',
      defaultPath: path.join(app.getPath('pictures'), `Your-Pencil-${new Date().toISOString().replace(/[:.]/g, '-')}.png`),
      filters: [{ name: 'PNG image', extensions: ['png'] }]
    });
    if (canceled || !filePath) return { canceled: true };
    await fs.writeFile(filePath, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
    return { canceled: false, filePath };
  });
  ipcMain.handle('copy-png', (event, dataUrl) => {
    if (!trusted(event) || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) throw new Error('Invalid PNG data');
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
    return { copied: true };
  });
  ipcMain.handle('quit-app', event => {
    if (!trusted(event)) return false;
    requestQuit();
    return true;
  });
}

module.exports = { registerIpcHandlers };
