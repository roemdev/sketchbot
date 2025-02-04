const { SlashCommandSubcommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../../assets.json');
const { updateUserBalance } = require('../utils/updateUserBalance');
const { getUserBalance } = require('../utils/getUserBalance');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('transferir')
    .setDescription('Transfiere créditos a otro usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario al que deseas transferir créditos')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('Cantidad de créditos a transferir')
        .setRequired(true)
    ),

  async execute(interaction) {
    const sender = interaction.user;
    const recipient = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('cantidad');

    if (recipient.id === sender.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle(`${assets.emoji.deny} Acción inválida`)
            .setDescription('No puedes transferirte créditos a ti mismo.')
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    const connection = interaction.client.dbConnection;
    try {
      const senderBalance = await getUserBalance(connection, sender.id);

      if (senderBalance < amount) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setTitle(`${assets.emoji.deny} Fondos insuficientes`)
              .setDescription('No tienes suficientes créditos para esta transferencia.')
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      await updateUserBalance(connection, sender.id, -amount);
      await updateUserBalance(connection, recipient.id, amount);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle(`${assets.emoji.check} Transferencia exitosa`)
            .setDescription(`Has transferido ⏣ ${amount.toLocaleString()} a <@${recipient.id}>.`)
        ]
      });
    } catch (error) {
      console.error(error);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle(`${assets.emoji.deny} Error`)
            .setDescription('Hubo un problema al realizar la transferencia.')
        ],
        flags: MessageFlags.Ephemeral
      });
    }
  },
};
