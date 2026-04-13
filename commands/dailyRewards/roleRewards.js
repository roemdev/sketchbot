const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const config = require("../../core.json");

const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("role-rewards")
      .setDescription("Administra las recompensas diarias por rol")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
      .addSubcommand(sub =>
          sub.setName("add").setDescription("Añade o actualiza la recompensa de un rol")
              .addRoleOption(o => o.setName("rol").setDescription("El rol a configurar").setRequired(true))
              .addIntegerOption(o => o.setName("cantidad").setDescription("Monedas diarias").setMinValue(1).setRequired(true))
      )
      .addSubcommand(sub =>
          sub.setName("remove").setDescription("Elimina la recompensa de un rol")
              .addRoleOption(o => o.setName("rol").setDescription("El rol a eliminar").setRequired(true))
      ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const role = interaction.options.getRole("rol");

    if (subcommand === "add") {
      const amount = interaction.options.getInteger("cantidad");

      try {
        await db.query(
            "INSERT OR REPLACE INTO role_rewards (role_id, ammount) VALUES (?, ?)",
            [role.id, amount]
        );

        return interaction.reply({
          content: `Listo. **${role.name}** ahora otorga **${COIN}${amount.toLocaleString()}** diarias.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        console.error(error);
        return interaction.reply({
          content: "No se pudo guardar. Revisa la consola para más detalles.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (subcommand === "remove") {
      try {
        await db.query("DELETE FROM role_rewards WHERE role_id = ?", [role.id]);

        return interaction.reply({
          content: `**${role.name}** ya no otorga monedas diarias.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        console.error(error);
        return interaction.reply({
          content: "No se pudo eliminar. Revisa la consola para más detalles.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
};