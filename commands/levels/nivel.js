const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

const XP = config.emojis.xp || "✨";

function getProgressBar(current, max, length = 10) {
  const percentage = Math.max(0, Math.min(1, current / max));
  const filledLength = Math.round(percentage * length);
  const emptyLength = length - filledLength;
  const filledBar = "🟦".repeat(filledLength);
  const emptyBar = "⬛".repeat(emptyLength);
  return `${filledBar}${emptyBar} **${Math.round(percentage * 100)}%**`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nivel")
    .setDescription("Muestra tu nivel de experiencia y el XP restante")
    .addUserOption(o =>
      o.setName("usuario")
        .setDescription("El usuario a consultar")
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario") || interaction.user;

    // Asegurar que el usuario tenga un perfil en la base de datos
    const dbUser = await userService.createUser(targetUser.id, targetUser.username);

    const level = dbUser.level || 1;
    const xp = dbUser.xp || 0;
    const nextLevelXp = userService.getXpNeededForLevel(level);
    const totalXp = userService.getTotalXp(level, xp);
    const faltanteXp = nextLevelXp - xp;

    const avatarUrl = targetUser.displayAvatarURL({ extension: "png", size: 128 });

    const container = new ContainerBuilder()
      .setAccentColor(2303786) // NotQuiteBlack
      .addTextDisplayComponents(t =>
        t.setContent(`## Nivel de ${targetUser.username}`)
      ).addSeparatorComponents(s => s)
      .addSectionComponents(section =>
        section
          .addTextDisplayComponents(t =>
            t.setContent(
              `Nivel: **${level}**\n` +
              `Experiencia: **${xp.toLocaleString("es-DO")}** / **${nextLevelXp.toLocaleString("es-DO")}** XP \n` +
              `Total Exp: **${totalXp.toLocaleString("es-DO")}** \n` +
              `> *Faltan **${faltanteXp}** XP para el próximo nivel*`
            )
          )
          .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
      )
      .addSeparatorComponents(s => s)
      .addTextDisplayComponents(t =>
        t.setContent(getProgressBar(xp, nextLevelXp))
      );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
