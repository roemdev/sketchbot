const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const assets = require('../../../../config/assets.json')
const { updateUserBalance } = require('./utils/userBalanceUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setName('add-coins')
    .setDescription('Añade monedas a un usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('El usuario al que añadir monedas')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('cantidad')
        .setDescription('La cantidad de monedas a añadir')
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
      });
    }

    const connection = interaction.client.dbConnection;

    try {
      await updateUserBalance(connection, user.id, amount);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setDescription(`Se han añadido **${amount.toLocaleString()}**🪙 a <@${user.id}>.`)
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
