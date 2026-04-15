const supabase = require("./dbService");

module.exports = {
  checkCooldown: async (discordId, command) => {
    const { data, error } = await supabase
        .from("cooldowns")
        .select("expires_at")
        .eq("discord_id", discordId)
        .eq("command", command)
        .single();

    if (error || !data) return null;

    const now = new Date();
    const expires = new Date(data.expires_at);

    if (now >= expires) {
      await supabase
          .from("cooldowns")
          .delete()
          .eq("discord_id", discordId)
          .eq("command", command);
      return null;
    }

    return Math.ceil((expires - now) / 1000);
  },

  setCooldown: async (discordId, command, seconds) => {
    const expires = new Date(Date.now() + seconds * 1000).toISOString();
    const { error } = await supabase
        .from("cooldowns")
        .upsert({ discord_id: discordId, command, expires_at: expires },
            { onConflict: "discord_id,command" });
    if (error) throw error;
  },
};