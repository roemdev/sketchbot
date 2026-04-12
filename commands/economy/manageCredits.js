const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const { CV2 } = require("../../utils/ui");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("manage-credits")
    .setDescription("Gestiona las monedas de un usuario")
    .addStringOption((opt) =>
      opt
        .setName("action")
        .setDescription("Acción a realizar")
        .setRequired(true)
        .addChoices({ name: "add", value: "add" }, { name: "remove", value: "remove" })
    )
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Usuario a modificar").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Cantidad de monedas").setRequired(true).setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const action = interaction.options.getString("action");
    const target = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const coin = config.emojis.coin;

    await userService.createUser(target.id, target.username);

    if (action === "add") {
      await userService.addBalance(target.id, amount, false);
      await transactionService.logTransaction({
        discordId: target.id,
        type: "admin_add",
        itemName: `Ajuste por ${interaction.user.username}`,
        amount,
      });
      return interaction.reply({
        content: `Listo, sumé **${coin}${amount.toLocaleString()}** a <@${target.id}>.`,
        flags: CV2,
      });
    }

    if (action === "remove") {
      await userService.removeBalance(target.id, amount, false);
      await transactionService.logTransaction({
        discordId: target.id,
        type: "admin_remove",
        itemName: `Ajuste por ${interaction.user.username}`,
        amount,
      });
      return interaction.reply({
        content: `Hecho, retiré **${coin}${amount.toLocaleString()}** de <@${target.id}>.`,
        flags: CV2,
      });
    }
  },
};
