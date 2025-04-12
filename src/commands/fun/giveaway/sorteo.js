const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../../config/assets.json')
const ms = require('ms')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sorteo-new')
    .setDescription('Inicia un sorteo')
    .addStringOption(option =>
      option.setName('duración')
        .setDescription('Duración del sorteo (ej: 10m, 1h, 2d)')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('ganadores')
        .setDescription('Número de ganadores')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('premio')
        .setDescription('Premio del sorteo')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('rol-requerido')
        .setDescription('Rol necesario para participar')
        .setRequired(false))
    .addRoleOption(option =>
      option.setName('rol-doble-entrada')
        .setDescription('Rol con doble entrada')
        .setRequired(false)),

  async execute(interaction) {
    const duration = ms(interaction.options.getString('duración'))
    const winners = interaction.options.getInteger('ganadores')
    const prize = interaction.options.getString('premio');
    const roleRequired = interaction.options.getRole('rol-requerido');
    const roleDoubleEntry = interaction.options.getRole('rol-doble-entrada');
    const endDate = Math.floor((Date.now() + duration) / 1000)
    let entries = 0;

    if (!duration || duration <= 0) {
      return interaction.reply({
        content: 'Duración inválida',
        flags: MessageFlags.Ephemeral
      })
    }

    await interaction.reply({
      embeds:
        [new EmbedBuilder()
          .setColor(assets.color.base)
          .setTitle(prize)
          .setDescription(
            `Finaliza: <t:${endDate}:R> | (<t:${endDate}:D>)\n` +
            `Host: <@${interaction.user.id}>\n` +
            `Entradas: ${entries}\n` +
            `Ganadores: ${winners}\n` +
            `${roleRequired ? `Rol requerido: <@&${roleRequired.id}>\n` : ''}`
          )
          .setTimestamp(Date.now() + duration)
          .setFooter({ text: 'Sorteo ID: 1293' })],
      components:
        [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('gaButton')
            .setLabel(' ')
            .setEmoji('🎉')
            .setStyle(ButtonStyle.Primary)
        )]
    })

  }
};
