const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const userService = require("../../services/userService");
const { logTransaction } = require("../../services/transactionService");
const config = require("../../core.json");

const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("manage-credits")
      .setDescription("Gestiona las monedas de un usuario")
      .addStringOption(o =>
          o.setName("action").setDescription("Acción a realizar").setRequired(true)
              .addChoices({ name: "add", value: "add" }, { name: "remove", value: "remove" })
      )
      .addUserOption(o => o.setName("user").setDescription("Usuario a modificar").setRequired(true))
      .addIntegerOption(o => o.setName("amount").setDescription("Cantidad de monedas").setRequired(true).setMinValue(1))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const action = interaction.options.getString("action");
    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    await userService.createUser(targetUser.id, targetUser.username);

    if (action === "add") {
      await userService.addBalance(targetUser.id, amount, false);
      await logTransaction({ discordId: targetUser.id, type: "admin_add", amount });
      return interaction.reply({
        content: `Se añadieron **${COIN}${amount.toLocaleString()}** a <@${targetUser.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (action === "remove") {
      await userService.removeBalance(targetUser.id, amount, false);
      await logTransaction({ discordId: targetUser.id, type: "admin_remove", amount });
      return interaction.reply({
        content: `Se quitaron **${COIN}${amount.toLocaleString()}** a <@${targetUser.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
};