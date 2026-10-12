// Creates the transparent, always-on-top annotation window.
const path = require('node:path');

function getVirtualBounds(screen) {
  const displays = screen.getAllDisplays();
  return displays.reduce((area, display) => {
    const bounds = display.bounds;
    const left = Math.min(area.x, bounds.x), top = Math.min(area.y, bounds.y);
    const right = Math.max(area.x + area.width, bounds.x + bounds.width);
    const bottom = Math.max(area.y + area.height, bounds.y + bounds.height);
    return { x: left, y: top, width: right - left, height: bottom - top };
  }, { ...displays[0].bounds });
}

function createOverlayWindow({ BrowserWindow, screen, onClosed }) {
  const window = new BrowserWindow({
    ...getVirtualBounds(screen),
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  window.setAlwaysOnTop(true, 'screen-saver');
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.loadFile(path.join(__dirname, '../renderer/index.html'));
  window.once('ready-to-show', () => window.show());
  window.on('closed', onClosed);
  return window;
}

module.exports = { getVirtualBounds, createOverlayWindow };
