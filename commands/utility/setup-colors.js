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
        "### 🎨 Elige tu color\n" +
        "Toca un color para asignártelo. Tócalo de nuevo para quitarlo."
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
            .setEmoji(role.emoji)
            .setStyle(BUTTON_STYLES[role.buttonStyle] ?? ButtonStyle.Secondary)
        )
      )
    );
  }

  container.addSeparatorComponents(s => s)
    .addTextDisplayComponents(t =>
      t.setContent("-# ⚠️ Solo puedes tener un color.")
    );

  return container;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-colors")
    .setDescription("Envía el panel de selección de roles de color")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.channel.send({ components: [buildColorsPanel()], flags: MessageFlags.IsComponentsV2 });
    return interaction.reply({ content: "Panel de colores enviado.", flags: MessageFlags.Ephemeral });
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("setup-colors_color_")) return false;

    const roleId = interaction.customId.replace("setup-colors_color_", "");
    const member = interaction.member;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const toRemove = [...member.roles.cache.keys()].filter(id => ALL_COLOR_IDS.has(id));
      const hadRole = member.roles.cache.has(roleId);

      if (toRemove.length > 0) {
        await member.roles.remove(toRemove);
      }

      if (!hadRole) {
        await member.roles.add(roleId);
        const role = COLOR_ROLES.find(r => r.id === roleId);
        return interaction.editReply({ content: `${role.emoji} Ahora tienes el color **${role.name}**.` });
      }

      return interaction.editReply({ content: "Color quitado." });
    } catch (error) {
      console.error("Error al gestionar roles de color:", error);
      return interaction.editReply({
        content: "❌ **Error:** No he podido actualizar tu color. Por favor, contacta con un administrador para revisar mis permisos y jerarquía de roles."
      });
    }
  },
};