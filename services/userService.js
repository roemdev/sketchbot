const db = require("./dbService");

module.exports = {
  createUser: async (discordId, username) => {
    // SQLite: INSERT OR IGNORE evita errores si el ID ya existe
    await db.execute(
      "INSERT OR IGNORE INTO user_stats (discord_id, username) VALUES (?, ?)",
      [discordId, username]
    );
    return await module.exports.getUser(discordId);
  },

  getUser: async (discordId) => {
    const rows = await db.query("SELECT * FROM user_stats WHERE discord_id = ?", [discordId]);
    return rows[0] || null;
  },

  addBalance: async (discordId, amount, returnUser = true) => {
    // 🛡️ SECURITY ENFORCEMENT: If amount is negative, route to removeBalance
    // This prevents SQLite from blindly updating balances to negative values and bypassing game limits
    if (amount < 0) {
      return await module.exports.removeBalance(discordId, Math.abs(amount), returnUser);
    }
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
    const result = await db.execute("UPDATE user_stats SET balance = balance - ? WHERE discord_id = ? AND balance >= ?", [amount, discordId, amount]);

    // 🛡️ SECURITY ENFORCEMENT: SQLite's execute does not throw an error if no rows match the WHERE clause.
    // We must manually throw an error when changes === 0 so that try-catch blocks in games correctly fail.
    if (result.changes === 0) {
      throw new Error("Insufficient balance");
    }

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
