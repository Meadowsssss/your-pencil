// Reads and writes local preferences and annotations.
const fs = require('node:fs/promises');
const path = require('node:path');

function createStateStore(app) {
  const stateFile = () => path.join(app.getPath('userData'), 'your-pencil-state.json');
  const legacyStateFiles = () => [
    path.join(app.getPath('userData'), 'inkline-state.json'),
    path.join(app.getPath('appData'), 'Inkline', 'inkline-state.json'),
    path.join(app.getPath('appData'), 'inkline-desktop', 'inkline-state.json')
  ];

  async function load() {
    try {
      return JSON.parse(await fs.readFile(stateFile(), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Your Pencil state load failed', error);
        return null;
      }
    }

    for (const legacyFile of legacyStateFiles()) {
      try {
        const legacyState = JSON.parse(await fs.readFile(legacyFile, 'utf8'));
        await fs.mkdir(path.dirname(stateFile()), { recursive: true });
        await fs.writeFile(stateFile(), JSON.stringify(legacyState), 'utf8');
        return legacyState;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('Your Pencil could not migrate saved settings', error);
          return null;
        }
      }
    }

    return null;
  }

  async function save(state) {
    if (!state || state.version !== 1) return false;
    const serialized = JSON.stringify(state);
    if (serialized.length > 20 * 1024 * 1024) {
      throw new Error('Your Pencil state exceeds the 20 MB save limit');
    }

    const file = stateFile();
    const temporaryFile = `${file}.tmp`;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(temporaryFile, serialized, 'utf8');
    await fs.rename(temporaryFile, file);
    return true;
  }

  return { load, save };
}

module.exports = { createStateStore };
