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
    const remainingXp = nextLevelXp - xp;

    const totalXp = userService.getTotalXp(level, xp);
    const avatarUrl = targetUser.displayAvatarURL({ extension: "png", size: 128 });

    const container = new ContainerBuilder()
      .setAccentColor(0x3498DB) // Azul premium para información y experiencia
      .addTextDisplayComponents(t => 
        t.setContent(`## Nivel de ${targetUser.username}`)
      )
      .addSeparatorComponents(s => s)
      .addSectionComponents(section =>
          section
              .addTextDisplayComponents(t =>
                  t.setContent(
                      `**🌟 Nivel:** **${level}**\n` +
                      `**${XP} Experiencia:** **${XP}${xp.toLocaleString("es-DO")}** / **${nextLevelXp.toLocaleString("es-DO")}** XP\n` +
                      `**📊 Total XP:** **${XP}${totalXp.toLocaleString("es-DO")}** XP\n\n` +
                      `**📈 Progreso:**\n${getProgressBar(xp, nextLevelXp)}\n` +
                      `Faltan **${XP}${remainingXp.toLocaleString("es-DO")}** XP para el nivel **${level + 1}**.`
                  )
              )
              .setThumbnailAccessory(thumb => thumb.setURL(avatarUrl))
      );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
