const { SlashCommandBuilder } = require("discord.js");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const { makeContainer, CV2, CV2_EPHEMERAL } = require("../../utils/ui");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transferir")
    .setDescription("Transfiere créditos de tu balance a otro usuario")
    .addUserOption((opt) =>
      opt.setName("destino").setDescription("El usuario al que deseas enviar créditos").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("cantidad").setDescription("Cantidad de créditos a transferir").setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    const senderId = interaction.user.id;
    const recipient = interaction.options.getUser("destino");
    const amount = interaction.options.getInteger("cantidad");
    const coin = config.emojis.coin;

    if (senderId === recipient.id) {
      return interaction.reply({
        components: [makeContainer("error", "Error", "No puedes transferirte créditos a ti mismo.")],
        flags: CV2_EPHEMERAL,
      });
    }

    await interaction.deferReply();
    await userService.createUser(senderId, interaction.user.username);
    await userService.createUser(recipient.id, recipient.username);

    try {
      const senderBalance = await userService.getBalance(senderId);

      if (senderBalance < amount) {
        return interaction.editReply({
          components: [
            makeContainer(
              "error",
              "Saldo insuficiente",
              `Tu balance de ${coin}${senderBalance.toLocaleString()} no es suficiente para enviar ${coin}${amount.toLocaleString()}.`
            ),
          ],
          flags: CV2,
        });
      }

      await userService.removeBalance(senderId, amount, false);
      await userService.addBalance(recipient.id, amount, false);

      await transactionService.logTransaction({
        discordId: senderId,
        type: "transfer_out",
        itemName: `Transferencia a ${recipient.username}`,
        totalPrice: amount,
      });
      await transactionService.logTransaction({
        discordId: recipient.id,
        type: "transfer_in",
        itemName: `Transferencia de ${interaction.user.username}`,
        totalPrice: amount,
      });

      return interaction.editReply({
        components: [
          makeContainer(
            "success",
            "Transferencia exitosa",
            `Enviaste **${coin}${amount.toLocaleString()}** a <@${recipient.id}>.\nNuevo balance: ${coin}${(senderBalance - amount).toLocaleString()}.`
          ),
        ],
        flags: CV2,
      });
    } catch (error) {
      console.error(error);
      return interaction.editReply({
        components: [makeContainer("error", "Error del sistema", "Hubo un error al procesar la transferencia.")],
        flags: CV2,
      });
    }
  },
};
