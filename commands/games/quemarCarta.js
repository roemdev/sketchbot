const { SlashCommandBuilder, ContainerBuilder } = require("discord.js");
const cardService = require("../../services/cardService");
const userService = require("../../services/userService");
const cardsData = require("../../data/cards.json");
const config = require("../../utils/config");

const COIN = config.emojis.coin || "🪙";

const TIER_NAMES = {
  1: "⚪ Común",
  2: "🔵 Rara",
  3: "🟣 Épica",
  4: "🟡 Legendaria"
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quemar-carta")
    .setDescription("Quema/vende cartas de tu colección a cambio de monedas.")
    .addStringOption(o =>
      o.setName("carta")
        .setDescription("La carta específica que deseas quemar")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addIntegerOption(o =>
      o.setName("cantidad")
        .setDescription("Cantidad de copias a quemar (por defecto 1)")
        .setRequired(false)
        .setMinValue(1)
    )
    .addBooleanOption(o =>
      o.setName("duplicados")
        .setDescription("Si es true, quema TODAS tus cartas repetidas dejando 1 copia de cada una")
        .setRequired(false)
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const query = (focusedOption.value || "").toLowerCase();

    try {
      const owned = await cardService.getUserOwnedCards(interaction.user.id);
      
      const filtered = owned.filter(card => {
        const name = (card.name || "").toLowerCase();
        const anime = (card.anime || "").toLowerCase();
        const key = (card.cardKey || "").toLowerCase();
        return name.includes(query) || anime.includes(query) || key.includes(query);
      });

      const choices = filtered.slice(0, 25).map(card => {
        const tierStr = TIER_NAMES[card.tier] || "⚪ Común";
        const label = `${card.emoji} ${card.name} (${card.anime}) [${tierStr}] - x${card.quantity}`;
        return {
          name: label.length > 100 ? label.slice(0, 97) + "..." : label,
          value: card.cardKey
        };
      });

      await interaction.respond(choices);
    } catch (error) {
      console.error("Error en autocomplete de quemar-carta:", error);
      await interaction.respond([]).catch(() => {});
    }
  },

  async execute(interaction) {
    const userId = interaction.user.id;
    const cartaKey = interaction.options.getString("carta");
    const count = interaction.options.getInteger("cantidad") || 1;
    const isMassBurn = interaction.options.getBoolean("duplicados");

    await interaction.deferReply();

    await userService.createUser(userId, interaction.user.username);

    try {
      // 1. If mass burn requested or no specific card option supplied, run burnAllDuplicates
      if (isMassBurn || !cartaKey) {
        const result = await cardService.burnAllDuplicates(userId);

        const container = new ContainerBuilder()
          .setAccentColor(15105570) // Orange/Flame
          .addTextDisplayComponents(t =>
            t.setContent(
              `## 🔥 Quema Masiva de Cartas Duplicadas\n\n` +
              `Jugador: <@${userId}>\n\n` +
              `───────────────\n\n` +
              `**Resumen de cartas recicladas:**\n` +
              `⚪ **Comunes:** \`${result.breakdown.tier1}\` copias\n` +
              `🔵 **Raras:** \`${result.breakdown.tier2}\` copias\n` +
              `🟣 **Épicas:** \`${result.breakdown.tier3}\` copias\n` +
              `🟡 **Legendarias:** \`${result.breakdown.tier4}\` copias\n\n` +
              `Total reciclado: **${result.totalBurned} cartas**\n\n` +
              `───────────────\n\n` +
              `💰 **Recompensa acreditada:** **${COIN}${result.totalCoins.toLocaleString("es-DO")}**\n\n` +
              `✨ *Todas las cartas conservan al menos 1 copia en tu colección.*`
            )
          );

        return interaction.editReply({ components: [container] });
      }

      // 2. Burn specific card
      const result = await cardService.burnCard(userId, cartaKey, count);

      const tierStr = TIER_NAMES[result.tier] || "⚪ Común";

      const container = new ContainerBuilder()
        .setAccentColor(15105570) // Orange/Flame
        .addTextDisplayComponents(t =>
          t.setContent(
            `## 🔥 Quema de Carta Realizada\n\n` +
            `Jugador: <@${userId}>\n\n` +
            `**Carta quemada:** ${result.emoji} **${result.name}** (${tierStr})\n` +
            `**Cantidad quemada:** \`x${result.count}\` copias\n` +
            `**Valor unitario:** ${COIN}${result.unitValue.toLocaleString("es-DO")}\n\n` +
            `───────────────\n\n` +
            `💰 **Recompensa total:** **${COIN}${result.totalReward.toLocaleString("es-DO")}**`
          )
        );

      return interaction.editReply({ components: [container] });
    } catch (err) {
      return interaction.editReply({ content: `❌ **Error al quemar cartas:** ${err.message}` });
    }
  }
};
