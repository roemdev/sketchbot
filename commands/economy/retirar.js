const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

const COIN = config.emojis.coin || "🪙";

module.exports = {
  data: new SlashCommandBuilder()
      .setName("retirar")
      .setDescription("Retira monedas de tu banco a tu cartera")
      .addStringOption(o =>
          o.setName("cantidad")
              .setDescription("Cantidad de monedas a retirar (número o 'todo')")
              .setRequired(true)
      ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const input = interaction.options.getString("cantidad").trim().toLowerCase();

    await interaction.deferReply();

    const dbUser = await userService.createUser(userId, interaction.user.username);
    const bankBalance = await userService.getBankBalance(userId);

    if (bankBalance <= 0) {
      const container = new ContainerBuilder()
        .setAccentColor(0xC0392B) // Rojo error
        .addTextDisplayComponents(t => t.setContent(`### 🏦 Banco Vacío\nNo tienes monedas guardadas en tu banco para retirar.`));
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    let amount = 0;
    if (input === "todo") {
      amount = bankBalance;
    } else {
      amount = parseInt(input, 10);
      if (isNaN(amount) || amount <= 0) {
        const container = new ContainerBuilder()
          .setAccentColor(0xC0392B)
          .addTextDisplayComponents(t => t.setContent(`### ❌ Cantidad Inválida\nPor favor, ingresa una cantidad numérica válida mayor a 0 o escribe **"todo"**.`));
        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
    }

    if (bankBalance < amount) {
      const container = new ContainerBuilder()
        .setAccentColor(0xC0392B)
        .addTextDisplayComponents(t => t.setContent(`### ❌ Fondos Insuficientes\nNo puedes retirar esa cantidad. Solo tienes **${COIN}${bankBalance.toLocaleString("es-DO")}** en el banco.`));
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    // Procesar retiro
    await userService.addBalance(userId, amount, false);
    const newBankBalance = bankBalance - amount;
    await userService.setBankBalance(userId, newBankBalance, interaction.user.username);

    const avatarUrl = interaction.user.displayAvatarURL({ extension: "png", size: 128 });
    const total = (dbUser.balance + amount) + newBankBalance;
    const maxBankLimit = 2000000;

    const container = new ContainerBuilder()
      .setAccentColor(0x2ECC71) // Verde éxito
      .addTextDisplayComponents(t => t.setContent(`### 🏦 ¡Retiro Completado!`))
      .addSeparatorComponents(s => s)
      .addSectionComponents(section =>
          section
              .addTextDisplayComponents(t =>
                  t.setContent(
                      `Has retirado ${COIN}**${amount.toLocaleString("es-DO")}** de tu banco.\n\n` +
                      `**💰 Tus Cuentas:**\n` +
                      `- **👛 Cartera:** ${COIN}**${(dbUser.balance + amount).toLocaleString("es-DO")}**\n` +
                      `- **🏦 Banco:** ${COIN}**${newBankBalance.toLocaleString("es-DO")}** / **${maxBankLimit.toLocaleString("es-DO")}**\n\n` +
                      `- **💼 Total:** ${COIN}**${total.toLocaleString("es-DO")}**`
                  )
              )
              .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
      );

    return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
