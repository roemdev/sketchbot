const db = require("./dbService");

/**
 * Registra una transacción en la tabla transactions
 * @param {Object} options
 * @param {string|number} options.discordId - ID de Discord
 * @param {"buy"|"swap"|"task"} options.type - Tipo de transacción
 * @param {number} options.amount - Cantidad de coins
 */
async function logTransaction({ discordId, type, itemName = null, mcNick = null, amount, totalPrice = 0 }) {
  // En SQLite ya no necesitamos getConnection() ni release()
  // Usamos db.execute directamente para inserciones
  await db.execute(
    `INSERT INTO transactions
            (discord_id, type, item_name, mc_nick, amount, total_price)
            VALUES (?, ?, ?, ?, ?, ?)`,
    [discordId, type, itemName, mcNick, amount, totalPrice]
  );
}

module.exports = { logTransaction };