const { SlashCommandBuilder, MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

function buildBalanceContainer(targetUser, dbUser, bankBalance) {
  const avatarUrl = targetUser.displayAvatarURL({ extension: "png", size: 128 });

  return new ContainerBuilder()
    .setAccentColor(0x2F3136) // NotQuiteBlack
    .addTextDisplayComponents(t =>
      t.setContent(`## Balance de ${targetUser.username}`)
    ).addSeparatorComponents(s => s)
    .addSectionComponents(section =>
      section
        .addTextDisplayComponents(t =>
          t.setContent(
            `Cartera\n` +
            `**${dbUser.balance.toLocaleString("es-DO")}**\n` +
            `Banco\n` +
            `**${bankBalance.toLocaleString("es-DO")}** / **${(2000000).toLocaleString("es-DO")}**`
          )
        )
        .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
    )
    .addSeparatorComponents(s => s)
    .addActionRowComponents(row =>
      row.setComponents(
        new ButtonBuilder()
          .setCustomId(`balance_deposit10_${targetUser.id}`)
          .setLabel("Depositar 10%")
          .setEmoji("📥")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`balance_withdraw10_${targetUser.id}`)
          .setLabel("Retirar 10%")
          .setEmoji("📤")
          .setStyle(ButtonStyle.Primary)
      )
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Muestra tu balance de monedas o el de otro usuario")
    .addUserOption(o =>
      o.setName("usuario")
        .setDescription("El usuario a consultar")
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario") || interaction.user;

    const dbUser = await userService.createUser(targetUser.id, targetUser.username);
    const bankBalance = await userService.getBankBalance(targetUser.id);

    const container = buildBalanceContainer(targetUser, dbUser, bankBalance);

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("balance_")) return false;

    const parts = interaction.customId.split("_");
    const action = parts[1]; // "deposit10" or "withdraw10"
    const userId = parts[2];

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: "Este no es tu balance.", flags: MessageFlags.Ephemeral });
    }

    const dbUser = await userService.getUser(userId);
    const bankBalance = await userService.getBankBalance(userId);
    const maxBankLimit = 2000000;

    if (action === "deposit10") {
      let amount = Math.floor(dbUser.balance * 0.1);
      if (amount <= 0 && dbUser.balance > 0) {
        amount = 1;
      }

      if (amount <= 0) {
        return interaction.reply({ content: "No tienes monedas en tu cartera para depositar.", flags: MessageFlags.Ephemeral });
      }

      const maxDepositable = maxBankLimit - bankBalance;
      if (maxDepositable <= 0) {
        return interaction.reply({ content: "Tu banco ya está en el límite máximo de 2,000,000 monedas.", flags: MessageFlags.Ephemeral });
      }

      amount = Math.min(amount, maxDepositable);

      await userService.addBalance(userId, -amount, false);
      const newBankBalance = bankBalance + amount;
      await userService.setBankBalance(userId, newBankBalance, interaction.user.username);

      const freshUser = await userService.getUser(userId);
      const container = buildBalanceContainer(interaction.user, freshUser, newBankBalance);

      return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === "withdraw10") {
      let amount = Math.floor(bankBalance * 0.1);
      if (amount <= 0 && bankBalance > 0) {
        amount = 1;
      }

      if (amount <= 0) {
        return interaction.reply({ content: "No tienes monedas en el banco para retirar.", flags: MessageFlags.Ephemeral });
      }

      await userService.addBalance(userId, amount, false);
      const newBankBalance = bankBalance - amount;
      await userService.setBankBalance(userId, newBankBalance, interaction.user.username);

      const freshUser = await userService.getUser(userId);
      const container = buildBalanceContainer(interaction.user, freshUser, newBankBalance);

      return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    return false;
  }
};
