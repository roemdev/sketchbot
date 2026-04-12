const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const { makeContainer, CV2_EPHEMERAL } = require("../../utils/ui");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("role-rewards")
    .setDescription("Administra las recompensas diarias por rol")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Añade o actualiza la recompensa de un rol")
        .addRoleOption((opt) =>
          opt.setName("rol").setDescription("El rol a configurar").setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName("cantidad").setDescription("Cantidad de monedas diarias").setMinValue(1).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Elimina la recompensa de un rol")
        .addRoleOption((opt) =>
          opt.setName("rol").setDescription("El rol a eliminar").setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const role = interaction.options.getRole("rol");

    if (subcommand === "add") {
      const amount = interaction.options.getInteger("cantidad");

      try {
        await db.query(
          `INSERT OR REPLACE INTO role_rewards (role_id, ammount) VALUES (?, ?)`,
          [role.id, amount]
        );

        return interaction.reply({
          components: [
            makeContainer(
              "success",
              "Recompensa guardada",
              `El rol **${role.name}** ahora otorga **${config.emojis.coin}${amount.toLocaleString()}** diarios.`
            ),
          ],
          flags: CV2_EPHEMERAL,
        });
      } catch (error) {
        console.error(error);
        return interaction.reply({
          components: [makeContainer("error", "Error de base de datos", "No se pudo guardar el rol.")],
          flags: CV2_EPHEMERAL,
        });
      }
    }

    if (subcommand === "remove") {
      try {
        await db.query(`DELETE FROM role_rewards WHERE role_id = ?`, [role.id]);

        return interaction.reply({
          components: [
            makeContainer(
              "success",
              "Recompensa eliminada",
              `El rol **${role.name}** ya no otorga monedas diarias.`
            ),
          ],
          flags: CV2_EPHEMERAL,
        });
      } catch (error) {
        console.error(error);
        return interaction.reply({
          components: [makeContainer("error", "Error", "No se pudo eliminar el rol.")],
          flags: CV2_EPHEMERAL,
        });
      }
    }
  },
};
