const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const config = require("../../core.json");
const { logTransaction } = require("../../services/transactionService");
const cooldownService = require("../../services/cooldownService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("diario")
    .setDescription("Reclama tu recompensa diaria según tus roles."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    await db.query(
      `INSERT OR IGNORE INTO user_stats (discord_id, username) VALUES (?, ?)`,
      [userId, username]
    );

    const cd = await cooldownService.checkCooldown(userId, "diario");
    if (cd) {
      const resetTimestamp = Math.floor(Date.now() / 1000 + cd);
      return interaction.reply({
        content: `¡Tranquilo vaquero! Ya pediste tu sueldo. Puedes volver a reclamar tu recompensa <t:${resetTimestamp}:R>. 🤠`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const memberRoles = interaction.member.roles.cache.map((r) => r.id);
    if (!memberRoles.length) {
      return interaction.reply({
        content: `Vaya, no tienes roles para recibir monedas. Consigue un buen rango y vuelve luego. 🤷`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const placeholders = memberRoles.map(() => "?").join(",");
    const rows = await db.query(
      `SELECT role_id, ammount FROM role_rewards WHERE role_id IN (${placeholders})`,
      memberRoles
    );

    if (!rows || rows.length === 0) {
      return interaction.reply({
        content: `Mala suerte, ninguno de tus roles actuales da recompensa. Pobre de ti. 🥺`,
        flags: MessageFlags.Ephemeral,
      });
    }

    let total = 0;
    const breakdown = rows
      .map((r) => {
        total += r.ammount;
        return `> <@&${r.role_id}> — **${r.ammount.toLocaleString()}** ${config.emojis.coin}`;
      })
      .join("\n");

    await db.query(
      `UPDATE user_stats SET balance = balance + ? WHERE discord_id = ?`,
      [total, userId]
    );

    await cooldownService.setCooldown(userId, "diario", config.dailyClaim.cooldown);

    try {
      await logTransaction({ discordId: userId, type: "daily", amount: total });
    } catch (error) {
      console.error(error);
    }

    return interaction.reply({
      content: `¡Día de pago! 🤑 Aquí tienes lo tuyo:\n${breakdown}\n\n**Total recibido:** **${total.toLocaleString()}** ${config.emojis.coin} monedas fresquitas para el bolsillo.`,
    });
  },
};
