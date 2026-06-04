const { SlashCommandBuilder, MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const userService = require("../../services/userService");
const config = require("../../utils/config");

const COIN = config.emojis.coin;

async function buildClasificacionContainer(interaction, page, sortBy, authorId) {
  const limit = 5;
  const offset = (page - 1) * limit;

  // Consultar limit + 1 usuarios para saber si hay una página siguiente
  const users = await userService.getTopUsers(limit + 1, sortBy, offset);
  const hasNextPage = users.length > limit;
  const displayUsers = users.slice(0, limit);

  // Obtener los objetos de usuario de Discord en paralelo para extraer sus avatares
  const usersWithDetails = await Promise.all(
    displayUsers.map(async (u) => {
      try {
        let userObj = interaction.client.users.cache.get(u.discord_id);
        if (!userObj) {
          userObj = await interaction.client.users.fetch(u.discord_id);
        }
        return { u, userObj };
      } catch (err) {
        return { u, userObj: null };
      }
    })
  );

  const container = new ContainerBuilder()
    .setAccentColor(2303786); // NotQuiteBlack

  for (let index = 0; index < usersWithDetails.length; index++) {
    const { u, userObj } = usersWithDetails[index];
    const rank = offset + index + 1;
    const level = u.level || 1;
    const xp = u.xp || 0;
    const nextLevelXp = userService.getXpNeededForLevel(level);
    const totalXp = userService.getTotalXp(level, xp);
    const progressPercent = nextLevelXp > 0 ? Math.round((xp / nextLevelXp) * 100) : 0;

    const balanceFormatted = u.balance.toLocaleString("es-DO");
    const totalXpFormatted = totalXp.toLocaleString("es-DO");

    const content = `${rank}, <@${u.discord_id}>\n` +
                    `Balance: ${COIN} **${balanceFormatted}**\n` +
                    `Nivel: **${level}** (${progressPercent}%)\n` +
                    `Total xp: **${totalXpFormatted}**`;

    container.addSectionComponents(section => {
      section.addTextDisplayComponents(t => t.setContent(content));
      if (userObj) {
        const avatarUrl = userObj.displayAvatarURL({ extension: "png", size: 128 });
        section.setThumbnailAccessory(thumb => thumb.setURL(avatarUrl));
      }
      return section;
    });

    if (index < usersWithDetails.length - 1) {
      container.addSeparatorComponents(s => s);
    }
  }

  container.addActionRowComponents(row =>
    row.setComponents(
      new ButtonBuilder()
        .setCustomId(`clasificacion_page_${page - 1}_${sortBy}_${authorId}`)
        .setEmoji("◀️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId(`clasificacion_page_1_level_${authorId}`)
        .setLabel("Experiencia")
        .setStyle(sortBy === "level" ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`clasificacion_page_1_balance_${authorId}`)
        .setLabel("Balance")
        .setStyle(sortBy === "balance" ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`clasificacion_page_${page + 1}_${sortBy}_${authorId}`)
        .setEmoji("▶️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!hasNextPage)
    )
  );

  return container;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clasificacion")
    .setDescription("Muestra la clasificación de usuarios del servidor")
    .addStringOption(o =>
      o.setName("criterio")
        .setDescription("Criterio por el cual ordenar la clasificación")
        .setRequired(false)
        .addChoices(
          { name: "Balance", value: "balance" },
          { name: "Experiencia", value: "level" }
        )
    ),

  async execute(interaction) {
    await userService.createUser(interaction.user.id, interaction.user.username);
    const sortBy = interaction.options.getString("criterio") || "balance";
    const authorId = interaction.user.id;
    const page = 1;

    await interaction.deferReply();

    try {
      const container = await buildClasificacionContainer(interaction, page, sortBy, authorId);
      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error ejecutando /clasificacion:", error);
      return interaction.editReply({ content: "Hubo un error cargando la clasificación." });
    }
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("clasificacion_")) return false;

    const parts = interaction.customId.split("_");
    const page = parseInt(parts[2], 10);
    const sortBy = parts[3];
    const authorId = parts[4];

    if (interaction.user.id !== authorId) {
      await interaction.reply({
        content: "Solo la persona que ejecutó el comando puede usar estos botones.",
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    try {
      const container = await buildClasificacionContainer(interaction, page, sortBy, authorId);
      await interaction.update({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (error) {
      console.error("Error al actualizar la clasificación:", error);
    }
    return true;
  }
};
