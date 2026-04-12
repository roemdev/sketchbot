const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const { makeContainer, CV2, CV2_EPHEMERAL } = require("../../utils/ui");
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
        components: [makeContainer("info", "Cooldown activo", `Debes esperar <t:${resetTimestamp}:R> antes de volver a usar /diario.`)],
        flags: CV2_EPHEMERAL,
      });
    }

    const memberRoles = interaction.member.roles.cache.map((r) => r.id);
    if (!memberRoles.length) {
      return interaction.reply({
        components: [makeContainer("error", "Sin roles", "No tienes roles que otorguen recompensa diaria.")],
        flags: CV2_EPHEMERAL,
      });
    }

    const placeholders = memberRoles.map(() => "?").join(",");
    const rows = await db.query(
      `SELECT role_id, ammount FROM role_rewards WHERE role_id IN (${placeholders})`,
      memberRoles
    );

    if (!rows || rows.length === 0) {
      return interaction.reply({
        components: [makeContainer("info", "Sin recompensa", "Tus roles no otorgan monedas diarias.")],
        flags: CV2_EPHEMERAL,
      });
    }

    let total = 0;
    const breakdown = rows
      .map((r) => {
        total += r.ammount;
        return `> <@&${r.role_id}> — **${config.emojis.coin}${r.ammount.toLocaleString()}**`;
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
      components: [
        makeContainer(
          "success",
          "Recompensa diaria",
          `${breakdown}\n\nTotal recibido: **${config.emojis.coin}${total.toLocaleString()}**`
        ),
      ],
      flags: CV2,
    });
  },
};
