const db = require("./dbService");

module.exports = {
  createUser: async (discordId, username, returnUser = true) => {
    // SQLite: INSERT OR IGNORE evita errores si el ID ya existe
    await db.execute(
      "INSERT OR IGNORE INTO user_stats (discord_id, username) VALUES (?, ?)",
      [discordId, username]
    );
    if (returnUser) {
      return await module.exports.getUser(discordId);
    }
    return null;
  },

  getUser: async (discordId) => {
    const rows = await db.query("SELECT * FROM user_stats WHERE discord_id = ?", [discordId]);
    return rows[0] || null;
  },

  addBalance: async (discordId, amount, returnUser = true) => {
    await db.execute("UPDATE user_stats SET balance = balance + ? WHERE discord_id = ?", [amount, discordId]);
    if (returnUser) {
      return await module.exports.getUser(discordId);
    }
    return null;
  },

  getBalance: async (discordId) => {
    const user = await module.exports.getUser(discordId);
    return user ? user.balance : 0; // Devuelve el balance o 0 si el usuario no existe.
  },

  removeBalance: async (discordId, amount, returnUser = true) => {
    await db.execute("UPDATE user_stats SET balance = balance - ? WHERE discord_id = ? AND balance >= ?", [amount, discordId, amount]);
    if (returnUser) {
      return await module.exports.getUser(discordId);
    }
    return null;
  },

  updateUsername: async (discordId, newUsername) => {
    await db.execute("UPDATE user_stats SET username = ? WHERE discord_id = ?", [newUsername, discordId]);
    return await module.exports.getUser(discordId);
  },

  /**
   * Obtener el top N de usuarios por balance
   * @param {number} limit - Cantidad de usuarios a devolver
   */
  getTopUsers: async (limit = 10) => {
    const rows = await db.query(
      "SELECT discord_id, username, balance FROM user_stats ORDER BY balance DESC LIMIT ?",
      [limit]
    );
    return rows;
  }
};
