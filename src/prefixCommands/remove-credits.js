const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const assets = require('../../assets.json');
const { updateUserBalance } = require('../commands/currency/utils/updateUserBalance');

module.exports = {
  name: 'remove-credits',
  description: 'Remueve créditos de un usuario.',
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

    if (!user || isNaN(amount) || amount <= 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle(`${assets.emoji.deny} Uso incorrecto`)
            .setDescription('Debes mencionar un usuario y proporcionar una cantidad válida.\n> Ejemplo: `!remove-credits @usuario cantidad`')
        ],
        allowedMentions: { repliedUser: false }
      });
    }

    const connection = message.client.dbConnection;

    try {
      await updateUserBalance(connection, user.id, -amount); // Restamos la cantidad

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle(`${assets.emoji.check} Créditos removidos`)
            .setDescription(`Se han removido ⏣ ${amount.toLocaleString()} de <@${user.id}>.`)
        ],
        allowedMentions: { repliedUser: false }
      });
    } catch (error) {
      console.error(`Error al remover créditos:`, error);
      message.reply('❌ Hubo un error al actualizar el balance.');
    }
  },
};
