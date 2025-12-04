const db = require("./dbService");

module.exports = {
  createUser: async (discordId, username) => {
    const user = await db.query("SELECT * FROM user_stats WHERE discord_id = ?", [discordId]);
    if (user.length > 0) return user[0];

    await db.execute(
      "INSERT INTO user_stats (discord_id, username) VALUES (?, ?)",
      [discordId, username]
    );

    return await db.query("SELECT * FROM user_stats WHERE discord_id = ?", [discordId]).then(rows => rows[0]);
  },

  getUser: async (discordId) => {
    const rows = await db.query("SELECT * FROM user_stats WHERE discord_id = ?", [discordId]);
    return rows[0] || null;
  },

  addBalance: async (discordId, amount) => {
    await db.execute("UPDATE user_stats SET balance = balance + ? WHERE discord_id = ?", [amount, discordId]);
    return await module.exports.getUser(discordId);
  },

  removeBalance: async (discordId, amount) => {
    await db.execute("UPDATE user_stats SET balance = balance - ? WHERE discord_id = ? AND balance >= ?", [amount, discordId, amount]);
    return await module.exports.getUser(discordId);
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
