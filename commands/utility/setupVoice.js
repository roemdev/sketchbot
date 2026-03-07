const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, MessageFlags } = require("discord.js");
const { makeEmbed } = require("../../utils/embedFactory");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-voice")
    .setDescription("Envía el panel fijo de control de canales de voz")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embedPanel = makeEmbed(
      "base",
      "Panel de Control de Voz",
      "Utiliza este panel para administrar tu canal temporal.\n\n" +
      "🔐 `Bloquear` — Evita que otros se unan.\n" +
      "🔓 `Desbloquear` - Permite que cualquiera se una.\n" +
      "🙈 `Ocultar` - Hace el canal invisible en la lista.\n" +
      "🙉 `Mostrar` - Hace el canal visible nuevamente.\n" +
      "👑 `Reclamar` - Si el dueño original no está, toma el control.\n" +
      "👢 `Expulsar` - Usa el menú desplegable para sacar a alguien de tu canal.\n\n" +
      "-# Presiona los botones de abajo par autilizar la interfaz."
    );

    const buttonsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('vc_lock').setEmoji('🔐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vc_unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vc_hide').setEmoji('🙈').setStyle(ButtonStyle.Secondary), 
      new ButtonBuilder().setCustomId('vc_show').setEmoji('🙉').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('vc_claim').setEmoji('👑').setStyle(ButtonStyle.Secondary)
    );

    const selectRow = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('vc_kick')
        .setPlaceholder('Selecciona a un usuario para expulsar...')
    );

    await interaction.channel.send({
      embeds: [embedPanel],
      components: [buttonsRow, selectRow]
    });

    return interaction.reply({
      content: "Panel de control enviado correctamente a este canal.",
      flags: MessageFlags.Ephemeral
    });
  }
};