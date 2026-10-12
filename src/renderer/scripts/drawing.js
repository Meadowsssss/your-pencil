// Canvas rendering, annotation history, and text/drawing input.
(() => {
  const app = window.YourPencilApp;
  const { canvas, editor, halo } = app.elements;
  const sizeFor = tool => app.sizeFor(tool);

  app.setTool = tool => {
    if (!app.toolNames.includes(tool)) return;
    if (tool === 'eyedropper' && app.state.tool !== 'eyedropper') app.lastDrawingTool = app.state.tool;
    else if (tool !== 'eyedropper') app.lastDrawingTool = tool;
    if (app.passThrough) app.setPassThrough(false);
    app.state.tool = tool;
    document.querySelectorAll('.tool').forEach(button => button.classList.toggle('active', button.dataset.tool === tool));
    canvas.style.cursor = tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : tool === 'eyedropper' ? 'copy' : 'crosshair';
    document.querySelectorAll('.size').forEach(button => button.classList.toggle('active', Number(button.dataset.size) === sizeFor(tool)));
    app.persist();
  };

  app.setColor = color => {
    app.state.color = color;
    document.querySelectorAll('.swatch').forEach(button => button.classList.toggle('active', button.dataset.color === color));
    document.querySelector('#colorPicker').value = /^#[\da-f]{6}$/i.test(color) ? color : '#f4f5f8';
    app.persist();
  };

  app.renderPalette = () => {
    const quick = document.querySelector('#quickColors');
    const full = document.querySelector('#fullPalette');
    quick.replaceChildren(); full.replaceChildren();
    const makeSwatch = (color, title) => {
      const button = document.createElement('button');
      button.className = 'swatch'; button.dataset.color = color; button.style.backgroundColor = color;
      button.title = title; button.setAttribute('aria-label', title);
      return button;
    };
    app.palette.forEach((color, index) => {
      const button = makeSwatch(color, `Color ${index + 1}: ${color}`);
      button.addEventListener('click', () => { app.setColor(color); document.querySelector('#palettePopover').hidden = true; });
      full.append(button);
    });
    app.state.quickColors.forEach((color, index) => {
      const button = makeSwatch(color, `Quick color ${index + 1}`);
      button.addEventListener('click', () => app.setColor(color)); quick.append(button);
    });
    document.querySelectorAll('.swatch').forEach(button => button.classList.toggle('active', button.dataset.color === app.state.color));
  };

  app.resizeCanvas = () => {
    app.dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.round(innerWidth * app.dpr), height = Math.round(innerHeight * app.dpr);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    app.ctx.setTransform(app.dpr, 0, 0, app.dpr, 0, 0);
    app.redraw();
  };

  app.alphaFor = (item, now) => {
    if (!item.fadeSeconds || !item.createdAt) return 1;
    return Math.max(0, 1 - Math.max(0, now - item.createdAt) / 1000 / item.fadeSeconds);
  };

  app.renderItem = (context, item, now = Date.now()) => {
    const alpha = app.alphaFor(item, now);
    if (alpha <= 0) return;
    context.save();
    context.globalAlpha = alpha * (item.tool === 'highlighter' ? .28 : 1);
    context.globalCompositeOperation = item.tool === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = item.color; context.fillStyle = item.color;
    context.lineWidth = item.tool === 'eraser' || item.tool === 'highlighter' ? item.size * 3 : item.size;
    context.lineCap = 'round'; context.lineJoin = 'round';
    if (item.type === 'text') {
      context.globalCompositeOperation = 'source-over'; context.globalAlpha = alpha;
      context.font = `${item.fontSize || 24}px ${item.fontFamily || 'system-ui'}`; context.textBaseline = 'top';
      item.text.split('\n').forEach((line, index) => context.fillText(line, item.x, item.y + index * (item.fontSize || 24) * 1.25));
    } else if (item.type === 'shape') {
      const { x: x1, y: y1 } = item.from, { x: x2, y: y2 } = item.to;
      context.beginPath();
      if (item.tool === 'line') { context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); }
      else if (item.tool === 'arrow') {
        const angle = Math.atan2(y2 - y1, x2 - x1), head = Math.max(10, item.size * 3.2);
        context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
        context.beginPath(); context.moveTo(x2, y2);
        context.lineTo(x2 - head * Math.cos(angle - .45), y2 - head * Math.sin(angle - .45));
        context.lineTo(x2 - head * Math.cos(angle + .45), y2 - head * Math.sin(angle + .45));
        context.closePath(); context.fill();
      } else if (item.tool === 'rectangle') context.strokeRect(x1, y1, x2 - x1, y2 - y1);
      else if (item.tool === 'ellipse') { context.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2); context.stroke(); }
    } else if (item.points?.length) {
      if (item.points.length === 1) { const p = item.points[0]; context.beginPath(); context.arc(p.x, p.y, context.lineWidth / 2, 0, Math.PI * 2); context.fill(); }
      else for (let i = 1; i < item.points.length; i++) {
        const a = item.points[i - 1], b = item.points[i];
        const pressure = item.tool === 'pen' ? Math.max(.22, Math.min(1, (a.pressure + b.pressure) / 2 || .5)) : 1;
        context.lineWidth = (item.tool === 'eraser' || item.tool === 'highlighter' ? item.size * 3 : item.size) * pressure;
        context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      }
    }
    context.restore();
  };

  app.redraw = () => {
    const context = app.ctx;
    context.clearRect(0, 0, innerWidth, innerHeight);
    if (app.state.board !== 'transparent') { context.save(); context.globalCompositeOperation = 'source-over'; context.fillStyle = app.state.board; context.fillRect(0, 0, innerWidth, innerHeight); context.restore(); }
    const now = Date.now();
    if (!app.state.toolbarFolded) {
      app.state.strokes.forEach(item => app.renderItem(context, item, now));
      if (app.current) app.renderItem(context, app.current, now);
    }
    if (!app.state.toolbarFolded && app.state.strokes.some(item => item.fadeSeconds && app.alphaFor(item, now) > 0) && !app.dirtyFadeTimer) {
      app.dirtyFadeTimer = true;
      setTimeout(() => { app.dirtyFadeTimer = false; app.redraw(); }, 250);
    }
  };

  app.commit = item => {
    if (!item || (item.type === 'shape' && Math.hypot(item.to.x - item.from.x, item.to.y - item.from.y) < 3)) return;
    if (item.type === 'text' && !item.text.trim()) return;
    item.createdAt = Date.now(); item.fadeSeconds = app.state.fadeSeconds;
    app.state.strokes.push(item); app.undoStack.push({ type: 'add', item }); app.redoStack = [];
    app.updateHistory(); app.persist(); app.redraw();
  };

  app.updateHistory = () => {
    document.querySelector('#undo').disabled = !app.undoStack.length;
    document.querySelector('#redo').disabled = !app.redoStack.length;
  };
  app.undo = () => {
    const action = app.undoStack.pop(); if (!action) return;
    if (action.type === 'add') { const index = app.state.strokes.lastIndexOf(action.item); if (index >= 0) app.state.strokes.splice(index, 1); }
    else if (action.type === 'clear') app.state.strokes = action.previous;
    app.redoStack.push(action); app.updateHistory(); app.persist(); app.redraw();
  };
  app.redo = () => {
    const action = app.redoStack.pop(); if (!action) return;
    if (action.type === 'add') app.state.strokes.push(action.item); else if (action.type === 'clear') app.state.strokes = [];
    app.undoStack.push(action); app.updateHistory(); app.persist(); app.redraw();
  };
  app.clearInk = () => {
    if (!app.state.strokes.length) return;
    const previous = app.state.strokes; app.state.strokes = [];
    app.undoStack.push({ type: 'clear', previous }); app.redoStack = [];
    app.updateHistory(); app.persist(); app.redraw(); app.notify('Annotations cleared - Ctrl+Z to restore');
  };
  app.setBoard = color => {
    app.state.board = app.state.board === color ? 'transparent' : color;
    app.persist(); app.redraw();
  };

  const pointFrom = event => ({ x: event.clientX, y: event.clientY, pressure: event.pointerType === 'mouse' ? 1 : Math.max(.15, event.pressure || .5) });
  function beginText(point) {
    const textSize = sizeFor('text'), fontSize = Math.max(16, textSize * 4), color = app.state.color;
    editor.replaceChildren();
    Object.assign(editor.style, { left: `${point.x}px`, top: `${point.y}px`, font: `${fontSize}px system-ui`, color, display: 'block', minHeight: `${fontSize + 12}px` });
    editor.dataset.x = point.x; editor.dataset.y = point.y;
    const finish = () => {
      const text = (editor.innerText || '').replace(/\n+$/, ''), x = Number(editor.dataset.x), y = Number(editor.dataset.y);
      editor.style.display = 'none'; editor.removeEventListener('keydown', onKey); editor.removeEventListener('blur', finish);
      if (text.trim()) app.commit({ type: 'text', tool: 'text', text, x, y, color, size: textSize, fontSize, fontFamily: 'system-ui' });
    };
    const onKey = event => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); editor.blur(); }
      if (event.key === 'Escape') { event.preventDefault(); editor.replaceChildren(); editor.blur(); }
    };
    editor.addEventListener('keydown', onKey); editor.addEventListener('blur', finish, { once: true });
    requestAnimationFrame(() => {
      editor.focus({ preventScroll: true });
      const range = document.createRange(); range.selectNodeContents(editor); range.collapse(false);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      app.notify('Type text - Enter to place - click away to place');
    });
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const point = pointFrom(event);
    if (app.state.tool === 'eyedropper') { app.pickColorAt(point); return; }
    if (app.state.tool === 'text') { beginText(point); return; }
    app.drawing = true; canvas.setPointerCapture(event.pointerId);
    const item = { tool: app.state.tool, color: app.state.color, size: sizeFor(app.state.tool) };
    app.current = ['line', 'arrow', 'rectangle', 'ellipse'].includes(app.state.tool)
      ? { ...item, type: 'shape', from: { x: point.x, y: point.y }, to: { x: point.x, y: point.y } }
      : { ...item, type: 'stroke', points: [point] };
    app.redraw();
  });
  canvas.addEventListener('pointermove', event => {
    if (app.state.cursorHighlight) { halo.style.left = `${event.clientX}px`; halo.style.top = `${event.clientY}px`; halo.style.borderColor = app.state.color; halo.classList.add('visible'); }
    if (!app.drawing || !app.current) return;
    const point = pointFrom(event);
    if (app.current.type === 'shape') app.current.to = { x: point.x, y: point.y }; else app.current.points.push(point);
    app.redraw();
  });
  const finishStroke = () => {
    if (!app.drawing) return;
    app.drawing = false; const item = app.current; app.current = null; app.commit(item);
  };
  canvas.addEventListener('pointerup', finishStroke);
  canvas.addEventListener('pointercancel', finishStroke);
})();
