// Desktop integration: click-through, captures, and main-process events.
(() => {
  const app = window.YourPencilApp;
  const { canvas, toolbar, halo, passButton } = app.elements;

  app.applyPassThrough = value => {
    app.passThrough = Boolean(value);
    passButton.classList.toggle('active', app.passThrough);
    passButton.title = app.passThrough
      ? 'Click-through is on - click the toolbar or press Ctrl+Shift+P to draw'
      : 'Let clicks reach the apps below - Ctrl+Shift+P';
  };
  app.setPassThrough = value => {
    app.applyPassThrough(value);
    window.yourPencil?.setPassThrough?.(app.passThrough);
  };
  passButton.addEventListener('click', () => app.setPassThrough(!app.passThrough));
  window.yourPencil?.onPassThroughChanged?.(value => app.applyPassThrough(value));

  function setToolbarHover(value) {
    if (app.toolbarHover === Boolean(value)) return;
    app.toolbarHover = Boolean(value);
    window.yourPencil?.setToolbarHover?.(app.toolbarHover);
  }
  toolbar.addEventListener('mouseenter', () => setToolbarHover(true));
  toolbar.addEventListener('mouseleave', () => setToolbarHover(false));
  window.addEventListener('mousemove', event => {
    if (!app.state.cursorHighlight || app.state.toolbarFolded) { halo.classList.remove('visible'); return; }
    halo.style.left = `${event.clientX}px`; halo.style.top = `${event.clientY}px`;
    halo.style.borderColor = app.state.color; halo.classList.add('visible');
  });

  app.pickColorAt = async point => {
    const returnTool = app.lastDrawingTool || 'pen';
    try {
      app.notify('Pick a color...');
      const display = await window.yourPencil.sampleScreenColor(point);
      const image = new Image(); image.src = display.dataUrl; await image.decode();
      const sample = document.createElement('canvas'); sample.width = sample.height = 1;
      const context = sample.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      const color = `#${[red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('')}`;
      app.setColor(color);
      app.notify(`Picked ${color}`);
    } catch (error) {
      console.error('Eyedropper sampling failed', error);
      app.notify('Could not sample that screen color');
    } finally {
      app.setTool(returnTool);
    }
  };

  async function captureScreenshot(copy = false) {
    try {
      app.notify('Capturing screens...');
      const captured = await window.yourPencil.captureScreens();
      const output = document.createElement('canvas');
      output.width = canvas.width; output.height = canvas.height;
      const context = output.getContext('2d');
      for (const screen of captured.screens) {
        const image = new Image(); image.src = screen.dataUrl; await image.decode();
        const x = (screen.x - captured.bounds.x) * app.dpr, y = (screen.y - captured.bounds.y) * app.dpr;
        context.drawImage(image, x, y, screen.width * app.dpr, screen.height * app.dpr);
      }
      context.drawImage(canvas, 0, 0);
      const dataUrl = output.toDataURL('image/png');
      const result = copy ? await window.yourPencil.copyPng(dataUrl) : await window.yourPencil.savePng(dataUrl);
      if (result?.canceled) app.notify('Screenshot cancelled');
      else app.notify(copy ? 'Screenshot copied to clipboard' : 'Screenshot saved');
    } catch (error) { console.error('Screenshot failed', error); app.notify('Could not capture the desktop'); }
  }

  document.querySelector('#screenshot').addEventListener('click', event => captureScreenshot(event.shiftKey));
  document.querySelector('#quit').addEventListener('click', async () => {
    try { await window.yourPencil?.saveState?.(app.state); await window.yourPencil?.quitApp?.(); }
    catch (error) { console.error('Could not quit Your Pencil cleanly', error); }
  });
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'z') { event.preventDefault(); app.undo(); return; }
    if ((event.ctrlKey || event.metaKey) && key === 'y') { event.preventDefault(); app.redo(); return; }
    if (event.target === app.elements.editor) return;
    if (key === 'p' && !event.ctrlKey && !event.metaKey) app.setTool('pen');
    if (key === 'h' && !event.ctrlKey && !event.metaKey) app.setTool('highlighter');
    if (key === 'e' && !event.ctrlKey && !event.metaKey) app.setTool('eraser');
  });
  window.yourPencil?.onGlobalAction?.(action => {
    if (action === 'clear') app.clearInk();
    else if (action === 'screenshot') captureScreenshot(false);
    else if (action === 'toggle-toolbar') {
      app.toolbarShown = !app.toolbarShown;
      if (!app.toolbarShown) setToolbarHover(false);
      toolbar.style.display = app.toolbarShown ? 'flex' : 'none';
    } else if (action === 'toggle-fold') app.setToolbarFolded(!app.state.toolbarFolded);
    else if (action.startsWith('tool-')) app.setTool(action.slice(5));
    else if (action === 'board-white') app.setBoard('#ffffff');
    else if (action === 'board-black') app.setBoard('#111318');
    else if (action === 'cursor-highlight') {
      app.state.cursorHighlight = !app.state.cursorHighlight;
      document.querySelector('#cursorHighlight').checked = app.state.cursorHighlight;
      if (!app.state.cursorHighlight) halo.classList.remove('visible');
      app.persist();
    }
  });
  window.yourPencil?.onBeforeQuit?.(async () => {
    try { await window.yourPencil.saveState(app.state); await window.yourPencil.quitApp(); }
    catch (error) { console.error('Could not save Your Pencil before quitting', error); app.notify('Could not save; Your Pencil is still open'); }
  });

})();
