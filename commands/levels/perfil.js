const { SlashCommandBuilder, MessageFlags, ContainerBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

const COIN = config.emojis.coin || "🪙";

const PROFESSIONS = {
  magnate: { name: "Magnate", emoji: "🕴️" },
  gambler: { name: "Ludópata", emoji: "🎰" },
  criminal: { name: "Criminal", emoji: "🥷" }
};
const XP_THRESHOLDS = [0, 1000, 5000, 20000, 50000];

function getNextRankXp(currentXp) {
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (currentXp < XP_THRESHOLDS[i]) {
      return XP_THRESHOLDS[i];
    }
  }
  return "MÁX";
}

function getProgressBar(current, max, length = 10) {
  const percentage = Math.max(0, Math.min(1, current / max));
  const filledLength = Math.round(percentage * length);
  const emptyLength = length - filledLength;
  const filledBar = "🟦".repeat(filledLength);
  const emptyBar = "⬛".repeat(emptyLength);
  return `${filledBar}${emptyBar}      ${Math.round(percentage * 100)}%`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("Muestra el perfil completo de un usuario (balance y experiencia)")
    .addUserOption(o =>
      o.setName("usuario")
        .setDescription("El usuario a consultar")
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario") || interaction.user;

    await interaction.deferReply();

    try {
      // Asegurar que el usuario tenga un perfil registrado en la base de datos
      const dbUser = await userService.createUser(targetUser.id, targetUser.username);
      const bankBalance = await userService.getBankBalance(targetUser.id);

      const level = dbUser.level || 1;
      const xp = dbUser.xp || 0;
      const nextLevelXp = userService.getXpNeededForLevel(level);
      const totalXp = userService.getTotalXp(level, xp);

      // Calcular posiciones en la clasificación (Ranks)
      const balanceRank = await userService.getBalanceRank(targetUser.id, dbUser.balance);
      const levelRank = await userService.getLevelRank(targetUser.id, level, xp);

      const professionKey = dbUser.profession;
      const profData = professionKey ? PROFESSIONS[professionKey] : null;
      const profXp = dbUser.profession_xp || 0;
      const profRank = userService.getProfessionRank(profXp);
      const profNextXp = getNextRankXp(profXp);

      // Obtener URL de avatar en alta resolución
      const avatarUrl = targetUser.displayAvatarURL({ extension: "png", size: 512 });

      // Formatear el contenido de texto imitando la estructura de la imagen
      let text = `## Perfil de <@${targetUser.id}>\n\n`;

      if (profData) {
        text += `🎭 Profesión: **${profData.emoji} ${profData.name}** | Maestría: **Rango ${profRank}**\n`;
        if (profNextXp !== "MÁX") {
          text += `> Progreso: **${profXp.toLocaleString("es-DO")} / ${profNextXp.toLocaleString("es-DO")}** XP\n`;
          text += `> ${getProgressBar(profXp, profNextXp)}\n\n`;
        } else {
          text += `> Progreso: **Maestría Total** (${profXp.toLocaleString("es-DO")} XP)\n`;
          text += `> ${getProgressBar(1, 1)}\n\n`;
        }
      } else {
        text += `🎭 Profesión: **Ninguna** (Usa \`/profesion\` para elegir una)\n\n`;
      }

      text += `${COIN} Balance | Rank: #${balanceRank}:\n` +
                   `> Cartera: **${dbUser.balance.toLocaleString("es-DO")}**\n` +
                   `> Banco: **${bankBalance.toLocaleString("es-DO")}**\n\n` +
                   `🌠 Experiencia | Rank: #${levelRank}:\n` +
                   `> Nivel: **${level}**\n` +
                   `> Experiencia: **${xp.toLocaleString("es-DO")} / ${nextLevelXp.toLocaleString("es-DO")}** XP\n` +
                   `> ${getProgressBar(xp, nextLevelXp)}\n` +
                   `> Total Exp: **${totalXp.toLocaleString("es-DO")}**`;

      const container = new ContainerBuilder()
        .setAccentColor(2303786) // NotQuiteBlack
        .addTextDisplayComponents(t => t.setContent(text))
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(avatarUrl)
          )
        );

      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("[PERFIL] Error al obtener el perfil:", error);
      return interaction.editReply("❌ Ocurrió un error al consultar el perfil.");
    }
  }
};
