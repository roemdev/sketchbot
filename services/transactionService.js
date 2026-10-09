const db = require("./dbService");

async function logTransaction({ discordId, type, itemName = null, mcNick = null, amount, totalPrice = 0 }) {
  db.run(
    `INSERT INTO transactions (discord_id, type, item_name, mc_nick, amount, total_price, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    discordId,
    type,
    itemName,
    mcNick,
    amount,
    totalPrice,
    new Date().toISOString()
  );
}

module.exports = { logTransaction };