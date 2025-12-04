const db = require("./dbService");

module.exports = {
  /**
   * Verifica si un usuario está en cooldown para un comando
   * @param {string} discordId 
   * @param {string} command 
   * @returns {Promise<number|null>} Segundos restantes o null si no está en cooldown
   */
  checkCooldown: async (discordId, command) => {
    const rows = await db.query(
      "SELECT * FROM cooldowns WHERE discord_id = ? AND command = ?",
      [discordId, command]
    );

    if (!rows.length) return null;

    const now = new Date();
    const expires = new Date(rows[0].expires_at);

    if (now >= expires) {
      // Expiró, eliminar registro
      await db.execute(
        "DELETE FROM cooldowns WHERE discord_id = ? AND command = ?",
        [discordId, command]
      );
      return null;
    }

    // Tiempo restante en segundos
    return Math.ceil((expires - now) / 1000);
  },

  /**
   * Registra un cooldown para un usuario
   * @param {string} discordId 
   * @param {string} command 
   * @param {number} seconds 
   */
  setCooldown: async (discordId, command, seconds) => {
    const expires = new Date(Date.now() + seconds * 1000);
    await db.execute(
      "INSERT INTO cooldowns (discord_id, command, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expires_at = ?",
      [discordId, command, expires, expires]
    );
  }
};
