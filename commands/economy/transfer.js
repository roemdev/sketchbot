const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const userService = require("../../services/userService");
const { logTransaction } = require("../../services/transactionService");
const config = require("../../core.json");

const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("transferir")
      .setDescription("Transfiere monedas a otro usuario")
      .addUserOption(o => o.setName("destino").setDescription("Usuario que recibe las monedas").setRequired(true))
      .addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad a transferir").setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const senderId = interaction.user.id;
    const recipientUser = interaction.options.getUser("destino");
    const amount = interaction.options.getInteger("cantidad");

    if (senderId === recipientUser.id) {
      return interaction.reply({
        content: "No puedes transferirte monedas a ti mismo 🙃",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    await userService.createUser(senderId, interaction.user.username);
    await userService.createUser(recipientUser.id, recipientUser.username);

    try {
      const senderBalance = await userService.getBalance(senderId);

      if (senderBalance < amount) {
        return interaction.editReply({
          content: `No te alcanza. Tienes **${COIN}${senderBalance.toLocaleString()}** y quieres enviar **${COIN}${amount.toLocaleString()}**. Hace falta magia para eso.`,
        });
      }

      await userService.removeBalance(senderId, amount, false);
      await userService.addBalance(recipientUser.id, amount, false);

      await logTransaction({ discordId: senderId, type: "transfer_out", amount, itemName: `Transferencia a ${recipientUser.username}` });
      await logTransaction({ discordId: recipientUser.id, type: "transfer_in", amount, itemName: `Transferencia de ${interaction.user.username}` });

      const newBalance = senderBalance - amount;
      return interaction.editReply({
        content: `Le enviaste **${COIN}${amount.toLocaleString()}** a <@${recipientUser.id}>. Te quedan **${COIN}${newBalance.toLocaleString()}**.`,
      });
    } catch (error) {
      console.error(error);
      return interaction.editReply({
        content: "Algo salió mal con la transferencia. Intenta de nuevo.",
      });
    }
  }
};