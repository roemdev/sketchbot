const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const assets = require('../../../../config/assets.json');
const { updateUserBalance } = require('./utils/userBalanceUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setName('remove-credits')
    .setDescription('Remueve monedas de un usuario.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario al que remover monedas')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('La cantidad de monedas a remover')
        .setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('cantidad');

    if (!user || isNaN(amount) || amount <= 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle(`${assets.emoji.deny} Uso incorrecto`)
            .setDescription('Debes proporcionar un usuario y una cantidad válida.\n> Ejemplo: `/remove-credits usuario:@usuario cantidad:100`')
        ],
      });
    }

    const connection = interaction.client.dbConnection;

    try {
      await updateUserBalance(connection, user.id, -amount); // Restamos la cantidad

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setDescription(`Se han removido **${amount.toLocaleString()}**🪙 de <@${user.id}>.`)
        ],
      });
    } catch (error) {
      console.error(`Error al remover monedas:`, error);
      interaction.reply({
        content: '❌ Hubo un error al actualizar el balance.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};