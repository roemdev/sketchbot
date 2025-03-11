const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../../../config/assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Bloquea el canal para que @everyone no pueda enviar mensajes.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const channel = interaction.channel;
    const everyoneRole = interaction.guild.roles.everyone;

    // Verificar si el canal ya está bloqueado
    const currentPermissions = channel.permissionOverwrites.cache.get(everyoneRole.id);
    if (currentPermissions && currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} Canal ya bloqueado`)
          .setDescription('Este canal ya está bloqueado para @everyone.')
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      // Bloquear el canal
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false
      });

      const successEmbed = new EmbedBuilder()
        .setColor(assets.color.yellow)
        .setTitle(`${assets.emoji.warn} Canal bloqueado`)

      return interaction.reply({ embeds: [successEmbed] });

    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: '❌ Hubo un problema al intentar bloquear el canal.',
        flags: MessageFlags.Ephemeral
      });
    }
  },
};
