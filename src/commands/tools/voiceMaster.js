const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { handleVoiceMasterCommand } = require('../../handlers/voiceMasterHandler');
const assets = require('../../../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice-master')
    .setDescription('Controla los permisos de un canal de voz con botones interactivos.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    // Llamada a la función principal para gestionar la interacción.
    await handleVoiceMasterCommand(interaction);

    // Crear el embed con la información del comando.
    const embed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
      .setTitle('Interfaz VoiceMaster')
      .setDescription('Haz clic en los botones de abajo para controlar tu canal de voz.')
      .addFields({
        name: 'Uso de los botones',
        value: '🔒 — **Bloquear** el canal de voz.\n👁️ — **Ocultar** el canal de voz.\n🔫 — **Expulsar** a alguien del canal de voz.\n📑 — **Información** sobre el canal de voz.\n🎙️ — **Reclamar** el canal de voz.'
      });

    // Definir los botones en un array para facilitar su escalabilidad.
    const buttons = [
      { customId: 'vmLock', emoji: '🔒', style: ButtonStyle.Secondary },
      { customId: 'vmHide', emoji: '👁️', style: ButtonStyle.Secondary },
      { customId: 'vmKick', emoji: '🔫', style: ButtonStyle.Secondary },
      { customId: 'vmInfo', emoji: '📑', style: ButtonStyle.Secondary },
      { customId: 'vmClaim', emoji: '🎙️', style: ButtonStyle.Secondary },
    ];

    const actionRow = new ActionRowBuilder().addComponents(
      ...buttons.map(button =>
        new ButtonBuilder()
          .setCustomId(button.customId)
          .setEmoji(button.emoji)
          .setStyle(button.style)
      )
    );

    // Responder con el embed y los botones.
    interaction.reply({ content: 'Enviado!', flags: MessageFlags.Ephemeral });
    await interaction.channel.send({ embeds: [embed], components: [actionRow] });
  },
};
