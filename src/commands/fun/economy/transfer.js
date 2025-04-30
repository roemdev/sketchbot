const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../../config/assets.json');
const { updateUserBalance, getUserBalance } = require('./utils/userBalanceUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transferir')
    .setDescription('Transfiere monedas a otro usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario al que deseas transferir monedas')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('Cantidad de monedas a transferir')
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
            .setDescription('No puedes transferirte monedas a ti mismo.')
        ],
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
              .setDescription('No tienes suficientes monedas para esta transferencia.')
          ],
        });
      }

      await updateUserBalance(connection, sender.id, -amount);
      await updateUserBalance(connection, recipient.id, amount);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setDescription(`Has transferido **${amount.toLocaleString()}**🪙 a <@${recipient.id}>.`)
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
