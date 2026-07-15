const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("emergencia")
    .setDescription("Quita un porcentaje del balance de todos los jugadores para añadirlo al Banco del Servidor.")
    .addIntegerOption(option =>
      option.setName("porcentaje")
        .setDescription("El porcentaje de balance a sustraer de los jugadores (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const percentage = interaction.options.getInteger("porcentaje");

    // Deferir respuesta de forma efímera para no dejar rastro en el canal público
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const result = await userService.applyEmergencyTax(percentage);

      const panel = new ContainerBuilder()
        .setAccentColor(10038562) // DarkRed to represent tax/bailout action
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 🚨 Medida de Emergencia Fiscal Aplicada\n\n` +
            `Se ha cobrado un impuesto de emergencia del **${percentage}%** a todos los jugadores.\n\n` +
            `📊 **Resumen del Rescate:**\n` +
            `* 👥 **Jugadores Afectados:** ${result.affectedPlayers}\n` +
            `* 🪙 **Balance Incautado:** ${result.totalDeducted.toLocaleString("es-DO")} monedas\n` +
            `* 🏛️ **Destino:** Reservas del Banco del Servidor.\n`
          )
        );

      return interaction.editReply({
        components: [panel],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("[EMERGENCIA] Error al aplicar impuesto de emergencia:", error);
      return interaction.editReply({ content: "❌ Ocurrió un error al ejecutar la medida de emergencia." });
    }
  }
};
