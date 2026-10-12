// Shared renderer state and small utilities used by the feature modules.
(() => {
  const { toolNames, createDefaultToolHotkeys } = window.YourPencilTools;
  const palette = ['#f4f5f8','#ff5d67','#ff8a4c','#ffbe45','#ffe36e','#b7e45b','#8be28a','#44d6a3','#35d5cf','#53c8f5','#4b8df5','#6565ee','#9270f2','#b79aff','#df83ed','#f17bb6','#c94852','#c86637','#bd8d20','#839d37','#379373','#277f96','#365aa1','#7355a4'];
  const initial = {
    version: 1,
    strokes: [],
    tool: 'pen',
    color: palette[0],
    quickColors: palette.slice(0, 6),
    sizes: { pen: 6, highlighter: 8, eraser: 10, line: 4, arrow: 4, rectangle: 4, ellipse: 4, text: 6 },
    hotkeys: createDefaultToolHotkeys(),
    fadeSeconds: 0,
    cursorHighlight: false,
    board: 'transparent',
    toolbarPosition: null,
    toolbarFolded: false
  };

  const app = window.YourPencilApp = {
    elements: {
      canvas: document.querySelector('#canvas'),
      toolbar: document.querySelector('.toolbar'),
      editor: document.querySelector('#textEditor'),
      toast: document.querySelector('#toast'),
      halo: document.querySelector('#cursorHalo'),
      passButton: document.querySelector('#passThrough'),
      dragHandle: document.querySelector('.drag-handle')
    },
    palette,
    toolNames,
    initial,
    state: structuredClone(initial),
    current: null,
    undoStack: [],
    redoStack: [],
    drawing: false,
    dpr: 1,
    passThrough: false,
    toolbarHover: false,
    toastTimer: null,
    saveTimer: null,
    toolbarShown: true,
    lastDrawingTool: 'pen',
    dirtyFadeTimer: false,
    shortcutCapture: null,
    ctx: null,
    sizeFor(tool) { return this.state.sizes[tool] || 6; },
    notify(message) {
      this.elements.toast.textContent = message;
      this.elements.toast.classList.add('visible');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.elements.toast.classList.remove('visible'), 2300);
    },
    persist() {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(async () => {
        try { await window.yourPencil?.saveState?.(this.state); }
        catch (error) { console.error('Could not save Your Pencil state', error); this.notify('Could not save settings or annotations'); }
      }, 280);
    }
  };
  app.ctx = app.elements.canvas.getContext('2d', { alpha: true });
})();
