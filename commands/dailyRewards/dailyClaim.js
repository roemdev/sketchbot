const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const db = require("../../services/dbService");
const config = require("../../utils/config");
const { logTransaction } = require("../../services/transactionService");
const cooldownService = require("../../services/cooldownService");
const userService = require("../../services/userService");

const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("diario")
      .setDescription("Reclama tu recompensa diaria correspondiente a tu rol más alto."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Crear usuario de manera consistente con el resto del bot
    await userService.createUser(userId, username);

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

    // Obtener recompensas configuradas
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

    // Encontrar el rol que otorga la mayor recompensa (solo se recibe el beneficio de 1 rol)
    const maxRewardRow = rows.reduce((max, row) => row.ammount > max.ammount ? row : max, rows[0]);
    const amount = maxRewardRow.ammount;
    const roleId = maxRewardRow.role_id;

    // Obtener balance del banco y realizar la transferencia cerrada
    try {
      const bankBalance = await userService.getBalance("server_bank");
      if (bankBalance < amount) {
        return interaction.reply({
          content: `❌ **El Banco del Servidor está en quiebra:** El banco no tiene suficientes monedas para pagar tu recompensa diaria en este momento (Faltan **${COIN}${(amount - bankBalance).toLocaleString("es-DO")}**). ¡Anima a la comunidad a realizar tareas con \`/trabajo\` para rellenar las arcas del banco!`,
          flags: MessageFlags.Ephemeral
        });
      }

      // Descontar del banco y añadir al usuario
      await userService.addBalance("server_bank", -amount, false);
      await logTransaction({ discordId: "server_bank", type: "bank_withdrawal", amount: -amount, itemName: `Pago de diario a <@${userId}>` });
      await userService.addBalance(userId, amount, false);
    } catch (updateError) {
      console.error(updateError);
      return interaction.reply({
        content: "Error actualizando balances con el banco.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Cooldown
    await cooldownService.setCooldown(
        userId,
        "diario",
        config.dailyClaim.cooldown || 86400
    );

    // Log de la transacción
    try {
      await logTransaction({
        discordId: userId,
        type: "daily",
        amount: amount,
      });
    } catch (error) {
      console.error(error);
    }

    // Retornar panel semántico con ContainerBuilder idéntico al de /trabajo
    const container = new ContainerBuilder()
        .setAccentColor(2067276) // DarkGreen (éxito)
        .addTextDisplayComponents(t =>
            t.setContent(
              `### 📆 ¡Recompensa Diaria Reclamada!\n` +
              `Has reclamado tu bonificación diaria correspondiente a tu rol <@&${roleId}>.\n\n` +
              `💰 **Recompensa:** +${COIN}**${amount.toLocaleString("es-DO")}** monedas`
            )
        );

    return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};