const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const cardService = require("../../services/cardService");
const userService = require("../../services/userService");

function buildCartasPanel(targetUsername, collection) {
  const container = new ContainerBuilder()
    .setAccentColor(2303786); // NotQuiteBlack (neutral/colección)

  const header = `## 🎴 Colección de ${targetUsername}\n` +
                 `Progreso: **${collection.totalUnique} / ${collection.totalCards}** (${collection.progressPercent}%)\n`;
                 
  container.addTextDisplayComponents(t => t.setContent(header));
  container.addSeparatorComponents(s => s);

  let content = "";

  // Tier 1
  content += `### Tier 1\n`;
  const ranksT1 = ["2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const suits = ["♠️", "♥️", "♦️", "♣️"];
  
  for (const rank of ranksT1) {
    const rowDisplays = [];
    for (const suit of suits) {
      const cardKey = `${rank}_${suit}`;
      const card = collection.tier1.find(c => c.key === cardKey);
      if (card && card.owned) {
        const qtySuffix = card.quantity > 1 ? `\`x${card.quantity}\`` : "";
        rowDisplays.push(`${card.emoji}${qtySuffix}`);
      } else {
        rowDisplays.push(`🎴`);
      }
    }
    const label = rank === "10" ? "0" : rank;
    content += `**${label}:** ${rowDisplays.join(" ")}\n`;
  }
  content += `\n`;

  // Tier 2
  content += `### Tier 2\n`;
  const ranksT2 = ["J", "Q", "K"];
  for (const rank of ranksT2) {
    const rowDisplays = [];
    for (const suit of suits) {
      const cardKey = `${rank}_${suit}`;
      const card = collection.tier2.find(c => c.key === cardKey);
      if (card && card.owned) {
        const qtySuffix = card.quantity > 1 ? `\`x${card.quantity}\`` : "";
        rowDisplays.push(`${card.emoji}${qtySuffix}`);
      } else {
        rowDisplays.push(`🎴`);
      }
    }
    content += `**${rank}:** ${rowDisplays.join(" ")}\n`;
  }
  content += `\n`;

  // Tier 3
  content += `### Tier 3\n`;
  const rowDisplaysA = [];
  for (const suit of suits) {
    const cardKey = `A_${suit}`;
    const card = collection.tier3.find(c => c.key === cardKey);
    if (card && card.owned) {
      const qtySuffix = card.quantity > 1 ? `\`x${card.quantity}\`` : "";
      rowDisplaysA.push(`${card.emoji}${qtySuffix}`);
    } else {
      rowDisplaysA.push(`🎴`);
    }
  }
  content += `**A:** ${rowDisplaysA.join(" ")}\n\n`;

  // Legendaria
  content += `### Legendaria\n`;
  const jokerCard = collection.legendary[0];
  let jokerDisplay = "🎴";
  if (jokerCard && jokerCard.owned) {
    const qtySuffix = jokerCard.quantity > 1 ? ` \`x${jokerCard.quantity}\`` : "";
    jokerDisplay = `${jokerCard.emoji}${qtySuffix}`;
  }
  content += `${jokerDisplay} \`Joker\`\n\n`;

  // Footer styling as Discord subtext
  content += `-# *Usa \`/sobres abrir\` para coleccionar más*`;

  container.addTextDisplayComponents(t => t.setContent(content));
  return container;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cartas")
    .setDescription("Muestra tu colección completa de cartas o la de otro usuario")
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
      const container = buildCartasPanel(targetUser.username, collection);
      
      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    } catch (err) {
      return interaction.editReply({
        content: `❌ **Error obteniendo la colección:** ${err.message}`
      });
    }
  }
};
