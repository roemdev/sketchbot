
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} = require("discord.js");

const cardService = require("../../services/cardService");
const userService = require("../../services/userService");
const cardRenderer = require("../../services/cardRenderer");
const config = require("../../utils/config");
const cardsData = require("../../data/cards.json");

const COIN = config.emojis.coin;

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function getTierFormat(tier) {
  switch (tier) {
    case 1: return "Común";
    case 2: return "Rara";
    case 3: return "Épica";
    case 4: return "Legendaria";
    default: return "Desconocida";
  }
}

function getTierAccentColor(tier) {
  switch (tier) {
    case 4: return 16766720;  // Dorado
    case 3: return 10040012;  // Violeta profundo
    case 2: return 1146986;   // Azul zafiro
    default: return 7506394;  // Gris pizarra
  }
}

function getCardName(cardKey) {
  return cardsData[cardKey]?.name || cardKey;
}

function serializeCard(cardKey, isNew) {
  return `${cardKey}${isNew ? "n" : "r"}`;
}

function deserializeCard(code) {
  return code.slice(0, -1);
}

function isCardNew(code) {
  return code.endsWith("n");
}

function getCardTier(cardKey) {
  return cardsData[cardKey]?.tier || 1;
}

// ─────────────────────────────────────────────
//  Panel Builders
// ─────────────────────────────────────────────

function buildMainPanel(packPrice, dailyLimit) {
  return new ContainerBuilder()
    .setAccentColor(5793266)
    .addTextDisplayComponents(t =>
      t.setContent(
        "# 🎴 Cartas Coleccionables de Arkania\n" +
        "Colecciona cartas de personajes de anime y llena tu álbum con todas las rarezas.\n\n" +
        "📆 **:** Reclamar el sobre diario gratuito.\n" +
        "🛒 **:** Comprar sobres con monedas.\n" +
        "🃏 **:** Abrir un sobre de tu inventario.\n" +
        "📒 **:** Ver tu colección de cartas.\n" +
        "ℹ️ **:** Guía e información sobre el sistema.\n\n" +
        `-# Precio por sobre: **${COIN}${packPrice.toLocaleString("es-DO")}** · Límite: **${dailyLimit}** compras cada 12 horas · Cada sobre contiene **3 cartas**.`
      )
    )
    .addActionRowComponents(row =>
      row.setComponents(
        new ButtonBuilder().setCustomId("setup-sobres_info").setEmoji("ℹ️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("setup-sobres_diario").setEmoji("📆").setStyle(ButtonStyle.Secondary).setLabel("Diario"),
        new ButtonBuilder().setCustomId("setup-sobres_comprar").setEmoji("🛒").setStyle(ButtonStyle.Secondary).setLabel("Comprar"),
        new ButtonBuilder().setCustomId("setup-sobres_abrir").setEmoji("🃏").setStyle(ButtonStyle.Secondary).setLabel("Abrir"),
        new ButtonBuilder().setCustomId("setup-sobres_coleccion").setEmoji("📒").setStyle(ButtonStyle.Secondary).setLabel("Colección")
      )
    );
}

function buildRevealPanel(userId, cardsSerialized, pageIndex) {
  const codes = cardsSerialized.split("-");
  const code = codes[pageIndex];
  const cardKey = deserializeCard(code);
  const isNew = isCardNew(code);
  const tier = getCardTier(cardKey);
  const emoji = cardService.getCardEmoji(cardKey);
  const name = getCardName(cardKey);
  const accentColor = getTierAccentColor(tier);

  let title;
  if (tier === 4) title = `### 🌌 ¡DIOS MÍO! ¡CARTA LEGENDARIA! (${pageIndex + 1}/3)`;
  else if (tier === 3) title = `### ✨ ¡Carta Épica! (${pageIndex + 1}/3)`;
  else if (tier === 2) title = `### 💙 ¡Carta Rara! (${pageIndex + 1}/3)`;
  else title = `### 📦 Sobre abierto — Carta ${pageIndex + 1}/3`;

  const statusText = isNew ? "✨ **¡NUEVA!** — Añadida a tu colección." : "🔄 *Repetida* — Ya la tienes.";

  return new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(t => t.setContent(title))
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL("attachment://card.png")
      )
    )
    .addTextDisplayComponents(t =>
      t.setContent(
        `${emoji} **${name}** — *${getTierFormat(tier)}*\n` +
        `> ${statusText}`
      )
    )
    .addSeparatorComponents(s => s)
    .addActionRowComponents(row => {
      const prevBtn = new ButtonBuilder()
        .setCustomId(`setup-sobres_reveal_prev_${pageIndex}_${cardsSerialized}_${userId}`)
        .setLabel("⬅️ Anterior")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pageIndex === 0);

      const nextBtn = new ButtonBuilder()
        .setCustomId(`setup-sobres_reveal_next_${pageIndex}_${cardsSerialized}_${userId}`)
        .setLabel(pageIndex === 2 ? "Ver Resumen 🏁" : "Siguiente ➡️")
        .setStyle(pageIndex === 2 ? ButtonStyle.Success : ButtonStyle.Primary);

      return row.setComponents(prevBtn, nextBtn);
    });
}

function buildSummaryPanel(userId, cardsSerialized, packsOwned) {
  const codes = cardsSerialized.split("-");
  const hasLegendary = codes.some(c => getCardTier(deserializeCard(c)) === 4);
  const hasEpic = codes.some(c => getCardTier(deserializeCard(c)) === 3);

  let title = "### 📦 ¡Sobre Abierto!";
  let accentColor = 2067276;
  if (hasLegendary) { title = "### 🌌 ¡SOBRE LEGENDARIO!"; accentColor = 16766720; }
  else if (hasEpic) { title = "### ✨ ¡Sobre Épico Abierto!"; accentColor = 10040012; }

  const cardsList = codes.map((code, i) => {
    const cardKey = deserializeCard(code);
    const isNew = isCardNew(code);
    const tier = getCardTier(cardKey);
    const name = getCardName(cardKey);
    return `**${i + 1}.** **${name}** — *${getTierFormat(tier)}* · ${isNew ? "✨ **¡NUEVA!**" : "🔄 *Repetida*"}`;
  }).join("\n");

  const container = new ContainerBuilder()
    .setAccentColor(accentColor)
    .addTextDisplayComponents(t =>
      t.setContent(
        `${title}\nHas terminado de abrir el sobre. Obtuviste:\n\n${cardsList}\n\n📦 **Sobres Restantes:** **${packsOwned}**`
      )
    );

  if (packsOwned > 0) {
    container
      .addSeparatorComponents(s => s)
      .addActionRowComponents(row =>
        row.setComponents(
          new ButtonBuilder()
            .setCustomId(`setup-sobres_abrirmas_${userId}`)
            .setLabel(`Abrir otro (${packsOwned} restantes)`)
            .setEmoji("🃏")
            .setStyle(ButtonStyle.Success)
        )
      );
  }

  return container;
}

function buildCollectionPanel(targetUsername, collection, pageIndex, targetUserId) {
  const tierNames = { 1: "Comunes", 2: "Raras", 3: "Épicas", 4: "Legendarias" };
  const accentColors = { 1: 7506394, 2: 1146986, 3: 10040012, 4: 16766720 };

  const list = pageIndex === 1 ? collection.tier1
    : pageIndex === 2 ? collection.tier2
      : pageIndex === 3 ? collection.tier3
        : collection.legendary;

  let content = `### 📂 ${tierNames[pageIndex]}\n\n`;
  list.forEach((card, idx) => {
    const cardDetail = cardsData[card.key];
    const name = cardDetail?.name || card.key;
    const anime = cardDetail?.anime || "?";
    if (card.owned) {
      const qtySuffix = card.quantity > 1 ? ` \`x${card.quantity}\`` : "";
      content += `**${idx + 1}.** ✅ **${name}** *(${anime})*${qtySuffix}\n`;
    } else {
      content += `**${idx + 1}.** 🔒 *${name}* *(${anime})*\n`;
    }
  });

  return new ContainerBuilder()
    .setAccentColor(accentColors[pageIndex] || 7506394)
    .addTextDisplayComponents(t =>
      t.setContent(
        `## 🎴 Colección de ${targetUsername}\n` +
        `Progreso global: **${collection.totalUnique} / ${collection.totalCards}** (${collection.progressPercent}%)\n`
      )
    )
    .addSeparatorComponents(s => s)
    .addTextDisplayComponents(t => t.setContent(content))
    .addSeparatorComponents(s => s)
    .addActionRowComponents(row =>
      row.setComponents(
        new ButtonBuilder().setCustomId(`setup-sobres_col_1_${targetUserId}`).setLabel("Comunes").setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === 1),
        new ButtonBuilder().setCustomId(`setup-sobres_col_2_${targetUserId}`).setLabel("Raras").setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === 2),
        new ButtonBuilder().setCustomId(`setup-sobres_col_3_${targetUserId}`).setLabel("Épicas").setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === 3),
        new ButtonBuilder().setCustomId(`setup-sobres_col_4_${targetUserId}`).setLabel("Legendarias").setStyle(ButtonStyle.Secondary).setDisabled(pageIndex === 4)
      )
    );
}

// ─────────────────────────────────────────────
//  Module Export
// ─────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-sobres")
    .setDescription("(Admin) Envía el panel interactivo de Sobres de Cartas al canal actual")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const packPrice = config.cardsMinigame.packPrice;
    const dailyLimit = config.cardsMinigame.dailyPurchaseLimit;

    const panel = buildMainPanel(packPrice, dailyLimit);

    await interaction.channel.send({
      components: [panel],
      flags: MessageFlags.IsComponentsV2,
    });

    return interaction.editReply({ content: `✅ Panel de sobres enviado a <#${interaction.channelId}>.` });
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("setup-sobres_")) return false;

    const userId = interaction.user.id;
    const username = interaction.user.username;

    // ── COLECCIÓN (paginación) ──────────────────────────────────────
    // customId: setup-sobres_col_<page>_<targetUserId>
    // split("_") → ["setup-sobres", "col", "<page>", "<targetUserId>"]
    if (interaction.customId.startsWith("setup-sobres_col_")) {
      const parts = interaction.customId.split("_");
      const pageIndex = parseInt(parts[2], 10);
      const targetUserId = parts[3];

      try { await interaction.deferUpdate(); } catch { return true; }

      try {
        const targetUser = await interaction.client.users.fetch(targetUserId);
        const collection = await cardService.getUserCollection(targetUserId);
        const container = buildCollectionPanel(targetUser.username, collection, pageIndex, targetUserId);
        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) {
        const errContainer = new ContainerBuilder().setAccentColor(10038562)
          .addTextDisplayComponents(t => t.setContent(`### ❌ Error\n${err.message}`));
        return interaction.editReply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
      }
    }

    // ── REVEAL (navegación carta a carta) ──────────────────────────
    // customId: setup-sobres_reveal_<prev|next>_<pageIndex>_<cardsSerialized>_<userId>
    // split("_") → ["setup-sobres", "reveal", "<action>", "<pageIndex>", "<cards>", "<userId>"]
    if (interaction.customId.startsWith("setup-sobres_reveal_")) {
      const parts = interaction.customId.split("_");
      const action = parts[2];
      const pageIndex = parseInt(parts[3], 10);
      const targetUserId = parts[parts.length - 1];
      const cardsSerialized = parts.slice(4, parts.length - 1).join("_");

      if (userId !== targetUserId) {
        return interaction.reply({ content: "No puedes interactuar con este sobre. Abre el tuyo desde el panel.", flags: MessageFlags.Ephemeral });
      }

      try { await interaction.deferUpdate(); } catch (err) {
        if (err.code === 10062) return true;
        throw err;
      }

      try {
        if (action === "prev") {
          const newPage = pageIndex - 1;
          const container = buildRevealPanel(userId, cardsSerialized, newPage);
          const currentCardKey = deserializeCard(cardsSerialized.split("-")[newPage]);
          const buffer = await cardRenderer.getCardImageBuffer(currentCardKey);
          const attachment = new AttachmentBuilder(buffer, { name: "card.png" });
          return interaction.editReply({ components: [container], files: [attachment], flags: MessageFlags.IsComponentsV2 });
        }

        if (action === "next") {
          if (pageIndex === 2) {
            const packsData = await cardService.getUserPacks(userId, username);
            const container = buildSummaryPanel(userId, cardsSerialized, packsData.packs_owned);
            return interaction.editReply({ components: [container], files: [], flags: MessageFlags.IsComponentsV2 });
          } else {
            const newPage = pageIndex + 1;
            const container = buildRevealPanel(userId, cardsSerialized, newPage);
            const currentCardKey = deserializeCard(cardsSerialized.split("-")[newPage]);
            const buffer = await cardRenderer.getCardImageBuffer(currentCardKey);
            const attachment = new AttachmentBuilder(buffer, { name: "card.png" });
            return interaction.editReply({ components: [container], files: [attachment], flags: MessageFlags.IsComponentsV2 });
          }
        }
      } catch (err) {
        const errContainer = new ContainerBuilder().setAccentColor(10038562)
          .addTextDisplayComponents(t => t.setContent(`### ❌ Error\n${err.message}`));
        return interaction.editReply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
      }
    }

    // ── ABRIR MÁS (desde el resumen) ───────────────────────────────
    if (interaction.customId.startsWith("setup-sobres_abrirmas_")) {
      const targetUserId = interaction.customId.replace("setup-sobres_abrirmas_", "");

      if (userId !== targetUserId) {
        return interaction.reply({ content: "Solo tú puedes abrir tus propios sobres.", flags: MessageFlags.Ephemeral });
      }

      try { await interaction.deferUpdate(); } catch (err) {
        if (err.code === 10062) return true;
        throw err;
      }

      try {
        const drawn = await cardService.openPack(userId, username);
        const publicLogService = require("../../services/publicLogService");
        for (const card of drawn) {
          if (card.tier === 3) {
            publicLogService.logEpicCardPull(interaction.client, { userId, cardName: card.name, anime: card.anime, emoji: card.emoji }).catch(console.error);
          } else if (card.tier === 4) {
            publicLogService.logLegendaryCardPull(interaction.client, { userId, cardName: card.name, anime: card.anime, emoji: card.emoji }).catch(console.error);
          }
        }
        const serialized = drawn.map(c => serializeCard(c.key, c.isNew)).join("-");
        const container = buildRevealPanel(userId, serialized, 0);
        const firstCardKey = deserializeCard(serialized.split("-")[0]);
        const buffer = await cardRenderer.getCardImageBuffer(firstCardKey);
        const attachment = new AttachmentBuilder(buffer, { name: "card.png" });
        return interaction.editReply({ components: [container], files: [attachment], flags: MessageFlags.IsComponentsV2 });
      } catch (err) {
        const errContainer = new ContainerBuilder().setAccentColor(10038562)
          .addTextDisplayComponents(t => t.setContent(`### ❌ Error al abrir sobre\n${err.message}`));
        return interaction.editReply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
      }
    }

    // ── CONFIRMAR COMPRA (1 ó 2 sobres) ────────────────────────────
    if (interaction.customId.startsWith("setup-sobres_comprar1_") || interaction.customId.startsWith("setup-sobres_comprar2_")) {
      const isBuy2 = interaction.customId.startsWith("setup-sobres_comprar2_");
      const targetUserId = interaction.customId.split("_").pop();

      if (userId !== targetUserId) {
        return interaction.reply({ content: "Solo tú puedes usar estos botones.", flags: MessageFlags.Ephemeral });
      }

      try { await interaction.deferUpdate(); } catch { return true; }

      const count = isBuy2 ? 2 : 1;
      const packPrice = config.cardsMinigame.packPrice;

      try {
        const packsData = await cardService.buyPacks(userId, count, username);
        const totalPaid = packPrice * count;

        const container = new ContainerBuilder()
          .setAccentColor(2067276)
          .addTextDisplayComponents(t =>
            t.setContent(
              `### 🛒 ¡Compra Exitosa!\n` +
              `Has adquirido **${count}** sobre${count > 1 ? "s" : ""} por **${COIN}${totalPaid.toLocaleString("es-DO")}** monedas.\n\n` +
              `📦 **Sobres Disponibles:** **${packsData.packs_owned}**\n` +
              `-# Presiona **Abrir** en el panel para revelar tus cartas.`
            )
          );

        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) {
        const container = new ContainerBuilder()
          .setAccentColor(10038562)
          .addTextDisplayComponents(t => t.setContent(`### ❌ Error al Comprar\n${err.message}`));
        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
    }

    // ── ACCIONES PRINCIPALES (desde el hub) ────────────────────────
    const action = interaction.customId.replace("setup-sobres_", "");

    if (action === "info") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const packPrice = config.cardsMinigame.packPrice;
      const dailyLimit = config.cardsMinigame.dailyPurchaseLimit;
      const weights = config.cardsMinigame.rarityWeights;

      return interaction.editReply({
        content:
          "### ℹ️ Guía de Sobres — Colección de Arkania\n\n" +
          "**¿Qué son los sobres?**\n" +
          "> Cada sobre contiene **3 cartas aleatorias** de personajes de anime con distintas rarezas. Colecciona todas las cartas del álbum.\n\n" +
          "📆 **Sobre Diario**\n" +
          "> Recibe **1 sobre gratis** cada 24 horas (UTC-4). Si ya lo reclamaste, el bot te avisará.\n\n" +
          `🛒 **Comprar Sobres**\n` +
          `> Cuesta **${COIN}${packPrice.toLocaleString("es-DO")}** por sobre. Límite de **${dailyLimit}** compras cada 12 horas (reset a las 00:00 y 12:00 UTC-4).\n\n` +
          "🃏 **Abrir Sobre**\n" +
          "> Revela tus cartas una por una con navegación de paginación. Al final verás un resumen con todo lo obtenido.\n\n" +
          "📒 **Colección**\n" +
          "> Muestra todas las cartas del álbum agrupadas por rareza. Las que no posees aparecen bloqueadas (🔒).\n\n" +
          "**Probabilidades de Rareza:**\n" +
          `> 🩶 Común: **${(weights.tier1 * 100).toFixed(0)}%**\n` +
          `> 💙 Rara: **${(weights.tier2 * 100).toFixed(0)}%**\n` +
          `> 💜 Épica: **${(weights.tier3 * 100).toFixed(0)}%**\n` +
          `> 🌌 Legendaria: **${(weights.legendary * 100).toFixed(0)}%**`
      });
    }

    if (action === "diario") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await userService.createUser(userId, username);

      try {
        const packsData = await cardService.claimDailyPack(userId, username);

        const container = new ContainerBuilder()
          .setAccentColor(2067276)
          .addTextDisplayComponents(t =>
            t.setContent(
              `### 📆 ¡Sobre Diario Reclamado!\n` +
              `Has recibido tu sobre de cartas gratuito del día.\n\n` +
              `📦 **Sobres Disponibles:** **${packsData.packs_owned}**\n` +
              `-# Presiona **Abrir** en el panel para revelar tus cartas.`
            )
          );

        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) {
        const errContainer = new ContainerBuilder().setAccentColor(10038562)
          .addTextDisplayComponents(t => t.setContent(`### ❌ Error\n${err.message}`));
        return interaction.editReply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
      }
    }

    if (action === "comprar") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await userService.createUser(userId, username);

      const packPrice = config.cardsMinigame.packPrice;
      const dailyLimit = config.cardsMinigame.dailyPurchaseLimit;

      const container = new ContainerBuilder()
        .setAccentColor(1146986)
        .addTextDisplayComponents(t =>
          t.setContent(
            `### 🛒 Comprar Sobres de Cartas\n` +
            `Elige cuántos sobres deseas comprar:\n\n` +
            `> 💰 **Precio por sobre:** ${COIN}**${packPrice.toLocaleString("es-DO")}**\n` +
            `> 📦 **Límite cada 12h:** ${dailyLimit} sobres\n\n` +
            `-# El pago se descuenta directamente de tu cartera.`
          )
        )
        .addSeparatorComponents(s => s)
        .addActionRowComponents(row =>
          row.setComponents(
            new ButtonBuilder()
              .setCustomId(`setup-sobres_comprar1_${userId}`)
              .setLabel(`Comprar 1 (${COIN}${packPrice.toLocaleString("es-DO")})`)
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`setup-sobres_comprar2_${userId}`)
              .setLabel(`Comprar 2 (${COIN}${(packPrice * 2).toLocaleString("es-DO")})`)
              .setStyle(ButtonStyle.Primary)
          )
        );

      return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === "abrir") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await userService.createUser(userId, username);

      try {
        const drawn = await cardService.openPack(userId, username);
        const publicLogService = require("../../services/publicLogService");
        for (const card of drawn) {
          if (card.tier === 3) {
            publicLogService.logEpicCardPull(interaction.client, { userId, cardName: card.name, anime: card.anime, emoji: card.emoji }).catch(console.error);
          } else if (card.tier === 4) {
            publicLogService.logLegendaryCardPull(interaction.client, { userId, cardName: card.name, anime: card.anime, emoji: card.emoji }).catch(console.error);
          }
        }
        const serialized = drawn.map(c => serializeCard(c.key, c.isNew)).join("-");
        const container = buildRevealPanel(userId, serialized, 0);
        const firstCardKey = deserializeCard(serialized.split("-")[0]);
        const buffer = await cardRenderer.getCardImageBuffer(firstCardKey);
        const attachment = new AttachmentBuilder(buffer, { name: "card.png" });

        return interaction.editReply({ components: [container], files: [attachment], flags: MessageFlags.IsComponentsV2 });
      } catch (err) {
        const errContainer = new ContainerBuilder().setAccentColor(10038562)
          .addTextDisplayComponents(t => t.setContent(`### ❌ Error al abrir sobre\n${err.message}`));
        return interaction.editReply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
      }
    }

    if (action === "coleccion") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await userService.createUser(userId, username);

      try {
        const collection = await cardService.getUserCollection(userId);
        const container = buildCollectionPanel(username, collection, 1, userId);
        return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      } catch (err) {
        const errContainer = new ContainerBuilder().setAccentColor(10038562)
          .addTextDisplayComponents(t => t.setContent(`### ❌ Error al obtener la colección\n${err.message}`));
        return interaction.editReply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
      }
    }

    return false;
  }
};
