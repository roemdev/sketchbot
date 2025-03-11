const { SlashCommandSubcommandBuilder } = require('discord.js');
const { punish } = require('../utils/punishHandler');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('ban')
    .setDescription('Banea a un usuario del servidor')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a banear')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('razón')
        .setDescription('Razón del baneo')
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
    return punish(interaction, 'baneado');
  },
};

module.exports.isSubcommand = true;