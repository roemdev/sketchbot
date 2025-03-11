const { SlashCommandSubcommandBuilder } = require('discord.js');
const { punish } = require('../utils/punishHandler');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('mute')
    .setDescription('Silencia a un usuario por un tiempo determinado')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a mutear')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('duración')
        .setDescription('Duración del mute (ejemplo: 10m, 1h, 1d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('razón')
        .setDescription('Razón del muteo')
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
    const duration = interaction.options.getString('duración');
    return punish(interaction, 'muteado', duration);
  },
};
