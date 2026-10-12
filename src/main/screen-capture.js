// Captures displays for exports and samples a desktop pixel for the eyedropper.
const { getVirtualBounds } = require('./overlay-window');

function createScreenCapture({ desktopCapturer, screen, getOverlay }) {
  async function captureScreens() {
    const overlay = getOverlay();
    const displays = screen.getAllDisplays();
    if (!overlay || overlay.isDestroyed()) throw new Error('Your Pencil overlay is unavailable');

    const bounds = getVirtualBounds(screen);
    let overlayHidden = false;
    try {
      overlay.hide();
      overlayHidden = true;
      await new Promise(resolve => setTimeout(resolve, 130));

      const maxDimension = Math.max(...displays.map(display =>
        Math.max(display.bounds.width * display.scaleFactor, display.bounds.height * display.scaleFactor)
      ));
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: Math.min(8192, maxDimension), height: Math.min(8192, maxDimension) },
        fetchWindowIcons: false
      });
      const screens = displays.map((display, index) => {
        const source = sources.find(candidate => candidate.display_id === String(display.id)) || sources[index];
        if (!source || source.thumbnail.isEmpty()) {
          throw new Error(`Screen capture unavailable for display ${display.id}`);
        }
        return {
          x: display.bounds.x,
          y: display.bounds.y,
          width: display.bounds.width,
          height: display.bounds.height,
          scaleFactor: display.scaleFactor,
          dataUrl: source.thumbnail.toDataURL()
        };
      });
      return { bounds, screens };
    } finally {
      if (overlayHidden && !overlay.isDestroyed()) overlay.showInactive();
    }
  }

  async function sampleScreenColor(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error('Invalid eyedropper point');
    }

    const overlay = getOverlay();
    if (!overlay || overlay.isDestroyed()) throw new Error('Your Pencil overlay is unavailable');

    const overlayBounds = overlay.getBounds();
    const screenX = overlayBounds.x + point.x;
    const screenY = overlayBounds.y + point.y;
    const display = screen.getAllDisplays().find(({ bounds }) =>
      screenX >= bounds.x && screenX < bounds.x + bounds.width &&
      screenY >= bounds.y && screenY < bounds.y + bounds.height
    );
    if (!display) throw new Error('The eyedropper point is outside a display');

    const canExcludeOverlay = typeof overlay.setContentProtection === 'function';
    let protectionEnabled = false;
    let overlayHidden = false;
    try {
      if (canExcludeOverlay) {
        overlay.setContentProtection(true);
        protectionEnabled = true;
        // Let the compositor exclude the overlay from capture without hiding it.
        await new Promise(resolve => setTimeout(resolve, 34));
      } else {
        overlay.hide();
        overlayHidden = true;
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      const thumbnailSize = {
        width: Math.min(8192, Math.max(1, Math.ceil(display.bounds.width * display.scaleFactor))),
        height: Math.min(8192, Math.max(1, Math.ceil(display.bounds.height * display.scaleFactor)))
      };
      const sources = await desktopCapturer.getSources({
        types: ['screen'], thumbnailSize, fetchWindowIcons: false
      });
      const source = sources.find(candidate => candidate.display_id === String(display.id));
      if (!source || source.thumbnail.isEmpty()) {
        throw new Error(`Screen capture unavailable for display ${display.id}`);
      }

      const imageSize = source.thumbnail.getSize();
      const pixelX = Math.max(0, Math.min(imageSize.width - 1,
        Math.floor((screenX - display.bounds.x) / display.bounds.width * imageSize.width)));
      const pixelY = Math.max(0, Math.min(imageSize.height - 1,
        Math.floor((screenY - display.bounds.y) / display.bounds.height * imageSize.height)));
      const pixel = source.thumbnail.crop({ x: pixelX, y: pixelY, width: 1, height: 1 });
      return { dataUrl: pixel.toDataURL() };
    } finally {
      if (protectionEnabled && !overlay.isDestroyed()) overlay.setContentProtection(false);
      if (overlayHidden && !overlay.isDestroyed()) overlay.showInactive();
    }
  }

  return { captureScreens, sampleScreenColor };
}

module.exports = { createScreenCapture };
