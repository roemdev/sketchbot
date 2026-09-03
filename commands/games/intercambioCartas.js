const { SlashCommandBuilder, MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const cardService = require("../../services/cardService");
const userService = require("../../services/userService");
const cardsData = require("../../data/cards.json");

// Active trade proposals in memory
const tradeSessions = new Map();
const activeUsers = new Set();

const TIER_NAMES = {
  1: "⚪ Común",
  2: "🔵 Rara",
  3: "🟣 Épica",
  4: "🟡 Legendaria"
};

function formatCardInfo(cardKey) {
  const card = cardsData[cardKey];
  if (!card) return `🎴 **${cardKey}**`;
  const tierStr = TIER_NAMES[card.tier] || "⚪ Común";
  return `${card.emoji} **${card.name}** *(${card.anime})* — ${tierStr}`;
}

function buildTradePanel(session, isFinished = false, outcome = "pending", errorMessage = null) {
  const container = new ContainerBuilder();

  if (isFinished) {
    if (outcome === "success") {
      container.setAccentColor(2067276); // DarkGreen
    } else {
      container.setAccentColor(10038562); // DarkRed
    }
  } else {
    container.setAccentColor(7419530); // DarkPurple
  }

  const cardAStr = formatCardInfo(session.cardAKey);
  const cardBStr = formatCardInfo(session.cardBKey);

  let description = `## 🔄 Propuesta de Intercambio de Cartas\n\n` +
                    `**Propuesto por:** <@${session.userAId}>\n` +
                    `**Destinatario:** <@${session.userBId}>\n\n` +
                    `───────────────\n\n` +
                    `<@${session.userAId}> **ofrece:**\n` +
                    `${cardAStr}\n\n` +
                    `<@${session.userBId}> **ofrece:**\n` +
                    `${cardBStr}\n\n` +
                    `───────────────\n\n`;

  if (isFinished) {
    if (outcome === "success") {
      description += `🎉 **¡Intercambio completado con éxito!**\n` +
                     `<@${session.userAId}> recibió **${cardsData[session.cardBKey]?.name || session.cardBKey}**.\n` +
                     `<@${session.userBId}> recibió **${cardsData[session.cardAKey]?.name || session.cardAKey}**.\n\n` +
                     `✨ *Ambas colecciones han sido actualizadas.*`;
    } else if (outcome === "rejected") {
      description += `❌ **Intercambio cancelado.** El intercambio fue rechazado.`;
    } else if (outcome === "expired") {
      description += `⏳ **Propuesta Expirada.** El intercambio caducó por inactividad (3 minutos).`;
    } else if (outcome === "error") {
      description += `⚠️ **Error en el intercambio:** ${errorMessage || "Uno de los usuarios ya no posee la carta solicitada."}`;
    }
  } else {
    description += `⏳ **Esperando respuesta de <@${session.userBId}>...**\n` +
                   `<@${session.userBId}>, ¿deseas aceptar este intercambio?`;
  }

  container.addTextDisplayComponents(t => t.setContent(description));

  if (!isFinished) {
    container.addSeparatorComponents(s => s);
    container.addActionRowComponents(row => {
      const btnAccept = new ButtonBuilder()
        .setCustomId(`intercambio-cartas_accept_${session.tradeId}`)
        .setLabel("✅ Aceptar Intercambio")
        .setStyle(ButtonStyle.Success);

      const btnReject = new ButtonBuilder()
        .setCustomId(`intercambio-cartas_reject_${session.tradeId}`)
        .setLabel("❌ Rechazar")
        .setStyle(ButtonStyle.Danger);

      return row.setComponents(btnAccept, btnReject);
    });
  }

  return container;
}

function clearSessionLocks(session) {
  if (session.timeout) clearTimeout(session.timeout);
  activeUsers.delete(session.userAId);
  activeUsers.delete(session.userBId);
  tradeSessions.delete(session.tradeId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("intercambio-cartas")
    .setDescription("Propón un intercambio de cartas con otro usuario.")
    .addUserOption(o =>
      o.setName("usuario")
        .setDescription("El usuario con quien deseas hacer el intercambio")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("tu-carta")
        .setDescription("La carta de tu inventario que deseas entregar")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(o =>
      o.setName("su-carta")
        .setDescription("La carta del inventario de tu compañero que le pides")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const query = (focusedOption.value || "").toLowerCase();

    try {
      let cardOptions = [];

      if (focusedOption.name === "tu-carta") {
        // Fetch user A's owned cards
        const owned = await cardService.getUserOwnedCards(interaction.user.id);
        cardOptions = owned;
      } else if (focusedOption.name === "su-carta") {
        // Fetch target user's owned cards if option user is filled
        const targetUserId = interaction.options.get("usuario")?.value;
        if (targetUserId) {
          const owned = await cardService.getUserOwnedCards(targetUserId);
          cardOptions = owned;
        } else {
          // Fallback to all cards in data
          cardOptions = Object.keys(cardsData).map(k => ({
            cardKey: k,
            quantity: 1,
            name: cardsData[k].name,
            emoji: cardsData[k].emoji,
            tier: cardsData[k].tier,
            anime: cardsData[k].anime
          }));
        }
      }

      // Filter by search query
      const filtered = cardOptions.filter(card => {
        const name = (card.name || "").toLowerCase();
        const anime = (card.anime || "").toLowerCase();
        const key = (card.cardKey || "").toLowerCase();
        return name.includes(query) || anime.includes(query) || key.includes(query);
      });

      // Limit to 25 options for Discord UI
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
      console.error("Error en autocomplete de intercambio-cartas:", error);
      await interaction.respond([]).catch(() => {});
    }
  },

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario");
    const tuCartaKey = interaction.options.getString("tu-carta");
    const suCartaKey = interaction.options.getString("su-carta");
    const userAId = interaction.user.id;
    const userBId = targetUser.id;

    await interaction.deferReply();

    // 1. Basic validations
    if (userBId === userAId) {
      return interaction.editReply({ content: "❌ No puedes intercambiar cartas contigo mismo." });
    }

    if (targetUser.bot) {
      return interaction.editReply({ content: "❌ No puedes intercambiar cartas con un bot." });
    }

    if (!cardsData[tuCartaKey]) {
      return interaction.editReply({ content: "❌ La carta que seleccionaste para ofrecer no existe en el juego." });
    }

    if (!cardsData[suCartaKey]) {
      return interaction.editReply({ content: "❌ La carta que seleccionaste para pedir no existe en el juego." });
    }

    // 2. Ensure both users exist in DB
    await userService.createUser(userAId, interaction.user.username);
    await userService.createUser(userBId, targetUser.username);

    // 3. Check active user locks
    if (activeUsers.has(userAId)) {
      return interaction.editReply({ content: "❌ Ya tienes una propuesta de intercambio activa en curso. Termínala o espera a que expire antes de iniciar otra." });
    }

    if (activeUsers.has(userBId)) {
      return interaction.editReply({ content: `❌ <@${userBId}> ya está participando en otra propuesta de intercambio en este momento.` });
    }

    // 4. Verify card ownership
    const hasTuCarta = await cardService.hasCard(userAId, tuCartaKey);
    if (!hasTuCarta) {
      const name = cardsData[tuCartaKey]?.name || tuCartaKey;
      return interaction.editReply({ content: `❌ No tienes ninguna copia de la carta **${name}** para ofrecer.` });
    }

    const hasSuCarta = await cardService.hasCard(userBId, suCartaKey);
    if (!hasSuCarta) {
      const name = cardsData[suCartaKey]?.name || suCartaKey;
      return interaction.editReply({ content: `❌ <@${userBId}> no posee ninguna copia de la carta **${name}**.` });
    }

    // 5. Create trade session
    const tradeId = `${userAId}_${userBId}_${Date.now()}`;
    const session = {
      tradeId,
      userAId,
      userBId,
      cardAKey: tuCartaKey,
      cardBKey: suCartaKey,
      interaction,
      processing: false,
      timeout: null
    };

    activeUsers.add(userAId);
    activeUsers.add(userBId);
    tradeSessions.set(tradeId, session);

    // Set 3-minute expiration timer
    session.timeout = setTimeout(async () => {
      const s = tradeSessions.get(tradeId);
      if (s) {
        clearSessionLocks(s);
        try {
          const expiredPanel = buildTradePanel(s, true, "expired");
          await s.interaction.editReply({ components: [expiredPanel], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        } catch (e) {
          console.error("Error al expirar propuesta de intercambio:", e);
        }
      }
    }, 3 * 60 * 1000);

    const panel = buildTradePanel(session);
    await interaction.editReply({ components: [panel], flags: MessageFlags.IsComponentsV2 });
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("intercambio-cartas_")) return false;

    const parts = interaction.customId.split("_"); // ["intercambio-cartas", "accept"/"reject", tradeId]
    const action = parts[1];
    const tradeId = parts.slice(2).join("_");

    const session = tradeSessions.get(tradeId);
    if (!session) {
      return interaction.reply({ content: "Esta propuesta de intercambio ya finalizó o expiró.", flags: MessageFlags.Ephemeral });
    }

    const clickerId = interaction.user.id;

    // Check permissions
    if (action === "accept") {
      if (clickerId !== session.userBId) {
        return interaction.reply({
          content: `Solo <@${session.userBId}> puede aceptar este intercambio.`,
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (action === "reject") {
      if (clickerId !== session.userAId && clickerId !== session.userBId) {
        return interaction.reply({
          content: "Solo los usuarios involucrados en esta oferta pueden cancelarla.",
          flags: MessageFlags.Ephemeral
        });
      }
    }

    // Processing lock
    if (session.processing) {
      return true;
    }
    session.processing = true;

    try {
      await interaction.deferUpdate();
    } catch (e) {
      session.processing = false;
      return true;
    }

    session.interaction = interaction;

    try {
      if (action === "reject") {
        clearSessionLocks(session);
        const rejectedPanel = buildTradePanel(session, true, "rejected");
        await interaction.editReply({ components: [rejectedPanel], flags: MessageFlags.IsComponentsV2 });
        return true;
      }

      if (action === "accept") {
        try {
          // Perform atomic card swap
          await cardService.swapCards(session.userAId, session.cardAKey, session.userBId, session.cardBKey);
          
          clearSessionLocks(session);
          const successPanel = buildTradePanel(session, true, "success");
          await interaction.editReply({ components: [successPanel], flags: MessageFlags.IsComponentsV2 });
          return true;
        } catch (err) {
          clearSessionLocks(session);
          const errorPanel = buildTradePanel(session, true, "error", err.message);
          await interaction.editReply({ components: [errorPanel], flags: MessageFlags.IsComponentsV2 });
          return true;
        }
      }
    } catch (error) {
      console.error("Error en buttonHandler de intercambio-cartas:", error);
      clearSessionLocks(session);
      try {
        await interaction.followUp({ content: "Ocurrió un error procesando el intercambio.", flags: MessageFlags.Ephemeral });
      } catch {}
      return true;
    } finally {
      session.processing = false;
    }

    return false;
  }
};
