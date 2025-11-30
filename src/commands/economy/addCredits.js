const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const userService = require("../../services/userService");

const COIN = "⏣";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addcredits")
    .setDescription("Añade créditos a un usuario")
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuario a quien añadir créditos")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("Cantidad de créditos a añadir")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario");
    const amount = interaction.options.getInteger("cantidad");

    const user = await userService.createUser(targetUser.id, targetUser.username);
    await userService.addBalance(targetUser.id, amount);

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setDescription(`Se añadieron **${COIN}${amount}** a <@${targetUser.id}>.\n-# Nuevo balance: **${COIN}${user.balance + amount}**`)

    return interaction.reply({ embeds: [embed] });
  }
};
