const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const assets = require('../../assets.json')
const { updateUserBalance } = require('../commands/currency/utils/updateUserBalance');

module.exports = {
  name: 'add-credits',
  description: 'Añade créditos a un usuario.',
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageEvents)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle(`${assets.emoji.deny} Sin permisos`)
            .setDescription(`No tienes permiso para ejecutar este comando.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const user = message.mentions.users.first();
    const amount = parseInt(args[1], 10);

    if (!user || isNaN(amount)) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle(`${assets.emoji.deny} Uso incorrecto`)
            .setDescription('Debes mencionar un usuario y proporcionar una cantidad correcta.\n> Ejemplo: `!add-credits @usuario cantidad`')
        ],
        allowedMentions: { repliedUser: false }
      })
        ;
    }

    const connection = message.client.dbConnection;

    try {

      await updateUserBalance(connection, user.id, amount);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle(`${assets.emoji.check} Créditos añadidos`)
            .setDescription(`Se han añadido ⏣ ${amount.toLocaleString()} a <@${user.id}>.`)
        ],
        allowedMentions: { repliedUser: false }
      })
    } catch (error) {
      message.reply('❌ Hubo un error al actualizar el balance.');
    }
  },
};
