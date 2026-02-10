const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("role-rewards")
    .setDescription("Administra las recompensas diarias por rol")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    // Subcomando para AÑADIR o ACTUALIZAR
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Añade o actualiza la recompensa de un rol")
        .addRoleOption(option =>
          option.setName("rol")
            .setDescription("El rol a configurar")
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName("cantidad")
            .setDescription("Cantidad de monedas diarias")
            .setMinValue(1)
            .setRequired(true))
    )
    // Subcomando para ELIMINAR
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Elimina la recompensa de un rol")
        .addRoleOption(option =>
          option.setName("rol")
            .setDescription("El rol a eliminar de la base de datos")
            .setRequired(true))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const role = interaction.options.getRole("rol");

    if (subcommand === "add") {
      const amount = interaction.options.getInteger("cantidad");

      try {
        // Usamos INSERT OR REPLACE para SQLite. 
        // Si ya existe el ID, lo reemplaza con el nuevo monto.
        await db.query(
          `INSERT OR REPLACE INTO role_rewards (role_id, ammount) VALUES (?, ?)`,
          [role.id, amount]
        );

        return interaction.reply({
          embeds: [makeEmbed("success", "Recompensa guardada", `El rol **${role.name}** ahora otorga **${config.emojis.coin}${amount.toLocaleString()}** diarios.`)],
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        console.error(error);
        return interaction.reply({
          embeds: [makeEmbed("error", "Error de Base de Datos", "No se pudo guardar el rol. Revisa la consola.")],
          flags: MessageFlags.Ephemeral
        });
      }

    } else if (subcommand === "remove") {
      try {
        const result = await db.query(
          `DELETE FROM role_rewards WHERE role_id = ?`,
          [role.id]
        );

        // Verificamos si realmente se borró algo (dependiendo del driver, changes puede variar)
        // Pero el mensaje de éxito general suele ser suficiente.
        return interaction.reply({
          embeds: [makeEmbed("success", "Recompensa eliminada", `El rol **${role.name}** ya no otorga monedas diarias.`)],
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        console.error(error);
        return interaction.reply({
          embeds: [makeEmbed("error", "Error", "No se pudo eliminar el rol.")],
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};