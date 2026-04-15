const supabase = require("./dbService");

async function logTransaction({ discordId, type, itemName = null, mcNick = null, amount, totalPrice = 0 }) {
  const { error } = await supabase
      .from("transactions")
      .insert({
        discord_id: discordId,
        type,
        item_name: itemName,
        mc_nick: mcNick,
        amount,
        total_price: totalPrice,
      });
  if (error) throw error;
}

module.exports = { logTransaction };