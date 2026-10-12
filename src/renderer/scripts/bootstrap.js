// Restore preferences and initialize the canvas after feature modules load.
(() => {
  const app = window.YourPencilApp;
  async function initialize() {
    try {
      const saved = await window.yourPencil?.loadState?.();
      if (saved && saved.version === 1) {
        app.state = {
          ...app.initial,
          ...saved,
          sizes: { ...app.initial.sizes, ...saved.sizes },
          hotkeys: { ...app.initial.hotkeys, ...saved.hotkeys },
          strokes: Array.isArray(saved.strokes)
            ? saved.strokes.filter(item => item && typeof item === 'object' && (!item.fadeSeconds || Date.now() - item.createdAt < item.fadeSeconds * 1000))
            : []
        };
      }
    } catch (error) {
      console.error('Could not load Your Pencil state', error);
      app.notify('Starting with a fresh canvas');
    }

    if (!app.toolNames.includes(app.state.tool)) app.state.tool = 'pen';
    if (!app.state.hotkeys || app.toolNames.some(tool => typeof app.state.hotkeys[tool] !== 'string')) {
      app.state.hotkeys = { ...app.initial.hotkeys };
    }
    await window.yourPencil?.saveToolHotkeys?.(app.state.hotkeys);
    app.renderHotkeys();
    app.renderPalette();
    app.setTool(app.state.tool);
    app.setColor(app.state.color);
    document.querySelector('#fadeSelect').value = String(app.state.fadeSeconds || 0);
    document.querySelector('#cursorHighlight').checked = Boolean(app.state.cursorHighlight);
    if (app.state.toolbarPosition) {
      app.elements.toolbar.style.left = `${app.state.toolbarPosition.left}px`;
      app.elements.toolbar.style.top = `${app.state.toolbarPosition.top}px`;
      app.elements.toolbar.style.transform = 'none';
    }
    app.setToolbarFolded(Boolean(app.state.toolbarFolded));
    window.addEventListener('resize', app.resizeCanvas);
    app.resizeCanvas();
    app.updateHistory();
  }
  initialize();
})();
