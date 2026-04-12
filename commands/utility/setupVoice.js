const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
  MessageFlags,
  ContainerBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
      .setName("setup-voice")
      .setDescription("Envía el panel fijo de control de canales de voz")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const panel = new ContainerBuilder()
        .setAccentColor(0x5B7FA6)
        .addTextDisplayComponents(t =>
            t.setContent(
                "### 🎙️ Panel de Control de Voz\n" +
                "Utiliza este panel para administrar tu canal temporal.\n\n" +
                "🔐 **Bloquear** — Evita que otros se unan.\n" +
                "🔓 **Desbloquear** — Permite que cualquiera se una.\n" +
                "🙈 **Ocultar** — Hace el canal invisible en la lista.\n" +
                "🙉 **Mostrar** — Hace el canal visible nuevamente.\n" +
                "👑 **Reclamar** — Si el dueño no está, toma el control.\n" +
                "👢 **Expulsar** — Usa el menú desplegable para sacar a alguien.\n\n" +
                "-# Presiona los botones de abajo para utilizar la interfaz."
            )
        )
        .addSeparatorComponents(s => s)
        .addActionRowComponents(row =>
            row.setComponents(
                new ButtonBuilder().setCustomId("vc_lock").setEmoji("🔐").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("vc_unlock").setEmoji("🔓").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("vc_hide").setEmoji("🙈").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("vc_show").setEmoji("🙉").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("vc_claim").setEmoji("👑").setStyle(ButtonStyle.Secondary)
            )
        )
        .addActionRowComponents(row =>
            row.setComponents(
                new UserSelectMenuBuilder()
                    .setCustomId("vc_kick")
                    .setPlaceholder("Selecciona a un usuario para expulsar...")
            )
        );

    await interaction.channel.send({ components: [panel], flags: MessageFlags.IsComponentsV2 });
    return interaction.reply({ content: "Panel de control enviado correctamente.", flags: MessageFlags.Ephemeral });
  }
};