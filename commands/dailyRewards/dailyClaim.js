const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const { makeEmbed } = require("../../utils/embedFactory");
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

    // Crear usuario si no existe
    await db.query(
      `INSERT IGNORE INTO user_stats (discord_id, username) VALUES (?, ?)`,
      [userId, username]
    );

    // Revisar cooldown usando cooldownService
    const cd = await cooldownService.checkCooldown(userId, "diario");
    if (cd) {
      const resetTimestamp = Math.floor(Date.now() / 1000 + cd);
      return interaction.reply({
        embeds: [
          makeEmbed("info", "Cooldown activo", `⏱ Debes esperar <t:${resetTimestamp}:R> antes de volver a usar /diario.`)
        ]
      });
    }

    // Obtener roles del miembro
    const memberRoles = interaction.member.roles.cache.map(r => r.id);
    if (!memberRoles.length) {
      return interaction.reply({
        embeds: [makeEmbed("error", "Sin roles", "No tienes roles que otorguen recompensa diaria.")],
        flags: MessageFlags.Ephemeral
      });
    }

    // Obtener recompensas según roles
    const placeholders = memberRoles.map(() => '?').join(',');
    const rows = await db.query(
      `SELECT role_id, ammount FROM role_rewards WHERE role_id IN (${placeholders})`,
      memberRoles
    );

    if (rows.length === 0) {
      return interaction.reply({
        embeds: [makeEmbed("info", "Sin recompensa", "Tus roles no otorgan monedas diarias.")],
        flags: MessageFlags.Ephemeral
      });
    }

    // Sumar todas las recompensas y preparar desglose
    let total = 0;
    const breakdown = rows.map(r => {
      total += r.ammount;
      return `> <@&${r.role_id}> - **${config.emojis.coin}${r.ammount.toLocaleString()}**`;
    }).join("\n");

    // Actualizar balance del usuario
    await db.query(
      `UPDATE user_stats SET balance = balance + ? WHERE discord_id = ?`,
      [total, userId]
    );

    // Registrar cooldown 24h
    await cooldownService.setCooldown(userId, "diario", config.dailyClaim.cooldown);

    // Log de transacción
    await logTransaction({ discordId: userId, type: "daily", amount: total });

    // Enviar embed de confirmación con desglose
    return interaction.reply({
      embeds: [
        makeEmbed(
          "success",
          "Recompensa diaria",
          `${breakdown}\n\nHas recibido un total de **${config.emojis.coin}${total.toLocaleString()}**.`
        )
      ]
    });
  }
};
