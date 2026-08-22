const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle, MediaGalleryBuilder, MediaGalleryItemBuilder } = require("discord.js");
const cardService = require("../../services/cardService");
const userService = require("../../services/userService");
const config = require("../../utils/config");

const COIN = config.emojis.coin;

// Helpers to format card tiers and names beautifully
function getTierFormat(tier) {
  switch (tier) {
    case 1: return "**Tier 1**";
    case 2: return "**Tier 2**";
    case 3: return "**Tier 3**";
    case 4: return "**Legendaria**";
    default: return "";
  }
}

function getCardName(cardKey) {
  if (cardKey === "joker") return "Joker";
  const [rank, suit] = cardKey.split("_");
  const ranksMap = { "A": "As", "J": "Jota", "Q": "Reina", "K": "Rey" };
  const suitsMap = { "♠️": "Espadas", "♥️": "Corazones", "♦️": "Diamantes", "♣️": "Tréboles" };
  const rankName = ranksMap[rank] || rank;
  const suitName = suitsMap[suit] || suit;
  return `${rankName} de ${suitName}`;
}

// Map full card key to compact code for customId serialization (stores n for new, r for repeated)
function serializeCard(cardKey, isNew) {
  const status = isNew ? "n" : "r";
  if (cardKey === "joker") return `jo${status}`;
  const [rank, suit] = cardKey.split("_");
  const suitMap = { "♠️": "s", "♥️": "h", "♦️": "d", "♣️": "c" };
  return `${rank}${suitMap[suit] || "s"}${status}`;
}

function deserializeCard(code) {
  const cleanCode = code.slice(0, -1);
  if (cleanCode === "jo") return "joker";
  const rank = cleanCode.slice(0, -1);
  const suitCode = cleanCode.slice(-1);
  const suitMap = { "s": "♠️", "h": "♥️", "d": "♦️", "c": "♣️" };
  return `${rank}_${suitMap[suitCode] || "♠️"}`;
}

function isCardNew(code) {
  return code.endsWith("n");
}

function getCardTier(cardKey) {
  if (cardKey === "joker") return 4;
  const [rank] = cardKey.split("_");
  if (["2", "3", "4", "5", "6", "7", "8", "9", "10"].includes(rank)) return 1;
  if (["J", "Q", "K"].includes(rank)) return 2;
  if (rank === "A") return 3;
  return 1;
}

// Generates the raw SVG URL of the card and proxies it through weserv.nl as 200px PNG
function getCardImageUrl(cardKey) {
  let filename = "";
  if (cardKey === "joker") {
    filename = "joker.svg";
  } else {
    const [rank, suit] = cardKey.split("_");
    const rankMap = { "A": "1", "J": "11", "Q": "12", "K": "13" };
    const suitMap = { "♠️": "s", "♥️": "h", "♦️": "d", "♣️": "c" };
    const r = rankMap[rank] || rank;
    const s = suitMap[suit] || "s";
    filename = `${r}${s}.svg`;
  }
  const rawUrl = `https://raw.githubusercontent.com/younestouati/playing-cards-standard-deck/master/cards/${filename}`;
  return `https://images.weserv.nl/?url=${encodeURIComponent(rawUrl)}&w=200&output=png`;
}

// Panel builders for the card reveal flow
function buildRevealPanel(userId, cardsSerialized, pageIndex) {
  const codes = cardsSerialized.split("-");
  const code = codes[pageIndex];
  const cardKey = deserializeCard(code);
  const isNew = isCardNew(code);
  const tier = getCardTier(cardKey);
  const emoji = cardService.getCardEmoji(cardKey);
  const name = getCardName(cardKey);
  const tierText = getTierFormat(tier);
  
  const statusText = isNew ? "✨ **¡NUEVA!**" : "🔄 *Repetida*";
  
  let title = `### 📦 Sobre abierto: Carta ${pageIndex + 1}/3`;
  if (tier === 4) {
    title = `### ¡DIOS MÍO! ¡CARTA LEGENDARIA! (${pageIndex + 1}/3)`;
  } else if (tier === 3) {
    title = `### ¡Increíble! ¡Carta Tier 3! (${pageIndex + 1}/3)`;
  } else if (tier === 2) {
    title = `### ¡Carta Tier 2! (${pageIndex + 1}/3)`;
  }

  const container = new ContainerBuilder()
    .setAccentColor(2067276) // DarkGreen (éxito)
    .addTextDisplayComponents(t => t.setContent(title));

  const imageUrl = getCardImageUrl(cardKey);
  if (imageUrl) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(imageUrl)
      )
    );
  }

  container.addTextDisplayComponents(t =>
    t.setContent(
      `${emoji} **${name}** — ${tierText}\n` +
      `> ${statusText}`
    )
  );

  container.addActionRowComponents(row => {
    const prevBtn = new ButtonBuilder()
      .setCustomId(`sobres_reveal_prev_${pageIndex}_${cardsSerialized}_${userId}`)
      .setLabel("⬅️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageIndex === 0);

    const nextBtn = new ButtonBuilder()
      .setCustomId(`sobres_reveal_next_${pageIndex}_${cardsSerialized}_${userId}`)
      .setLabel(pageIndex === 2 ? "Ver Resumen 🏁" : "Siguiente ➡️")
      .setStyle(pageIndex === 2 ? ButtonStyle.Success : ButtonStyle.Primary);

    return row.setComponents(prevBtn, nextBtn);
  });

  return container;
}

function buildSummaryPanel(userId, cardsSerialized, packsOwned) {
  const codes = cardsSerialized.split("-");
  const cardsList = codes.map((code, i) => {
    const cardKey = deserializeCard(code);
    const isNew = isCardNew(code);
    const tier = getCardTier(cardKey);
    const emoji = cardService.getCardEmoji(cardKey);
    const name = getCardName(cardKey);
    const tierText = getTierFormat(tier);
    const statusText = isNew ? "✨ **¡NUEVA!**" : "🔄 *Repetida*";
    return `**${i + 1}.** ${emoji} **${name}** — ${tierText} (${statusText})`;
  }).join("\n");

  const hasLegendary = codes.some(c => getCardTier(deserializeCard(c)) === 4);
  const hasEpic = codes.some(c => getCardTier(deserializeCard(c)) === 3);
  let title = "### 📦 ¡Sobre Abierto!";
  if (hasLegendary) {
    title = "### ¡DIOS MÍO! ¡SOBRE LEGENDARIO!";
  } else if (hasEpic) {
    title = "### ¡Sobre Tier 3! Abierto";
  }

  const container = new ContainerBuilder()
    .setAccentColor(2067276) // DarkGreen
    .addTextDisplayComponents(t =>
      t.setContent(
        `${title}\n` +
        `Has terminado de abrir el sobre y obtuviste:\n\n` +
        `${cardsList}\n\n` +
        `📦 **Sobres Restantes:** **${packsOwned}**\n` +
        `*Usa \`/cartas\` para ver tu colección completa.*`
      )
    );

  if (packsOwned > 0) {
    container.addActionRowComponents(row =>
      row.setComponents(
        new ButtonBuilder()
          .setCustomId(`sobres_abrir_otromas_${userId}`)
          .setLabel(`Abrir otro (${packsOwned} restantes)`)
          .setStyle(ButtonStyle.Success)
      )
    );
  }

  return container;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sobres")
    .setDescription("Gestiona y abre tus sobres de cartas coleccionables")
    .addSubcommand(sub =>
      sub.setName("diario")
        .setDescription("Reclama tu sobre de cartas gratuito de hoy")
    )
    .addSubcommand(sub =>
      sub.setName("comprar")
        .setDescription("Compra sobres con tus monedas de la cartera")
        .addIntegerOption(o =>
          o.setName("cantidad")
            .setDescription("Cantidad de sobres a comprar (1 o 2)")
            .setMinValue(1)
            .setMaxValue(2)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("abrir")
        .setDescription("Abre uno de tus sobres de cartas disponibles")
    )
    .addSubcommand(sub =>
      sub.setName("regalar")
        .setDescription("Regala sobres a un usuario (Admin)")
        .addUserOption(o =>
          o.setName("usuario")
            .setDescription("El usuario a quien regalar")
            .setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName("cantidad")
            .setDescription("Cantidad de sobres a regalar")
            .setMinValue(1)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const username = interaction.user.username;

    await interaction.deferReply();

    // Ensure user accounts exist in user_stats
    await userService.createUser(userId, username);

    try {
      if (subcommand === "diario") {
        const packsData = await cardService.claimDailyPack(userId, username);
        
        const container = new ContainerBuilder()
          .setAccentColor(2067276) // DarkGreen (éxito)
          .addTextDisplayComponents(t =>
            t.setContent(
              `### 🃏 ¡Sobre Diario Reclamado!\n` +
              `Has reclamado tu sobre de cartas gratuito de hoy.\n\n` +
              `📦 **Sobres Disponibles:** **${packsData.packs_owned}**\n` +
              `*Usa \`/sobres abrir\` para abrirlos y descubrir qué cartas te tocaron.*`
            )
          );

        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (subcommand === "comprar") {
        const count = interaction.options.getInteger("cantidad");
        const packsData = await cardService.buyPacks(userId, count, username);
        const packPrice = config.cardsMinigame.packPrice;
        const totalPaid = packPrice * count;

        const container = new ContainerBuilder()
          .setAccentColor(2067276) // DarkGreen (éxito)
          .addTextDisplayComponents(t =>
            t.setContent(
              `### 🛒 ¡Compra Exitosa!\n` +
              `Has comprado **${count}** sobre(s) de cartas por **${COIN}${totalPaid.toLocaleString("es-DO")}** monedas.\n\n` +
              `📦 **Sobres Disponibles:** **${packsData.packs_owned}**\n` +
              `*Usa \`/sobres abrir\` para descubrir tus nuevas cartas.*`
            )
          );

        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (subcommand === "abrir") {
        const drawn = await cardService.openPack(userId, username);
        const serialized = drawn.map(c => serializeCard(c.key, c.isNew)).join("-");
        const container = buildRevealPanel(userId, serialized, 0);

        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      if (subcommand === "regalar") {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply({
            content: "❌ **Error:** No tienes permisos de Administrador para usar este comando.",
            flags: MessageFlags.Ephemeral
          });
        }

        const targetUser = interaction.options.getUser("usuario");
        const count = interaction.options.getInteger("cantidad");

        // Ensure target user is registered
        await userService.createUser(targetUser.id, targetUser.username);

        const packsData = await cardService.addPacks(targetUser.id, count, targetUser.username);

        return interaction.editReply({
          content: `Se han regalado **${count}** sobre(s) a <@${targetUser.id}>.`
        });
      }

    } catch (err) {
      return interaction.editReply({
        content: `❌ **Error:** ${err.message}`
      });
    }
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;

    if (interaction.customId.startsWith("sobres_abrir_otromas_")) {
      const parts = interaction.customId.split("_");
      const userId = parts[parts.length - 1];

      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: "No puedes usar este botón. Solo el dueño del sobre puede abrirlo.",
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        await interaction.deferUpdate();
      } catch (err) {
        if (err.code === 10062) return true; // Ignorar interacciones desconocidas (doble clic)
        throw err;
      }

      try {
        const drawn = await cardService.openPack(userId, interaction.user.username);
        const serialized = drawn.map(c => serializeCard(c.key, c.isNew)).join("-");
        const container = buildRevealPanel(userId, serialized, 0);

        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) {
        return interaction.editReply({
          components: [],
          content: `❌ **Error al abrir sobre:** ${err.message}`
        });
      }
    }

    if (interaction.customId.startsWith("sobres_reveal_")) {
      const parts = interaction.customId.split("_"); // ["sobres", "reveal", "action", "pageIndex", "cardsSerialized", "userId"]
      const action = parts[2];
      const pageIndex = parseInt(parts[3], 10);
      const cardsSerialized = parts[4];
      const userId = parts[5];

      if (interaction.user.id !== userId) {
        return interaction.reply({
          content: "No puedes interactuar con esta apertura. Abre tus propios sobres con `/sobres abrir`.",
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        await interaction.deferUpdate();
      } catch (err) {
        if (err.code === 10062) return true; // Ignorar interacciones desconocidas (doble clic)
        throw err;
      }

      try {
        if (action === "prev") {
          const newPageIndex = pageIndex - 1;
          const container = buildRevealPanel(userId, cardsSerialized, newPageIndex);
          return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } else if (action === "next") {
          if (pageIndex === 2) {
            // End of opening -> show summary page
            const packsData = await cardService.getUserPacks(userId, interaction.user.username);
            const container = buildSummaryPanel(userId, cardsSerialized, packsData.packs_owned);
            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
          } else {
            const newPageIndex = pageIndex + 1;
            const container = buildRevealPanel(userId, cardsSerialized, newPageIndex);
            return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
          }
        }
      } catch (err) {
        return interaction.editReply({
          components: [],
          content: `❌ **Error al navegar el sobre:** ${err.message}`
        });
      }
    }

    return false;
  }
};
