import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

// Default configuration
let configCache = {
  startMinimized: true, 
  minimizeToTrayOnClose: false
};

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      // Merge with defaults to ensure all keys exist
      configCache = { ...configCache, ...data };
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configCache, null, 2));
    return true;
  } catch (e) {
    console.error('Failed to save config:', e);
    return false;
  }
}

// Initial load
loadConfig();

export default {
  get(key) {
    return configCache[key];
  },
  set(key, value) {
    configCache[key] = value;
    return saveConfig();
  },
  getAll() {
    return configCache;
  }
};
