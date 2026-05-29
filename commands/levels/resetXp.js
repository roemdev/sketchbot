const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

const XP = config.emojis.xp || "✨";

module.exports = {
  data: new SlashCommandBuilder()
      .setName("reset-xp")
      .setDescription("Resetea la experiencia y el nivel de un usuario a 0")
      .addUserOption(o => o.setName("usuario").setDescription("El usuario a resetear").setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Asegurar que el usuario tiene un perfil registrado en la base de datos
    await userService.createUser(targetUser.id, targetUser.username);

    // Resetear a nivel 1, xp 0
    await userService.setXpAndLevel(targetUser.id, 1, 0, targetUser.username);

    const avatarUrl = targetUser.displayAvatarURL({ extension: "png", size: 128 });

    const panel = new ContainerBuilder()
      .setAccentColor(10038562) // DarkRed (fail/reset)
      .addTextDisplayComponents(t =>
        t.setContent(`### 🧹 Experiencia Reseteada\nLa experiencia y nivel de <@${targetUser.id}> han sido reseteados a cero.`)
      )
      .addSeparatorComponents(s => s)
      .addSectionComponents(section =>
          section
              .addTextDisplayComponents(t =>
                  t.setContent(
                      `**🌟 Nivel:** **1**\n` +
                      `**${XP} Experiencia:** **${XP}0** / **${userService.getXpNeededForLevel(1).toLocaleString()}** XP`
                  )
              )
              .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
      );

    return interaction.editReply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
  }
};
