const { SlashCommandSubcommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../../../config/assets.json');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('unlock')
    .setDescription('Desbloquea el canal para que @everyone pueda enviar mensajes nuevamente.')
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('El canal que deseas desbloquear')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('razón')
        .setDescription('Razón del desbloqueo')
        .setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('canal') || interaction.channel;
    const reason = interaction.options.getString('razón') || 'Sin razón especificada';
    const everyoneRole = interaction.guild.roles.everyone;
    const botUser = interaction.client.user; // Obtener el bot como usuario

    // Verificar si el canal ya está desbloqueado
    const currentPermissions = channel.permissionOverwrites.cache.get(everyoneRole.id);
    if (!currentPermissions || !currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.green)
          .setTitle(`${assets.emoji.check} Canal ya desbloqueado`)
          .setDescription('Este canal ya está desbloqueado para @everyone.')
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      // Desbloquear el canal para @everyone
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null // Restaurar permisos
      });
      await channel.permissionOverwrites.edit(botUser, {
        ViewChannel: true,
        SendMessages: true
      });

      const successEmbed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setTitle(`${assets.emoji.check} Canal desbloqueado`)
        .setDescription(`> **Razón:** ${reason}`)
        .setFooter({ text: `@${interaction.user.username}`, iconURL: `${interaction.user.displayAvatarURL()}` })
        .setTimestamp();

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await channel.send({ embeds: [successEmbed] });

      if (interaction.options.getChannel('canal')) {
        await interaction.editReply(`Canal desbloqueado <#${channel.id}>`);
      } else {
        await interaction.deleteReply();
      }
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: '❌ Hubo un problema al intentar desbloquear el canal.',
        flags: MessageFlags.Ephemeral
      });
    }
  },
};
