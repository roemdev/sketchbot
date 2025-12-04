const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("role-rewards")
    .setDescription("Administra las recompensas diarias por rol")
    .addStringOption(opt =>
      opt.setName("action")
        .setDescription("Acción a realizar")
        .setRequired(true)
        .addChoices(
          { name: "add | update", value: "add" },
          { name: "remove", value: "remove" }
        )
    )
    .addRoleOption(opt =>
      opt.setName("rol")
        .setDescription("Rol a administrar")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("amount")
        .setDescription("Cantidad de monedas (solo para 'add')")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const action = interaction.options.getString("action");
    const role = interaction.options.getRole("rol");
    const amount = interaction.options.getInteger("amount");

    if (action === "add") {
      if (amount == null || amount <= 0) {
        return interaction.reply({
          embeds: [makeEmbed("error", "Cantidad inválida", "Debes indicar una cantidad válida mayor a 0 para 'add'.")],
          flags: MessageFlags.Ephemeral
        });
      }

      // Insert o update en la DB
      await db.query(
        `INSERT INTO role_rewards (role_id, ammount) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE ammount = VALUES(ammount), updated_at = CURRENT_TIMESTAMP`,
        [role.id, amount]
      );

      return interaction.reply({
        embeds: [makeEmbed("success", "Recompensa agregada", `El rol **<@&${role.id}>** ahora otorga **${config.emojis.coin}${amount.toLocaleString()}** diario.`)],
        flags: MessageFlags.Ephemeral
      });

    } else if (action === "remove") {

      // Borrado de la DB
      await db.query(
        `DELETE FROM role_rewards WHERE role_id = ?`,
        [role.id]
      );

      return interaction.reply({
        embeds: [makeEmbed("success", "Recompensa eliminada", `El rol **<@&${role.id}>** ya no otorga monedas diarias.`)],
        flags: MessageFlags.Ephemeral
      });
    } else {
      return interaction.reply({
        embeds: [makeEmbed("error", "Acción desconocida", "La acción debe ser 'add' o 'remove'.")],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
