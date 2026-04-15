const supabase = require("./dbService");

module.exports = {
  createUser: async (discordId, username) => {
    const { error } = await supabase
        .from("user_stats")
        .upsert({ discord_id: discordId, username }, { onConflict: "discord_id", ignoreDuplicates: true });
    if (error) throw error;
    return await module.exports.getUser(discordId);
  },

  getUser: async (discordId) => {
    const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("discord_id", discordId)
        .single();
    if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
    return data ?? null;
  },

  getBalance: async (discordId) => {
    const user = await module.exports.getUser(discordId);
    return user ? user.balance : 0;
  },

  addBalance: async (discordId, amount, returnUser = true) => {
    if (amount < 0) {
      return await module.exports.removeBalance(discordId, Math.abs(amount), returnUser);
    }
    const { error } = await supabase.rpc("increment_balance", {
      p_discord_id: discordId,
      p_amount: amount,
    });
    if (error) throw error;
    return returnUser ? await module.exports.getUser(discordId) : null;
  },

  removeBalance: async (discordId, amount, returnUser = true) => {
    const { data, error } = await supabase.rpc("decrement_balance", {
      p_discord_id: discordId,
      p_amount: amount,
    });
    if (error) throw error;
    // La función RPC devuelve false si no había saldo suficiente
    if (data === false) throw new Error("Insufficient balance");
    return returnUser ? await module.exports.getUser(discordId) : null;
  },

  updateUsername: async (discordId, newUsername) => {
    const { error } = await supabase
        .from("user_stats")
        .update({ username: newUsername })
        .eq("discord_id", discordId);
    if (error) throw error;
    return await module.exports.getUser(discordId);
  },

  getTopUsers: async (limit = 10) => {
    const { data, error } = await supabase
        .from("user_stats")
        .select("discord_id, username, balance")
        .order("balance", { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
};