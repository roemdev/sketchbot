const { SlashCommandBuilder, MessageFlags, ContainerBuilder, AttachmentBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");
const path = require("node:path");

const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("banco")
    .setDescription("Visualiza el estado de las reservas y fondos del Banco del Servidor"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const bankBalance = await userService.getBalance("server_bank");

      const minBank = (config.tasks.minBankEarn >= 1000 && config.tasks.minBankEarn % 1000 === 0) ? `${config.tasks.minBankEarn / 1000}k` : config.tasks.minBankEarn.toLocaleString("es-DO");
      const maxBank = (config.tasks.maxBankEarn >= 1000 && config.tasks.maxBankEarn % 1000 === 0) ? `${config.tasks.maxBankEarn / 1000}k` : config.tasks.maxBankEarn.toLocaleString("es-DO");
      const commission = config.tasks.commissionPercent;
      const winTax = (config.games.winTaxRate * 100).toFixed(0);
      const loseTax = (config.games.loseTaxRate * 100).toFixed(0);

      const imagePath = path.join(__dirname, "../../assets/banco.png");
      const attachment = new AttachmentBuilder(imagePath, { name: "banco.png" });

      const container = new ContainerBuilder()
        .setAccentColor(2303786) // NotQuiteBlack
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 🏛️ Banco del Servidor\n\n` +
            `💰 **Reservas Centrales:**\n` +
            `\`\`\`ansi\n` +
            `\u001b[0;32m🪙 ${bankBalance.toLocaleString("es-DO")} monedas\u001b[0m\n` +
            `\`\`\`\n` +
            `📊 **Políticas Macroeconómicas:**\n` +
            `* 💼 **Trabajo (\`/trabajo\`):** Cada tarea genera de **${minBank} a ${maxBank}** directamente para las arcas del banco, pagando una comisión limpia del **${commission}%** al trabajador.\n` +
            `* 🎲 **Impuestos de Apuestas:** El **${winTax}%** de impuesto sobre las ganancias netas de todos los juegos de apuestas se transfiere al banco central.\n` +
            `* 🎰 **Impuestos del Casino:** El **${loseTax}%** de todas las apuestas que pierden los jugadores en el casino se cobra como tasa fiscal para sustentar el fondo.\n` +
            `* 📆 **Subsidio Diario (\`/diario\`):** Recompensas financiadas en su totalidad por el banco. Si los fondos se agotan, el banco entra en quiebra temporal.\n` +
            `* 🏛️ **Riesgo de Fraude:** El banco es vulnerable a malversaciones de fondos mediante **Estafa** en \`/crimen\`. Las multas por crímenes fallidos también incrementan estas reservas.\n`
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
