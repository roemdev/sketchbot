const { SlashCommandSubcommandBuilder } = require('discord.js');
const { punish } = require('../punishHandler');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un usuario del servidor')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a expulsar')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('razón')
        .setDescription('Razón de la expulsión')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('prueba1')
        .setDescription('Captura de pantalla de prueba (opcional)')
        .setRequired(false)
    )
    .addAttachmentOption(option =>
      option.setName('prueba2')
        .setDescription('Captura de pantalla de prueba (opcional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    return punish(interaction, 'expulsado');
  },
};

module.exports.isSubcommand = true;