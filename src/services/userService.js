const db = require("./dbService");

module.exports = {
  /**
   * Crea un usuario si no existe
   * @param {string|number} discordId - ID de Discord
   * @param {string} username - Nombre del usuario
   */
  createUser: async (discordId, username) => {
    // Verificar si ya existe
    const user = await db.query("SELECT * FROM user_stats WHERE discord_id = ?", [discordId]);
    if (user.length > 0) return user[0];

    // Crear nuevo usuario
    await db.execute(
      "INSERT INTO user_stats (discord_id, username) VALUES (?, ?)",
      [discordId, username]
    );

    return await db.query("SELECT * FROM user_stats WHERE discord_id = ?", [discordId]).then(rows => rows[0]);
  },

  /**
   * Obtener usuario por discordId
   * @param {string|number} discordId
   */
  getUser: async (discordId) => {
    const rows = await db.query("SELECT * FROM user_stats WHERE discord_id = ?", [discordId]);
    return rows[0] || null;
  },

  /**
   * Añadir créditos a un usuario
   * @param {string|number} discordId
   * @param {number} amount
   */
  addBalance: async (discordId, amount) => {
    await db.execute("UPDATE user_stats SET balance = balance + ? WHERE discord_id = ?", [amount, discordId]);
    return await module.exports.getUser(discordId);
  },

  /**
   * Quitar créditos a un usuario
   * @param {string|number} discordId
   * @param {number} amount
   */
  removeBalance: async (discordId, amount) => {
    await db.execute("UPDATE user_stats SET balance = balance - ? WHERE discord_id = ? AND balance >= ?", [amount, discordId, amount]);
    return await module.exports.getUser(discordId);
  },

  /**
   * Actualizar username del usuario
   * @param {string|number} discordId
   * @param {string} newUsername
   */
  updateUsername: async (discordId, newUsername) => {
    await db.execute("UPDATE user_stats SET username = ? WHERE discord_id = ?", [newUsername, discordId]);
    return await module.exports.getUser(discordId);
  }
};
