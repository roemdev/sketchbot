const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');

function loadJson(filename, defaultValue = {}) {
  const filePath = path.join(dataDir, filename);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error loading JSON file ${filename}:`, error);
  }
  return defaultValue;
}

const eco = loadJson('economy.json');
const lvl = loadJson('levels.json');
const set = loadJson('settings.json');

module.exports = {
  economy: eco.economy || {},
  emojis: { ...(eco.emojis || {}), ...(lvl.emojis || {}) },
  tasks: eco.tasks || {},
  crimes: eco.crimes || {},
  dailyClaim: eco.dailyClaim || {},
  smash: eco.smash || {},
  bank: eco.bank || {},
  crimes: eco.crimes || {},
  levels: lvl.levels || {},
  voiceXp: lvl.voiceXp || {},
  game: set.game || {},
  embeds: set.embeds || {},
  voice: set.voice || {}
};
