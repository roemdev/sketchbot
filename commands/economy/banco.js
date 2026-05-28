const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

const COIN = config.emojis.coin || "🪙";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("banco")
    .setDescription("Visualiza el estado de las reservas y fondos del Banco del Servidor"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const bankBalance = await userService.getBalance("server_bank");
      const taxPercent = ((config.bank?.taxRate ?? 0.05) * 100).toFixed(0);

      const container = new ContainerBuilder()
        .setAccentColor(0xF1C40F) // Dorado metálico
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 🏛️ Banco del Servidor\n` +
            `El Banco del Servidor es la tesorería central de la economía del servidor y resguarda los fondos públicos acumulados.\n\n` +
            `💰 **Reservas Totales:** ${COIN}**${bankBalance.toLocaleString("es-DO")}** monedas\n\n` +
            `📊 **Fuentes de Financiación:**\n` +
            `*   **Impuesto sobre tareas:** **${taxPercent}%** deducido de cada trabajo completado por los usuarios (` + "`/trabajo`" + `).\n` +
            `*   **Multas Estatales:** Todas las fianzas cobradas a los delincuentes atrapados (` + "`/crimen`" + `).\n\n` +
            `⚠️ *¿Estás corto de monedas? Intenta desviar fondos del banco mediante* ` + "`/crimen`" + ` *(Fraude al Banco), pero ten cuidado, ¡las multas por fraude fiscal son altísimas!*`
          )
        );

      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("[BANCO] Error al obtener reservas:", error);
      return interaction.editReply("❌ Ocurrió un error al consultar las reservas del banco.");
    }
  }
};
