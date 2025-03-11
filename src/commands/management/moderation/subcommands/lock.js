const { SlashCommandSubcommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../../../config/assets.json');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('lock')
    .setDescription('Bloquea el canal para que @everyone no pueda enviar mensajes.')
    .addChannelOption(option =>
      option.setName('canal')
        .setDescription('El canal que deseas bloquear')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('razón')
        .setDescription('Razón del bloqueo')
        .setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('canal') || interaction.channel;
    const reason = interaction.options.getString('razón') || 'Sin razón especificada';
    const everyoneRole = interaction.guild.roles.everyone;
    const botUser = interaction.client.user; // Obtener el bot como usuario

    // Verificar si el canal ya está bloqueado
    const currentPermissions = channel.permissionOverwrites.cache.get(everyoneRole.id);
    if (currentPermissions && currentPermissions.deny.has(PermissionFlagsBits.SendMessages)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} Canal ya bloqueado`)
          .setDescription('Este canal ya está bloqueado.')
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      // Bloquear el canal para @everyone y permitir que el bot envíe mensajes
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false
      });
      await channel.permissionOverwrites.edit(botUser, {
        ViewChannel: true,
        SendMessages: true
      });

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.yellow)
            .setTitle(`${assets.emoji.warn} Canal bloqueado`)
            .setDescription(`> **Razón:** ${reason}`)
            .setFooter({ text: `@${interaction.user.username}`, iconURL: `${interaction.user.displayAvatarURL()}` })
            .setTimestamp()
        ]
      });

      if (interaction.options.getChannel('canal')) {
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(assets.color.green).setDescription(`${assets.emoji.check} Canal bloqueado`)] });
      } else {
        await interaction.deleteReply();
      }
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: '❌ Hubo un problema al intentar bloquear el canal.',
        flags: MessageFlags.Ephemeral
      });
    }
  },
};

module.exports.isSubcommand = true;
