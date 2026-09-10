const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ContainerBuilder,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");
const path = require("node:path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ec-status")
    .setDescription("Visualiza el estado económico de las reservas del Banco y del Casino (Solo Admins)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const [bankBalance, casinoBalance] = await Promise.all([
        userService.getBalance("server_bank"),
        userService.getBalance("server_casino")
      ]);

      const minBank = (config.tasks.minBankEarn >= 1000 && config.tasks.minBankEarn % 1000 === 0)
        ? `${config.tasks.minBankEarn / 1000}k`
        : config.tasks.minBankEarn.toLocaleString("es-DO");
      const maxBank = (config.tasks.maxBankEarn >= 1000 && config.tasks.maxBankEarn % 1000 === 0)
        ? `${config.tasks.maxBankEarn / 1000}k`
        : config.tasks.maxBankEarn.toLocaleString("es-DO");
      const commission = config.tasks.commissionPercent;
      const winTax = (config.games.winTaxRate * 100).toFixed(0);
      const loseTax = (config.games.loseTaxRate * 100).toFixed(0);

      const bancoImgPath = path.join(__dirname, "../../assets/banco.png");
      const casinoImgPath = path.join(__dirname, "../../assets/casino.png");

      const attachmentBanco = new AttachmentBuilder(bancoImgPath, { name: "banco.png" });
      const attachmentCasino = new AttachmentBuilder(casinoImgPath, { name: "casino.png" });

      const container = new ContainerBuilder()
        .setAccentColor(2303786) // NotQuiteBlack
        .addTextDisplayComponents(t =>
          t.setContent(
            `# 📊 Estado Económico del Servidor\n` +
            `*Panel de control de reservas macroeconómicas para administradores.*\n\n` +
            `---\n\n` +
            `### 🏛️ Banco Central del Servidor\n` +
            `💰 **Reservas Centrales:**\n` +
            `\`\`\`ansi\n` +
            `\u001b[0;32m🪙 ${bankBalance.toLocaleString("es-DO")} monedas\u001b[0m\n` +
            `\`\`\`\n` +
            `📊 **Políticas del Banco:**\n` +
            `* 💼 **Trabajo:** Generación de **${minBank} a ${maxBank}** por tarea para las arcas, pagando comisión del **${commission}%** al trabajador.\n` +
            `* 🎲 **Impuestos de Apuestas:** Recaudación del **${winTax}%** de impuesto sobre ganancias netas de juegos.\n` +
            `* 🎰 **Impuestos del Casino:** Cobro del **${loseTax}%** de apuestas perdidas para sustentar el fondo.\n` +
            `* 📆 **Subsidio Diario:** Financiado 100% por el banco.\n\n` +
            `---\n\n` +
            `### 🎰 Casino del Servidor\n` +
            `💰 **Bóveda del Casino:**\n` +
            `\`\`\`ansi\n` +
            `\u001b[1;35m🪙 ${casinoBalance.toLocaleString("es-DO")} monedas\u001b[0m\n` +
            `\`\`\`\n` +
            `📊 **Políticas del Casino:**\n` +
            `* 🏛️ **Tasa Fiscal:** El **${loseTax}%** de apuestas perdidas se transfiere automáticamente al Banco Central.\n` +
            `* 🎲 **Juegos de la Casa:** Apuestas en Blackjack, Minas, Coinflip y Risk Tower.\n`
          )
        )
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL("attachment://banco.png"),
            new MediaGalleryItemBuilder().setURL("attachment://casino.png")
          )
        );

      return interaction.editReply({
        components: [container],
        files: [attachmentBanco, attachmentCasino],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("[EC-STATUS] Error al obtener estado económico:", error);
      return interaction.editReply("❌ Ocurrió un error al consultar el estado económico del servidor.");
    }
  }
};
