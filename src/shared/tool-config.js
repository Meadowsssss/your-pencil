// Tool metadata shared by Electron's main process and the renderer.
const toolNames = Object.freeze([
  'pen',
  'highlighter',
  'eraser',
  'line',
  'arrow',
  'rectangle',
  'ellipse',
  'text',
  'eyedropper'
]);

function createDefaultToolHotkeys() {
  return Object.fromEntries(toolNames.map((tool, index) => [tool, `Control+Alt+${index + 1}`]));
}

const toolConfig = { toolNames, createDefaultToolHotkeys };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = toolConfig;
} else {
  window.YourPencilTools = toolConfig;
}
