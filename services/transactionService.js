const pool = require("./dbService");

/**
 * Registra una transacción en la tabla transactions
 * @param {Object} options
 * @param {string|number} options.discordId - ID de Discord
 * @param {"buy"|"swap"|"task"} options.type - Tipo de transacción
 * @param {number} options.amount - Cantidad de coins
 */
async function logTransaction({ discordId, type, itemName = null, mcNick = null, amount, totalPrice = 0 }) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO transactions
            (discord_id, type, item_name, mc_nick, amount, total_price)
            VALUES (?, ?, ?, ?, ?, ?)`,
      [discordId, type, itemName, mcNick, amount, totalPrice]
    );
  } finally {
    conn.release();
  }
}

module.exports = { logTransaction };
