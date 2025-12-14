const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transferir")
    .setDescription("Transfiere créditos de tu balance a otro usuario")
    .addUserOption(option =>
      option.setName("destino")
        .setDescription("El usuario al que deseas enviar créditos")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("cantidad")
        .setDescription("La cantidad de créditos a transferir")
        .setRequired(true)
        .setMinValue(1) // Asegura que la cantidad sea al menos 1
    ),

  async execute(interaction) {
    const senderId = interaction.user.id;
    const recipientUser = interaction.options.getUser("destino");
    const amount = interaction.options.getInteger("cantidad");

    // 1. Validaciones Iniciales
    if (senderId === recipientUser.id) {
      return interaction.reply({
        embeds: [
          makeEmbed("error", "Error de Transferencia", "No puedes transferirte créditos a ti mismo.")
        ],
        ephemeral: true
      });
    }

    await interaction.deferReply(); // Deferir la respuesta

    // 2. Asegurar que ambos usuarios existan en el sistema
    await userService.createUser(senderId, interaction.user.username);
    await userService.createUser(recipientUser.id, recipientUser.username);

    try {
      // 3. Obtener el balance del remitente
      const senderBalance = await userService.getBalance(senderId);

      // 4. Verificar si el remitente tiene suficiente saldo
      if (senderBalance < amount) {
        return interaction.editReply({
          embeds: [
            makeEmbed("error", "Saldo Insuficiente", `Tu balance actual de ${config.emojis.coin}${senderBalance.toLocaleString()} no es suficiente para enviar ${config.emojis.coin}${amount.toLocaleString()}.`)
          ],
        });
      }

      // 5. Ejecutar la transferencia: Remover del remitente y añadir al destinatario
      await userService.removeBalance(senderId, amount);
      await userService.addBalance(recipientUser.id, amount);

      // (Opcional) 6. Registrar la transacción
      /* 
      await transactionService.logTransaction({
        discordId: senderId,
        type: "transfer_out",
        itemName: `Transferencia a ${recipientUser.username}`,
        totalPrice: amount
      });
      await transactionService.logTransaction({
        discordId: recipientUser.id,
        type: "transfer_in",
        itemName: `Transferencia de ${interaction.user.username}`,
        totalPrice: amount
      });
      */

      // 7. Respuesta de éxito (efímera para el remitente)
      const newBalance = senderBalance - amount;

      await interaction.editReply({
        embeds: [
          makeEmbed(
            "success",
            "¡Transferencia Exitosa!",
            `Has transferido **${config.emojis.coin}${amount.toLocaleString()}** a <@${recipientUser.id}>.\nTu nuevo balance es: ${config.emojis.coin}${newBalance.toLocaleString()}.`
          )
        ],
      });
    } catch (error) {
      console.error(error);
      return interaction.editReply({
        embeds: [
          makeEmbed("error", "Error del Sistema", "Hubo un error al procesar la transferencia. Intenta de nuevo más tarde.")
        ],
      });
    }
  }
};