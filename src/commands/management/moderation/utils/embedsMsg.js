const { EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../../../config/assets.json')

function sendError(interaction, message) {
  const errorEmbed = new EmbedBuilder()
    .setColor(`${assets.color.red}`)
    .setTitle(`${assets.emoji.deny} Castigo no ejecutado`)
    .setDescription(message);

  return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
}

function privateMsg(interaction, action, message) {
  const errorEmbed = new EmbedBuilder()
    .setColor(`${assets.color.red}`)
    .setTitle(`${assets.emoji.check} Castigo no ejecutado`)
    .setDescription(message);

  return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
}

module.exports = sendError