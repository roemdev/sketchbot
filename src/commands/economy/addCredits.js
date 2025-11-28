const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const userService = require("../../services/userService");

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
        .setRequired(true)),

  async execute(interaction) {
    // Verificar permisos de administrador
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "No tienes permisos para usar este comando.", ephemeral: true });
    }

    const targetUser = interaction.options.getUser("usuario");
    const amount = interaction.options.getInteger("cantidad");

    const user = await userService.createUser(targetUser.id, targetUser.username);
    await userService.addBalance(targetUser.id, amount);

    return interaction.reply(`${amount} créditos añadidos a ${targetUser.username}. Nuevo balance: **${user.balance + amount}** 💰`);
  }
};
