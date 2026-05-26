const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

const COIN = config.emojis.coin || "🪙";

module.exports = {
  data: new SlashCommandBuilder()
      .setName("depositar")
      .setDescription("Deposita monedas de tu cartera en el banco (máx. 2,000,000)")
      .addStringOption(o =>
          o.setName("cantidad")
              .setDescription("Cantidad de monedas a depositar (número o 'todo')")
              .setRequired(true)
      ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const input = interaction.options.getString("cantidad").trim().toLowerCase();

    await interaction.deferReply();

    const dbUser = await userService.createUser(userId, interaction.user.username);
    const bankBalance = await userService.getBankBalance(userId);
    const maxBankLimit = 2000000;
    const maxDepositable = maxBankLimit - bankBalance;

    if (maxDepositable <= 0) {
      const container = new ContainerBuilder()
        .setAccentColor(0xC0392B) // Rojo error
        .addTextDisplayComponents(t => t.setContent(`### 🏦 Banco Lleno\nTu banco ya está en el límite máximo de **${COIN}${maxBankLimit.toLocaleString("es-DO")}** monedas.`));
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    let amount = 0;
    if (input === "todo") {
      amount = Math.min(dbUser.balance, maxDepositable);
    } else {
      amount = parseInt(input, 10);
      if (isNaN(amount) || amount <= 0) {
        const container = new ContainerBuilder()
          .setAccentColor(0xC0392B)
          .addTextDisplayComponents(t => t.setContent(`### ❌ Cantidad Inválida\nPor favor, ingresa una cantidad numérica válida mayor a 0 o escribe **"todo"**.`));
        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
    }

    if (amount <= 0) {
      const container = new ContainerBuilder()
        .setAccentColor(0xC0392B)
        .addTextDisplayComponents(t => t.setContent(`### ❌ Sin Fondos\nNo tienes monedas en tu cartera para depositar.`));
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (dbUser.balance < amount) {
      const container = new ContainerBuilder()
        .setAccentColor(0xC0392B)
        .addTextDisplayComponents(t => t.setContent(`### ❌ Fondos Insuficientes\nNo tienes suficientes monedas en tu cartera. Tienes **${COIN}${dbUser.balance.toLocaleString("es-DO")}**.`));
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (bankBalance + amount > maxBankLimit) {
      const container = new ContainerBuilder()
        .setAccentColor(0xC0392B)
        .addTextDisplayComponents(t => t.setContent(`### ❌ Límite Excedido\nNo puedes depositar esa cantidad. Superaría el límite máximo de **${COIN}${maxBankLimit.toLocaleString("es-DO")}** monedas en el banco.`));
      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    // Procesar depósito
    await userService.addBalance(userId, -amount, false);
    const newBankBalance = bankBalance + amount;
    await userService.setBankBalance(userId, newBankBalance, interaction.user.username);

    const avatarUrl = interaction.user.displayAvatarURL({ extension: "png", size: 128 });
    const total = (dbUser.balance - amount) + newBankBalance;

    const container = new ContainerBuilder()
      .setAccentColor(0x2ECC71) // Verde éxito
      .addTextDisplayComponents(t => t.setContent(`### 🏦 ¡Depósito Completado!`))
      .addSeparatorComponents(s => s)
      .addSectionComponents(section =>
          section
              .addTextDisplayComponents(t =>
                  t.setContent(
                      `Has depositado ${COIN}**${amount.toLocaleString("es-DO")}** en el banco.\n\n` +
                      `**💰 Tus Cuentas:**\n` +
                      `- **👛 Cartera:** ${COIN}**${(dbUser.balance - amount).toLocaleString("es-DO")}**\n` +
                      `- **🏦 Banco:** ${COIN}**${newBankBalance.toLocaleString("es-DO")}** / **${maxBankLimit.toLocaleString("es-DO")}**\n\n` +
                      `- **💼 Total:** ${COIN}**${total.toLocaleString("es-DO")}**`
                  )
              )
              .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
      );

    return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
