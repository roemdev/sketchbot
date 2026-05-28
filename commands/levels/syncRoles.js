const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require("discord.js");
const roleRewardService = require("../../services/roleRewardService");
const config = require("../../utils/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sync-roles")
    .setDescription("Sincroniza masivamente los roles de nivel de todos los usuarios")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { processed, updated } = await roleRewardService.syncAllMembers(interaction.guild);

      const embed = new ContainerBuilder()
        .setAccentColor(0x27AE60) // Verde éxito tenue
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 🔄 Sincronización Completada\n` +
            `El proceso de sincronización de roles por nivel ha finalizado exitosamente.\n\n` +
            `👥 **Usuarios analizados:** **${processed.toLocaleString()}**\n` +
            `🎖️ **Usuarios actualizados:** **${updated.toLocaleString()}**\n\n` +
            `*Nota: Los roles se han asignado o removido automáticamente según los niveles correspondientes en la base de datos.*`
          )
        );

      return interaction.editReply({
        components: [embed],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("[SYNC-ROLES] Error executing sync command:", error);
      return interaction.editReply({
        content: "❌ Ocurrió un error al intentar sincronizar los roles de nivel. Por favor, revisa los logs de la consola.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
