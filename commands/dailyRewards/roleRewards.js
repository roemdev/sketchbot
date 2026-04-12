const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
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
          content: `¡Listo el pollo! El rol **${role.name}** ahora soltará **${amount.toLocaleString()}** ${config.emojis.coin} monedas cada día. 💰`,
        });
      } catch (error) {
        console.error(error);
        return interaction.reply({
          content: `❌ Uy, algo se rompió en la base de datos al guardar ese rol. Intenta de nuevo.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (subcommand === "remove") {
      try {
        await db.query(`DELETE FROM role_rewards WHERE role_id = ?`, [role.id]);

        return interaction.reply({
          content: `Se acabó la fiesta para el rol **${role.name}**. Ya no dará monedas diarias. 👋`,
        });
      } catch (error) {
        console.error(error);
        return interaction.reply({
          content: `❌ Fallo general al intentar eliminar ese rol. Avisa a los técnicos.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
