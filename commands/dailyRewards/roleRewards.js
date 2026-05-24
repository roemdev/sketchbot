const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const config = require("../../utils/config");

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
              .addIntegerOption(o => o.setName("nivel").setDescription("Nivel requerido para el rol").setMinValue(1).setRequired(true))
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
      const level = interaction.options.getInteger("nivel");

      try {
        await db
            .from("role_rewards")
            .upsert({ role_id: role.id, ammount: amount, level: level }, { onConflict: "role_id" });

        return interaction.reply({
          content: `Listo. **${role.name}** ahora otorga **${COIN}${amount.toLocaleString()}** diarias a partir de nivel **${level}**.`,
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
        await db
            .from("role_rewards")
            .delete()
            .eq("role_id", role.id);

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