// Toolbar controls, popovers, drawing settings, and toolbar positioning.
(() => {
  const app = window.YourPencilApp;
  const { toolbar, dragHandle } = app.elements;
  const foldButton = document.querySelector('#foldToolbar');

  app.setToolbarFolded = folded => {
    app.state.toolbarFolded = Boolean(folded);
    app.toolbarShown = true;
    toolbar.style.display = 'flex';
    toolbar.classList.toggle('folded', app.state.toolbarFolded);
    foldButton.textContent = app.state.toolbarFolded ? '+' : '\u2212';
    foldButton.setAttribute('aria-label', app.state.toolbarFolded ? 'Unfold toolbar' : 'Fold toolbar');
    foldButton.title = app.state.toolbarFolded
      ? 'Unfold toolbar and return to drawing - Ctrl+Shift+F'
      : 'Fold toolbar and enable click-through - Ctrl+Shift+F';
    app.setPassThrough(app.state.toolbarFolded);
    if (app.state.toolbarFolded) app.elements.halo.classList.remove('visible');
    app.redraw();
    app.persist();
  };
  foldButton.addEventListener('click', () => app.setToolbarFolded(!app.state.toolbarFolded));

  document.querySelectorAll('.tool').forEach(button => button.addEventListener('click', () => app.setTool(button.dataset.tool)));
  document.querySelectorAll('.size').forEach(button => button.addEventListener('click', () => {
    app.state.sizes[app.state.tool] = Number(button.dataset.size);
    document.querySelectorAll('.size').forEach(sizeButton => sizeButton.classList.toggle('active', sizeButton === button));
    app.persist();
  }));
  document.querySelector('#colorPicker').addEventListener('input', event => app.setColor(event.target.value));
  document.querySelector('#setQuickColor').addEventListener('click', () => {
    app.state.quickColors[Number(document.querySelector('#quickSlot').value)] = app.state.color;
    app.renderPalette(); app.persist(); app.notify('Quick color updated');
  });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => {
    document.querySelector(`#${button.dataset.close}`).hidden = true;
  }));
  document.querySelector('#paletteButton').addEventListener('click', () => {
    document.querySelector('#settingsPopover').hidden = true;
    document.querySelector('#palettePopover').hidden = !document.querySelector('#palettePopover').hidden;
  });
  document.querySelector('#settingsButton').addEventListener('click', () => {
    document.querySelector('#palettePopover').hidden = true;
    document.querySelector('#settingsPopover').hidden = !document.querySelector('#settingsPopover').hidden;
  });
  document.querySelector('#fadeSelect').addEventListener('change', event => {
    app.state.fadeSeconds = Number(event.target.value); app.persist(); app.redraw();
  });
  document.querySelector('#cursorHighlight').addEventListener('change', event => {
    app.state.cursorHighlight = event.target.checked;
    if (!app.state.cursorHighlight) app.elements.halo.classList.remove('visible');
    app.persist();
  });
  document.querySelector('#whiteboard').addEventListener('click', () => app.setBoard('#ffffff'));
  document.querySelector('#blackboard').addEventListener('click', () => app.setBoard('#111318'));
  document.querySelector('#boardOff').addEventListener('click', () => app.setBoard('transparent'));
  document.querySelector('#undo').addEventListener('click', app.undo);
  document.querySelector('#redo').addEventListener('click', app.redo);
  document.querySelector('#clear').addEventListener('click', app.clearInk);

  dragHandle.addEventListener('pointerdown', event => {
    event.preventDefault();
    const rect = toolbar.getBoundingClientRect();
    const startX = event.clientX, startY = event.clientY, startLeft = rect.left, startTop = rect.top;
    const move = pointer => {
      toolbar.style.left = `${Math.max(0, Math.min(innerWidth - 100, startLeft + pointer.clientX - startX))}px`;
      toolbar.style.top = `${Math.max(0, Math.min(innerHeight - 50, startTop + pointer.clientY - startY))}px`;
      toolbar.style.transform = 'none';
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      app.state.toolbarPosition = { left: parseFloat(toolbar.style.left), top: parseFloat(toolbar.style.top) };
      app.persist();
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up, { once: true });
  });
})();
