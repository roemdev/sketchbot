const { SlashCommandBuilder, MessageFlags, ContainerBuilder, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");
const path = require("node:path");

const COIN = config.emojis.coin || "🪙";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("banco")
    .setDescription("Visualiza el estado de las reservas y fondos del Banco del Servidor"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const bankBalance = await userService.getBalance("server_bank");

      const imagePath = path.join(__dirname, "../../assets/banco.png");
      const attachment = new AttachmentBuilder(imagePath, { name: "banco.png" });

      const container = new ContainerBuilder()
        .setAccentColor(0x2F3136) // NotQuiteBlack
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 🏛️ Banco del Servidor\n\n` +
            `💰 **Reservas Centrales:**\n` +
            `\`\`\`ansi\n` +
            `\u001b[0;32m🪙 ${bankBalance.toLocaleString("es-DO")} monedas\u001b[0m\n` +
            `\`\`\`\n` +
            `📊 **Políticas Macroeconómicas:**\n` +
            `* 💼 **Trabajo (\`/trabajo\`):** Aporta el **100%** de la generación (50k-120k) a la reserva y paga **10%-20%** de comisión limpia al trabajador.\n` +
            `* 🎲 **Apuestas (Juegos):** Impuesto del **10%** sobre ganancias netas para sustentar el fondo.\n` +
            `* 📆 **Diario (\`/diario\`):** Financiado en su totalidad por los fondos del banco.\n`
          )
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL("attachment://banco.png")
          )
        );

      return interaction.editReply({
        components: [container],
        files: [attachment],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("[BANCO] Error al obtener reservas:", error);
      return interaction.editReply("❌ Ocurrió un error al consultar las reservas del banco.");
    }
  }
};
