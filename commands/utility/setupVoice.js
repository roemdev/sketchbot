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
        .setDescription("Envía el panel de control de canales de voz")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const panel = new ContainerBuilder()
            .setAccentColor(0x5B7FA6)
            .addTextDisplayComponents(t =>
                t.setContent(
                    "### 🎙️ Control de voz\n" +
                    "Administra tu canal temporal desde aquí.\n\n" +
                    "🔐 **Bloquear** — Nadie más puede entrar.\n" +
                    "🔓 **Desbloquear** — Cualquiera puede entrar.\n" +
                    "🙈 **Ocultar** — El canal desaparece de la lista.\n" +
                    "🙉 **Mostrar** — El canal vuelve a ser visible.\n" +
                    "👑 **Reclamar** — Toma el control si el dueño se fue.\n" +
                    "👢 **Expulsar** — Selecciona a alguien del menú para sacarlo.\n\n" +
                    "-# Solo el dueño del canal puede usar estos controles."
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
                        .setPlaceholder("Selecciona a alguien para expulsar...")
                )
            );

        await interaction.channel.send({ components: [panel], flags: MessageFlags.IsComponentsV2 });
        return interaction.reply({ content: "Panel de voz enviado.", flags: MessageFlags.Ephemeral });
    }
};