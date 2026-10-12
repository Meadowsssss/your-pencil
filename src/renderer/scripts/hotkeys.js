// Global tool-shortcut editor shown in Settings.
(() => {
  const app = window.YourPencilApp;
  const displayShortcut = shortcut => shortcut.replace('Control', 'Ctrl').replaceAll('+', ' + ');

  app.renderHotkeys = () => {
    const rows = document.querySelector('#hotkeyRows'); rows.replaceChildren();
    app.toolNames.forEach(tool => {
      const row = document.createElement('div'); row.className = 'hotkey-row';
      const label = document.createElement('span'); label.textContent = tool[0].toUpperCase() + tool.slice(1);
      const button = document.createElement('button'); button.type = 'button'; button.className = 'hotkey-button';
      button.textContent = displayShortcut(app.state.hotkeys[tool]); button.setAttribute('aria-label', `Change ${tool} shortcut`);
      button.addEventListener('click', () => startCapture(tool, button));
      row.append(label, button); rows.append(row);
    });
  };

  function endCapture(restore = true) {
    const capture = app.shortcutCapture; if (!capture) return;
    clearTimeout(capture.timer); document.removeEventListener('keydown', capture.listener, true);
    capture.button.classList.remove('recording');
    capture.button.textContent = displayShortcut(app.state.hotkeys[capture.tool]);
    app.shortcutCapture = null;
    if (restore) window.yourPencil?.saveToolHotkeys?.(app.state.hotkeys);
  }

  function startCapture(tool, button) {
    if (app.shortcutCapture) endCapture();
    window.yourPencil?.beginShortcutCapture?.();
    button.classList.add('recording'); button.textContent = 'Press shortcut...';
    const capture = { tool, button, timer: null, listener: null };
    capture.listener = async event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); endCapture(); return; }
      const key = event.key.toUpperCase();
      if (!(event.ctrlKey || event.altKey) || !(/^[A-Z0-9]$/.test(key) || /^F(?:[1-9]|1[0-2])$/.test(key))) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const shortcut = `Control+Alt+${key}`;
      if (Object.entries(app.state.hotkeys).some(([name, value]) => name !== tool && value === shortcut)) {
        app.notify('That shortcut is already assigned'); endCapture(); return;
      }
      const updated = { ...app.state.hotkeys, [tool]: shortcut };
      const result = await window.yourPencil?.saveToolHotkeys?.(updated);
      if (result?.ok === false) { app.notify('Could not register shortcut'); endCapture(); return; }
      app.state.hotkeys = updated; app.persist(); endCapture(false); app.renderHotkeys();
      if (result?.failed?.length) app.notify(`Shortcut saved; ${result.failed.length} shortcut(s) unavailable`);
    };
    app.shortcutCapture = capture;
    document.addEventListener('keydown', capture.listener, true);
    capture.timer = setTimeout(() => {
      if (app.shortcutCapture === capture) { endCapture(); app.notify('Shortcut recording timed out'); }
    }, 10000);
  }
})();
