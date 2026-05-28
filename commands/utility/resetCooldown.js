const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require("discord.js");
const cooldownService = require("../../services/cooldownService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset-cooldown")
    .setDescription("Resetea los cooldowns de un usuario (Solo Administradores)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o =>
      o.setName("usuario")
        .setDescription("El usuario a quien resetear el cooldown")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("comando")
        .setDescription("El comando específico a resetear (deja vacío para todos)")
        .setRequired(false)
        .addChoices(
          { name: "Trabajo (/trabajo)", value: "trabajo" },
          { name: "Diario (/diario)", value: "diario" },
          { name: "Crimen (/crimen)", value: "crimen" }
        )
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario");
    const command = interaction.options.getString("comando");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await cooldownService.resetCooldown(targetUser.id, command);

      const commandText = command ? `el cooldown del comando **/${command}**` : "todos sus cooldowns activos";
      const container = new ContainerBuilder()
        .setAccentColor(0x2ECC71) // Verde Éxito
        .addTextDisplayComponents(t =>
          t.setContent(
            `### ✅ Cooldown Reseteado\n` +
            `Se ha restablecido de forma exitosa ${commandText} para el usuario <@${targetUser.id}>.\n\n` +
            `✨ *El usuario ya puede volver a utilizar el comando de inmediato.*`
          )
        );

      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("[RESET-COOLDOWN] Error resetting cooldown:", error);
      return interaction.editReply({
        content: "❌ Ocurrió un error al intentar restablecer los cooldowns. Revisa los logs de la consola.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
