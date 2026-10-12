// Registers fixed app actions and user-configurable drawing-tool shortcuts.
const { toolNames, createDefaultToolHotkeys } = require('../shared/tool-config');
const shortcutPattern = /^Control\+Alt\+(?:[A-Z0-9]|F(?:[1-9]|1[0-2]))$/;

function createShortcutManager(globalShortcut, { getPassThrough, setPassThrough, sendAction }) {
  let toolHotkeys = createDefaultToolHotkeys();

  function register() {
    globalShortcut.unregisterAll();
    const entries = [
      ['Control+Shift+P', () => setPassThrough(!getPassThrough())],
      ['Control+Shift+F', () => sendAction('toggle-fold')],
      ['Escape', () => setPassThrough(true)],
      ['Control+Shift+C', () => sendAction('clear')],
      ['Control+Shift+S', () => sendAction('screenshot')],
      ['Control+Shift+T', () => sendAction('toggle-toolbar')],
      ['Control+Shift+W', () => sendAction('board-white')],
      ['Control+Shift+B', () => sendAction('board-black')],
      ['Control+Shift+G', () => sendAction('cursor-highlight')],
      ...toolNames.map(tool => [toolHotkeys[tool], () => sendAction(`tool-${tool}`)])
    ];
    const status = {};
    for (const [accelerator, callback] of entries) {
      status[accelerator] = globalShortcut.register(accelerator, callback);
      if (!status[accelerator]) console.warn(`Your Pencil could not register shortcut: ${accelerator}`);
    }
    return status;
  }

  function setToolHotkeys(next) {
    if (!next || toolNames.some(tool => typeof next[tool] !== 'string' || !shortcutPattern.test(next[tool]))) return { ok: false };
    if (new Set(toolNames.map(tool => next[tool])).size !== toolNames.length) return { ok: false, duplicate: true };
    toolHotkeys = Object.fromEntries(toolNames.map(tool => [tool, next[tool]]));
    const status = register();
    const failed = toolNames.filter(tool => !status[toolHotkeys[tool]]);
    return { ok: failed.length === 0, failed };
  }

  return { register, setToolHotkeys, unregisterAll: () => globalShortcut.unregisterAll() };
}

module.exports = { createShortcutManager, toolNames };
