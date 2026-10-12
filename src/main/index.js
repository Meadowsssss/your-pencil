// Electron main-process entry point: app lifecycle and dependency wiring.
if (!process.versions.electron) {
  console.error('Your Pencil must be launched with Electron. Run `npm start` from the project folder.');
  process.exit(1);
}

const { app, BrowserWindow, clipboard, desktopCapturer, dialog, globalShortcut, ipcMain, nativeImage, screen } = require('electron');
const { createOverlayWindow, getVirtualBounds } = require('./overlay-window');
const { createShortcutManager } = require('./shortcuts');
const { registerIpcHandlers } = require('./ipc-handlers');

let overlay = null;
let passThrough = false;
let toolbarHover = false;
let quitPending = false;

function trusted(event) {
  return overlay && !overlay.isDestroyed() && event.sender === overlay.webContents;
}
function sendAction(action) {
  if (overlay && !overlay.isDestroyed()) overlay.webContents.send('global-action', action);
}
function updateMouseCapture() {
  if (overlay && !overlay.isDestroyed()) overlay.setIgnoreMouseEvents(passThrough && !toolbarHover, { forward: true });
}
function setPassThrough(value) {
  passThrough = Boolean(value);
  updateMouseCapture();
  if (overlay && !overlay.isDestroyed()) overlay.webContents.send('pass-through-changed', passThrough);
}
function setToolbarHover(value) {
  toolbarHover = Boolean(value);
  updateMouseCapture();
}
function requestQuit() {
  quitPending = true;
  setTimeout(() => app.quit(), 120);
}

const shortcuts = createShortcutManager(globalShortcut, {
  getPassThrough: () => passThrough,
  setPassThrough,
  sendAction
});

const hasSingleInstance = app.requestSingleInstanceLock();
if (!hasSingleInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (overlay && !overlay.isDestroyed()) { overlay.show(); setPassThrough(false); }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.yourpencil.desktop');
    registerIpcHandlers({
      ipcMain, app, clipboard, desktopCapturer, dialog, nativeImage, screen,
      trusted,
      getOverlay: () => overlay,
      setPassThrough,
      setToolbarHover,
      shortcuts,
      requestQuit
    });

    overlay = createOverlayWindow({
      BrowserWindow,
      screen,
      onClosed: () => { overlay = null; }
    });
    shortcuts.register();

    const refreshDisplays = () => {
      if (overlay && !overlay.isDestroyed()) overlay.setBounds(getVirtualBounds(screen));
    };
    screen.on('display-added', refreshDisplays);
    screen.on('display-removed', refreshDisplays);
    screen.on('display-metrics-changed', refreshDisplays);
  });
}

app.on('will-quit', () => shortcuts.unregisterAll());
app.on('before-quit', event => {
  if (quitPending || !overlay || overlay.isDestroyed()) return;
  event.preventDefault();
  quitPending = true;
  overlay.webContents.send('flush-state-before-quit');
});
app.on('window-all-closed', () => app.quit());
