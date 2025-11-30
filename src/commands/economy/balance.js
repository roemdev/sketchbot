const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const userService = require("../../services/userService");

// Símbolo oficial de la moneda
const COIN = "⏣";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Muestra tu balance o el de otro usuario.")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuario del que quieres ver el balance")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") || interaction.user;

    const dbUser = await userService.createUser(target.id, target.username);
    const formatted = dbUser.balance.toLocaleString("es-DO");

    const isSelf = target.id === interaction.user.id;

    const mainText = isSelf
      ? `Tu balance es: **${COIN}${formatted}**`
      : `El balance de **<@${target.id}>** es: **${COIN}${formatted}**`;

    const embed = new EmbedBuilder()
      .setColor("DarkButNotBlack")
      .setDescription(mainText)

    await interaction.reply({ embeds: [embed] });
  }
};
