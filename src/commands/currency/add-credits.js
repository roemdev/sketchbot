const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json')
const { updateUserBalance } = require('./utils/updateUserBalance');

module.exports = {
  data: new SlashCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setName('add-credits')
    .setDescription('Añade créditos a un usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario al que añadir créditos')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('La cantidad de créditos a añadir')
        .setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('cantidad');

    if (!user || isNaN(amount)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle(`${assets.emoji.deny} Uso incorrecto`)
            .setDescription('Debes mencionar un usuario y proporcionar una cantidad correcta.\n> Ejemplo: `/add-credits usuario:@usuario cantidad:1000`')
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const connection = interaction.client.dbConnection;

    try {
      await updateUserBalance(connection, user.id, amount);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle(`${assets.emoji.check} Créditos añadidos`)
            .setDescription(`Se han añadido ⏣ ${amount.toLocaleString()} a <@${user.id}>.`)
        ],
      });
    } catch (error) {
      interaction.reply({
        content: '❌ Hubo un error al actualizar el balance.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
