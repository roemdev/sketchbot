const { SlashCommandBuilder, MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const cardService = require("../../services/cardService");
const userService = require("../../services/userService");
const cardsData = require("../../data/cards.json");

function buildCartasPanel(targetUsername, collection, pageIndex, targetUserId) {
  const container = new ContainerBuilder()
    .setAccentColor(2303786); // NotQuiteBlack (neutral/colección)

  const header = `## 🎴 Colección de ${targetUsername}\n` +
                 `Progreso: **${collection.totalUnique} / ${collection.totalCards}** (${collection.progressPercent}%)\n`;
                 
  container.addTextDisplayComponents(t => t.setContent(header));
  container.addSeparatorComponents(s => s);

  let content = "";

  const list = pageIndex === 1 
    ? collection.tier1 
    : pageIndex === 2 
      ? collection.tier2 
      : pageIndex === 3
        ? collection.tier3
        : collection.legendary;

  const tierNames = { 
    1: "Comunes", 
    2: "Raras", 
    3: "Épicas",
    4: "Legendarias"
  };
  
  content += `### 📂 ${tierNames[pageIndex]}\n\n`;

  list.forEach((card, idx) => {
    const cardDetail = cardsData[card.key];
    const name = cardDetail?.name || card.key;
    const anime = cardDetail?.anime || "Anime";
    
    if (card.owned) {
      const qtySuffix = card.quantity > 1 ? ` \`x${card.quantity}\`` : "";
      content += `**${idx + 1}.** ✅ **${name}** *(${anime})*${qtySuffix}\n`;
    } else {
      content += `**${idx + 1}.** 🔒 *${name}* *(${anime})*\n`;
    }
  });

  content += `\n-# *Usa \`/sobres abrir\` para coleccionar más*`;

  container.addTextDisplayComponents(t => t.setContent(content));

  // Add navigation row with 4 buttons
  container.addActionRowComponents(row => {
    const btn1 = new ButtonBuilder()
      .setCustomId(`cartas_page_1_${targetUserId}`)
      .setLabel("Comunes")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex === 1);

    const btn2 = new ButtonBuilder()
      .setCustomId(`cartas_page_2_${targetUserId}`)
      .setLabel("Raras")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex === 2);

    const btn3 = new ButtonBuilder()
      .setCustomId(`cartas_page_3_${targetUserId}`)
      .setLabel("Épicas")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex === 3);

    const btn4 = new ButtonBuilder()
      .setCustomId(`cartas_page_4_${targetUserId}`)
      .setLabel("Legendarias")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex === 4);

    return row.setComponents(btn1, btn2, btn3, btn4);
  });

  return container;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cartas")
    .setDescription("Muestra tu colección de cartas paginada por rareza")
    .addUserOption(o =>
      o.setName("usuario")
        .setDescription("El usuario de quien ver la colección")
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario") || interaction.user;
    
    await interaction.deferReply();

    // Ensure users are registered in user_stats
    await userService.createUser(targetUser.id, targetUser.username);

    try {
      const collection = await cardService.getUserCollection(targetUser.id);
      // Page 1 by default (Tier 1)
      const container = buildCartasPanel(targetUser.username, collection, 1, targetUser.id);
      
      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (err) {
      return interaction.editReply({
        content: `❌ **Error obteniendo la colección:** ${err.message}`
      });
    }
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;

    if (interaction.customId.startsWith("cartas_page_")) {
      const parts = interaction.customId.split("_"); // ["cartas", "page", pageIndex, targetUserId]
      const pageIndex = parseInt(parts[2], 10);
      const targetUserId = parts[3];

      try {
        await interaction.deferUpdate();
      } catch (err) {
        if (err.code === 10062) return true; // Ignore double clicks
        throw err;
      }

      try {
        const targetUser = await interaction.client.users.fetch(targetUserId);
        const collection = await cardService.getUserCollection(targetUserId);
        const container = buildCartasPanel(targetUser.username, collection, pageIndex, targetUserId);

        return interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (err) {
        return interaction.editReply({
          components: [],
          content: `❌ **Error al cambiar de página:** ${err.message}`
        });
      }
    }

    return false;
  }
};
