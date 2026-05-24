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

  getXpNeededForLevel: (level) => {
    const lvl = level || 1;
    return 5 * lvl * lvl + 50 * lvl + 100;
  },

  getTotalXp: (level, xp) => {
    const lvl = level || 1;
    let total = 0;
    for (let i = 1; i < lvl; i++) {
      total += 5 * i * i + 50 * i + 100;
    }
    return total + (xp || 0);
  },

  getBankBalance: async (discordId) => {
    const bankRecord = await module.exports.getUser(`${discordId}_bank`);
    return bankRecord ? bankRecord.balance : 0;
  },

  setBankBalance: async (discordId, amount, username = "Banco") => {
    const bankId = `${discordId}_bank`;
    const bankRecord = await module.exports.getUser(bankId);
    if (!bankRecord) {
      await module.exports.createUser(bankId, `${username}_bank`);
    }
    const { error } = await supabase
      .from("user_stats")
      .update({ balance: amount })
      .eq("discord_id", bankId);
    if (error) throw error;
  },

  getTopUsers: async (limit = 10, sortBy = "balance") => {
    let query = supabase
        .from("user_stats")
        .select("discord_id, username, balance, level, xp")
        .not("discord_id", "ilike", "%_bank")
        .limit(limit);

    if (sortBy === "level") {
      query = query.order("level", { ascending: false }).order("xp", { ascending: false });
    } else {
      query = query.order("balance", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  addXp: async (discordId, amount, username = "Usuario de Voz") => {
    let user = await module.exports.getUser(discordId);
    if (!user) {
      user = await module.exports.createUser(discordId, username);
    }

    let currentXp = (user.xp || 0) + amount;
    let currentLevel = user.level || 1;
    let leveledUp = false;
    let levelsGained = 0;

    while (currentXp >= module.exports.getXpNeededForLevel(currentLevel)) {
      currentXp -= module.exports.getXpNeededForLevel(currentLevel);
      currentLevel++;
      leveledUp = true;
      levelsGained++;
    }

    const { error } = await supabase
        .from("user_stats")
        .update({ xp: currentXp, level: currentLevel })
        .eq("discord_id", discordId);

    if (error) throw error;
    return { xp: currentXp, level: currentLevel, leveledUp, levelsGained };
  },

  setXpAndLevel: async (discordId, level, xp, username = "Usuario") => {
    let user = await module.exports.getUser(discordId);
    if (!user) {
      user = await module.exports.createUser(discordId, username);
    }
    const { error } = await supabase
        .from("user_stats")
        .update({ xp, level })
        .eq("discord_id", discordId);
    if (error) throw error;
    return { xp, level };
  },

  removeXp: async (discordId, amount) => {
    const user = await module.exports.getUser(discordId);
    if (!user) return null;

    let currentXp = (user.xp || 0) - amount;
    let currentLevel = user.level || 1;

    while (currentXp < 0 && currentLevel > 1) {
      currentLevel--;
      currentXp += module.exports.getXpNeededForLevel(currentLevel);
    }

    if (currentXp < 0) {
      currentXp = 0;
    }

    const { error } = await supabase
        .from("user_stats")
        .update({ xp: currentXp, level: currentLevel })
        .eq("discord_id", discordId);

    if (error) throw error;
    return { xp: currentXp, level: currentLevel };
  }
};