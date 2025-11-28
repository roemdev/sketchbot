const { SlashCommandBuilder } = require("discord.js");
const userService = require("../../services/userService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Muestra tu balance de créditos"),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const username = interaction.user.username;

    // Crear usuario si no existe
    const user = await userService.createUser(discordId, username);

    await interaction.reply(`${username}, tu balance actual es: **${user.balance} créditos** 💰`);
  }
};
