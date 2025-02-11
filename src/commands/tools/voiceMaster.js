const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { handleVoiceMasterCommand } = require('../../handlers/voiceMasterHandler')
const assets = require('../../../assets.json')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice-master')
    .setDescription('Controla los permisos de un canal de voz con botones interactivos.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    // Crear el embed con la información del comando
    await handleVoiceMasterCommand(interaction);
    const embed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setTitle('Interfaz VoiceMaster')
      .setDescription('Haz clic en los botones de abajo para controlar tu canal de voz.')
      .addFields({ name: 'Uso de los botones', value: '🔒 — Bloquear\n👁️ — Ocultar\n🔫 — Expulsar\n📑 — Información\n🎙️ — Reclamar' });

    // Definir los botones en un array para facilitar su escalabilidad
    const buttons = [
      { customId: 'vmLock', emoji: '🔒', style: ButtonStyle.Secondary },
      { customId: 'vmHide', emoji: '👁️', style: ButtonStyle.Secondary },
      { customId: 'vmKick', emoji: '🔫', style: ButtonStyle.Secondary },
      { customId: 'vmInfo', emoji: '📑', style: ButtonStyle.Secondary },
      { customId: 'vmClaim', emoji: '🎙️', style: ButtonStyle.Secondary },
    ];

    const actionRow = new ActionRowBuilder().addComponents(
      ...buttons.map(button =>
        new ButtonBuilder().setCustomId(button.customId).setEmoji(button.emoji).setStyle(button.style)
      )
    );

    // Responder con el embed y los botones
    await interaction.reply({ content: '`✅`', flags: MessageFlags.Ephemeral })
    await interaction.deleteReply();
    interaction.channel.send({ embeds: [embed], components: [actionRow] });
  },
};
