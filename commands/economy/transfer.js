const { SlashCommandBuilder } = require("discord.js");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const { CV2, CV2_EPHEMERAL } = require("../../utils/ui");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transferir")
    .setDescription("Envía monedas de tu balance a otro usuario")
    .addUserOption((opt) =>
      opt.setName("destino").setDescription("Usuario al que le vas a enviar monedas").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("cantidad").setDescription("Cantidad de monedas a transferir").setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    const senderId = interaction.user.id;
    const recipient = interaction.options.getUser("destino");
    const amount = interaction.options.getInteger("cantidad");
    const coin = config.emojis.coin;

    if (senderId === recipient.id) {
      return interaction.reply({ content: "Eh pillín, no te puedes transferir monedas a ti mismo 😄.", flags: CV2_EPHEMERAL });
    }

    await interaction.deferReply();
    await userService.createUser(senderId, interaction.user.username);
    await userService.createUser(recipient.id, recipient.username);

    try {
      const senderBalance = await userService.getBalance(senderId);

      if (senderBalance < amount) {
        return interaction.editReply({
          content: `Te faltan monedas 😅. Tienes ${coin}${senderBalance.toLocaleString()} y querías enviar ${coin}${amount.toLocaleString()}.`,
          flags: CV2,
        });
      }

      await userService.removeBalance(senderId, amount, false);
      await userService.addBalance(recipient.id, amount, false);

      await transactionService.logTransaction({
        discordId: senderId,
        type: "transfer_out",
        itemName: `Transferencia a ${recipient.username}`,
        amount,
        totalPrice: amount,
      });
      await transactionService.logTransaction({
        discordId: recipient.id,
        type: "transfer_in",
        itemName: `Transferencia de ${interaction.user.username}`,
        amount,
        totalPrice: amount,
      });

      return interaction.editReply({
        content: `¡Listo! Le mandaste **${coin}${amount.toLocaleString()}** a <@${recipient.id}>.\nTe quedan ${coin}${(senderBalance - amount).toLocaleString()}.`,
        flags: CV2,
      });
    } catch (error) {
      console.error(error);
      return interaction.editReply({
        content: "Ups, la transferencia se tropezó en el camino. Inténtalo otra vez.",
        flags: CV2,
      });
    }
  },
};
