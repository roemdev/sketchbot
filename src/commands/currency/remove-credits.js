const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');
const { updateUserBalance } = require('./utils/updateUserBalance');

module.exports = {
  data: new SlashCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setName('remove-credits')
    .setDescription('Remueve créditos de un usuario.')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario al que remover créditos')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('La cantidad de créditos a remover')
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
        flags: MessageFlags.Ephemeral,
      });
    }

    const connection = interaction.client.dbConnection;

    try {
      await updateUserBalance(connection, user.id, -amount); // Restamos la cantidad

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle(`${assets.emoji.check} Créditos removidos`)
            .setDescription(`Se han removido ⏣ ${amount.toLocaleString()} de <@${user.id}>.`)
        ],
      });
    } catch (error) {
      console.error(`Error al remover créditos:`, error);
      interaction.reply({
        content: '❌ Hubo un error al actualizar el balance.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};