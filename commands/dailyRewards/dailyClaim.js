const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const config = require("../../core.json");
const { logTransaction } = require("../../services/transactionService");
const cooldownService = require("../../services/cooldownService");

const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("diario")
      .setDescription("Reclama tu recompensa diaria según tus roles."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Crear usuario si no existe
    await db
        .from("user_stats")
        .upsert({ discord_id: userId, username });

    // Cooldown
    const cd = await cooldownService.checkCooldown(userId, "diario");
    if (cd) {
      const resetTimestamp = Math.floor(Date.now() / 1000 + cd);
      return interaction.reply({
        content: `Ya reclamaste hoy. Vuelve <t:${resetTimestamp}:R> para la siguiente.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const memberRoles = interaction.member.roles.cache.map(r => r.id);

    if (!memberRoles.length) {
      return interaction.reply({
        content: "No tienes ningún rol que otorgue recompensa diaria.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Obtener recompensas
    const { data: rows, error } = await db
        .from("role_rewards")
        .select("role_id, ammount")
        .in("role_id", memberRoles);

    if (error) {
      console.error(error);
      return interaction.reply({
        content: "Error obteniendo recompensas.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!rows || rows.length === 0) {
      return interaction.reply({
        content: "Ninguno de tus roles otorga monedas diarias.",
        flags: MessageFlags.Ephemeral,
      });
    }

    let total = 0;

    const breakdown = rows
        .map(r => {
          total += r.ammount;
          return `> <@&${r.role_id}> → **${COIN}${r.ammount.toLocaleString()}**`;
        })
        .join("\n");

    // Obtener balance actual
    const { data: user, error: userError } = await db
        .from("user_stats")
        .select("balance")
        .eq("discord_id", userId)
        .single();

    if (userError) {
      console.error(userError);
      return interaction.reply({
        content: "Error obteniendo balance.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const newBalance = (user.balance || 0) + total;

    // Actualizar balance
    const { error: updateError } = await db
        .from("user_stats")
        .update({ balance: newBalance })
        .eq("discord_id", userId);

    if (updateError) {
      console.error(updateError);
      return interaction.reply({
        content: "Error actualizando balance.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Cooldown
    await cooldownService.setCooldown(
        userId,
        "diario",
        config.dailyClaim.cooldown
    );

    // Log
    try {
      await logTransaction({
        discordId: userId,
        type: "daily",
        amount: total,
      });
    } catch (error) {
      console.error(error);
    }

    return interaction.reply({
      content: `${breakdown}\n\nHoy te llevas **${COIN}${total.toLocaleString()}** en total.`,
    });
  },
};