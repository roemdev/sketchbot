const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
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
        content: "Oye, oye, ¿intentando enviarte monedas a ti mismo? Eso no tiene sentido. 😂",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();
    await userService.createUser(senderId, interaction.user.username);
    await userService.createUser(recipient.id, recipient.username);

    try {
      const senderBalance = await userService.getBalance(senderId);

      if (senderBalance < amount) {
        return interaction.editReply({
          content: `❌ ¡Te falta plata! Tienes **${senderBalance.toLocaleString()}** ${coin} y estás intentando enviar **${amount.toLocaleString()}** ${coin}.`
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
        content: `✅ ¡Listo! Le enviaste **${amount.toLocaleString()}** ${coin} a <@${recipient.id}>. Te quedan **${(senderBalance - amount).toLocaleString()}** ${coin}.`
      });
    } catch (error) {
      console.error(error);
      return interaction.editReply({
        content: "❌ ¡Ay, caramba! Algo se rompió por dentro al intentar transferir el dinero. Contacta a un administrador."
      });
    }
  },
};
