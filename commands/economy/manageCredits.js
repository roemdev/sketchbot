const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const userService = require("../../services/userService");
const { logTransaction } = require("../../services/transactionService");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("manage-credits")
    .setDescription("Gestiona los créditos de un usuario")
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
      opt.setName("amount").setDescription("Cantidad de créditos").setRequired(true).setMinValue(1)
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
      await logTransaction({ discordId: target.id, type: "admin_add", amount });
      return interaction.reply({
        content: `¡Listo! Le he sumado **${amount.toLocaleString()}** ${coin} monedas a <@${target.id}>. 🤑`,
      });
    }

    if (action === "remove") {
      await userService.removeBalance(target.id, amount, false);
      await logTransaction({ discordId: target.id, type: "admin_remove", amount: -amount });
      return interaction.reply({
        content: `Hecho. Le quité **${amount.toLocaleString()}** ${coin} monedas a <@${target.id}>. Los bolsillos un poco más vacíos... 😅`,
      });
    }
  },
};
