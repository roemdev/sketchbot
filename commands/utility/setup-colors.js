const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const colorsData = require("../../data/colors.json");

const COLOR_ROLES = colorsData.roles;
const ALL_COLOR_IDS = new Set(COLOR_ROLES.map(r => r.id));

const BUTTON_STYLES = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger,
};

function buildColorsPanel() {
  const container = new ContainerBuilder()
      .setAccentColor(0x9b59b6)
      .addTextDisplayComponents(t =>
          t.setContent(
              "### 🎨 Roles de Color\n" +
              "Elige un color para pintar tu nombre en el servidor.\n" +
              "Haz clic en el mismo botón para quitarlo.\n\n" +
              "-# Solo puedes tener un color activo a la vez."
          )
      )
      .addSeparatorComponents(s => s);

  for (let i = 0; i < COLOR_ROLES.length; i += 5) {
    const chunk = COLOR_ROLES.slice(i, i + 5);
    container.addActionRowComponents(row =>
        row.setComponents(
            ...chunk.map(role =>
                new ButtonBuilder()
                    .setCustomId(`setup-colors_color_${role.id}`)
                    .setLabel(role.name)
                    .setEmoji(role.emoji)
                    .setStyle(BUTTON_STYLES[role.buttonStyle] ?? ButtonStyle.Secondary)
            )
        )
    );
  }

  return container;
}

module.exports = {
  data: new SlashCommandBuilder()
      .setName("setup-colors")
      .setDescription("Envía el panel de selección de roles de color")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.channel.send({ components: [buildColorsPanel()], flags: MessageFlags.IsComponentsV2 });
    return interaction.reply({ content: "Panel de colores enviado correctamente.", flags: MessageFlags.Ephemeral });
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("setup-colors_color_")) return false;

    const roleId = interaction.customId.replace("setup-colors_color_", "");
    const member = interaction.member;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const toRemove = [...member.roles.cache.keys()].filter(id => ALL_COLOR_IDS.has(id));
    const hadRole = member.roles.cache.has(roleId);

    for (const id of toRemove) await member.roles.remove(id);

    if (!hadRole) {
      await member.roles.add(roleId);
      const role = COLOR_ROLES.find(r => r.id === roleId);
      return interaction.editReply({ content: `${role.emoji} Se te asignó el rol **${role.name}**.` });
    }

    return interaction.editReply({ content: "Se quitó tu rol de color." });
  },
};