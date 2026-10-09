const db = require("./dbService");

module.exports = {
  checkCooldown: async (discordId, command) => {
    const data = db.get(
      `SELECT expires_at FROM cooldowns WHERE discord_id = ? AND command = ?`,
      discordId,
      command
    );

    if (!data) return null;

    const now = new Date();
    const expires = new Date(data.expires_at);

    if (now >= expires) {
      db.run(
        `DELETE FROM cooldowns WHERE discord_id = ? AND command = ?`,
        discordId,
        command
      );
      return null;
    }

    return Math.ceil((expires - now) / 1000);
  },

  setCooldown: async (discordId, command, seconds) => {
    const expires = new Date(Date.now() + seconds * 1000).toISOString();
    db.run(
      `INSERT INTO cooldowns (discord_id, command, expires_at) VALUES (?, ?, ?)
       ON CONFLICT(discord_id, command) DO UPDATE SET expires_at = excluded.expires_at`,
      discordId,
      command,
      expires
    );
  },

  resetCooldown: async (discordId, command = null) => {
    if (command) {
      db.run(
        `DELETE FROM cooldowns WHERE discord_id = ? AND command = ?`,
        discordId,
        command
      );
    } else {
      db.run(
        `DELETE FROM cooldowns WHERE discord_id = ?`,
        discordId
      );
    }
  },
};