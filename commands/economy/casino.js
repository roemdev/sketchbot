const { SlashCommandBuilder, MessageFlags, ContainerBuilder, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");
const path = require("node:path");

const COIN = config.emojis.coin || "🪙";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("casino")
    .setDescription("Visualiza el estado de los fondos y reservas del Casino del Servidor"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const casinoBalance = await userService.getBalance("server_casino");

      const imagePath = path.join(__dirname, "../../assets/casino.png");
      const attachment = new AttachmentBuilder(imagePath, { name: "casino.png" });

      const container = new ContainerBuilder()
        .setAccentColor(0x6C3483) // Morado Premium de Juegos/Casino
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 🎰 Casino del Servidor\n\n` +
            `💰 **Bóveda del Casino:**\n` +
            `\`\`\`ansi\n` +
            `\u001b[1;35m🪙 ${casinoBalance.toLocaleString("es-DO")} monedas\u001b[0m\n` +
            `\`\`\`\n` +
            `📊 **Políticas del Casino:**\n` +
            `* 🏛️ **Impuesto del Fisco:** El **20%** de todas las apuestas perdidas de los jugadores se paga al **Banco del Servidor** (\`/banco\`) para sustentar los diarios.\n` +
            `* 🎰 **Juegos de la Casa:** Apuesta tus monedas en \`/blackjack\`, \`/minas\`, \`/torre\`, o \`/cara-cruz\`.\n` +
            `* 🖥️ **Riesgo de Intrusión:** El Casino es vulnerable a ataques cibernéticos mediante la opción de **Hackear Casino** en \`/crimen\`.\n`
          )
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL("attachment://casino.png")
          )
        );

      return interaction.editReply({
        components: [container],
        files: [attachment],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("[CASINO] Error al obtener reservas:", error);
      return interaction.editReply("❌ Ocurrió un error al consultar las reservas del casino.");
    }
  }
};
