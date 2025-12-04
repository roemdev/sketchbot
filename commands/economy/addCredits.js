const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const userService = require("../../services/userService");
const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addcredits")
    .setDescription("Añade créditos a un usuario")
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("Usuario a quien añadir créditos")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("Cantidad de créditos a añadir")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario");
    const amount = interaction.options.getInteger("cantidad");

    // Asegurar registro
    const userRecord = await userService.createUser(
      targetUser.id,
      targetUser.username
    );

    // Registrar balance actualizado
    const updated = await userService.addBalance(targetUser.id, amount);

    // Crear embed con factory
    const embed = makeEmbed(
      "success",
      "¡Créditos añadidos!",
      `Se añadieron **${config.emojis.coin}${amount.toLocaleString()}** a <@${targetUser.id}>.\n`
    );

    return interaction.reply({ embeds: [embed] });
  }
};
