const { SlashCommandBuilder, MessageFlags, ContainerBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

const COIN = config.emojis.coin || "🪙";

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

      // Obtener URL de avatar en alta resolución
      const avatarUrl = targetUser.displayAvatarURL({ extension: "png", size: 512 });

      // Formatear el contenido de texto imitando la estructura de la imagen
      const text = `## Perfil de <@${targetUser.id}>\n\n` +
                   `${COIN} Balance | Rank: #${balanceRank}:\n` +
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
