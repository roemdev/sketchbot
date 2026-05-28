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
      const taxPercent = ((config.bank?.taxRate ?? 0.05) * 100).toFixed(0);

      const imagePath = path.join(__dirname, "../../assets/banco.png");
      const attachment = new AttachmentBuilder(imagePath, { name: "banco.png" });

      const container = new ContainerBuilder()
        .setAccentColor(0x2ECC71) // Verde esmeralda
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 🏛️ Banco del Servidor\n\n` +
            `💰 **Reservas Centrales:**\n` +
            `\`\`\`ansi\n` +
            `\u001b[1;32m${bankBalance.toLocaleString("es-DO")} monedas\u001b[0m\n` +
            `\`\`\`\n` +
            `📊 **Impuestos actuales:**\n` +
            `* 💼 Trabajo **${taxPercent}%**\n` +
            `* 🎲 Apuestas **10%**\n`
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
