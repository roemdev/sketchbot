const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const userService = require("../../services/userService");
const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("manage-credits")
    .setDescription("Gestiona los créditos de un usuario")
    .addStringOption(option =>
      option.setName("action")
        .setDescription("Acción a realizar: add o remove")
        .setRequired(true)
        .addChoices(
          { name: "add", value: "add" },
          { name: "remove", value: "remove" }
        )
    )
    .addUserOption(option =>
      option.setName("user")
        .setDescription("Usuario a modificar")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("amount")
        .setDescription("Cantidad de créditos")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const action = interaction.options.getString("action");
    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    // Asegurar registro
    await userService.createUser(targetUser.id, targetUser.username);

    let updated;
    let embed;

    if (action === "add") {
      updated = await userService.addBalance(targetUser.id, amount);
      embed = makeEmbed(
        "success",
        "¡Créditos añadidos!",
        `Se añadieron **${config.emojis.coin}${amount.toLocaleString()}** a <@${targetUser.id}>.`
      );
    } else if (action === "remove") {
      updated = await userService.removeBalance(targetUser.id, amount);
      embed = makeEmbed(
        "success",
        "¡Créditos eliminados!",
        `Se eliminaron **${config.emojis.coin}${amount.toLocaleString()}** de <@${targetUser.id}>.`
      );
    } else {
      return interaction.reply({ content: "Acción inválida.", ephemeral: true });
    }

    return interaction.reply({ embeds: [embed] });
  }
};
