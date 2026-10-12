# Your Pencil Desktop

Your Pencil is a Windows desktop annotation overlay. It draws above other apps, supports multiple displays, and saves its annotations and preferences on the computer.

## Run from source

1. Install Node.js 22 or newer.
2. From this folder, run `npm install` once.
3. Start Your Pencil with `npm start`.

Do not run the main-process file with Node directly; Electron must start the app so its desktop APIs are available.

## Project layout

```text
src/
  main/
    index.js             App startup and lifecycle wiring
    overlay-window.js    Transparent desktop overlay window
    shortcuts.js         Global and configurable shortcuts
    ipc-handlers.js      Secure renderer-to-main routing
    screen-capture.js    Display screenshots and eyedropper sampling
    state-store.js       Settings and annotation persistence
  shared/
    tool-config.js       Tool list and default shortcuts for both processes
  preload/
    index.js             Narrow API exposed to the renderer
  renderer/
    index.html           Toolbar and overlay markup
    styles.css           Overlay and toolbar styling
    scripts/
      app-state.js       Shared UI state and utilities
      drawing.js         Canvas, drawing tools, text, undo and redo
      toolbar.js         Toolbar, settings, palette, and positioning
      hotkeys.js         Shortcut editor UI
      desktop.js         Click-through and desktop capture integration
      bootstrap.js       Load saved state and initialize the interface
```

Renderer scripts are loaded in order by `src/renderer/index.html`; keep shared state first and bootstrap last.

## Build a Windows installer

- Run `npm run pack` to create an unpacked build in `release/`.
- Run `npm run dist` to create a per-user Windows x64 installer in `release/`.
- Run `npm run dist:arm64` to create a per-user Windows ARM64 installer.

## Tools and features

- Pen, highlighter, eraser, text, line, arrow, rectangle, ellipse, and eyedropper tools.
- Twenty-four palette colors, a custom color picker, and six configurable quick colors.
- Separate brush sizes per tool, undo and redo, and optional fading ink.
- Highlighted cursor, whiteboard, and blackboard modes.
- Screen capture with annotations; Shift-click the screenshot button to copy the capture to the clipboard.
- Click-through mode, a movable toolbar, and a compact folded mode that enables click-through while keeping a small unfold handle visible. Ink and cursor highlighting hide while folded and return when unfolded; folded state is remembered.
- Annotations and settings are automatically stored in the current Windows user's Electron data folder.

## Shortcuts

- **Ctrl+Shift+P**: toggle desktop click-through.
- **Ctrl+Shift+F**: fold or unfold the toolbar; folding enables click-through and unfolding returns to drawing.
- **Ctrl+Shift+F**: fold or unfold the toolbar; folding enables click-through and unfolding returns to drawing.
- **Esc**: turn on click-through.
- **Ctrl+Shift+C**: clear annotations.
- **Ctrl+Shift+S**: capture and save the desktop with annotations.
- **Ctrl+Shift+T**: show or hide the toolbar.
- **Ctrl+Alt+1–9**: select pen, highlighter, eraser, line, arrow, rectangle, ellipse, text, or eyedropper by default. Change these in Settings.
- **Ctrl+Shift+W**, **Ctrl+Shift+B**, **Ctrl+Shift+G**: toggle whiteboard, blackboard, or cursor highlight.
- **P**, **H**, **E**: select pen, highlighter, or eraser while Your Pencil is receiving keyboard input.
- **Ctrl+Z**, **Ctrl+Y**: undo, redo.

This project does not include a signing certificate or an update service. Windows may show a publisher warning for locally built installers until the application is code-signed.
