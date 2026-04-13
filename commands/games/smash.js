const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ContainerBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const config = require("../../core.json");
const userService = require("../../services/userService");

const SMASH_CHARACTERS = require("../../data/smash.json");
const BET_INCREMENT = config.smash.betIncrement;
const SMASH_TIMEOUT = config.smash.timeout * 1000;
const COIN = config.emojis.coin;

const sessions = new Map();

const CHARACTER_ALIASES = {
  dk: "donkeykong", krool: "kingkrool", kkr: "kingkrool",
  gw: "mrgamewatch", gameandwatch: "mrgamewatch", mac: "littlemac",
  zss: "zerosuitsamus", dedede: "kingdedede", gannon: "ganondorf",
  pyra: "pyramythra", mythra: "pyramythra", aegis: "pyramythra",
  banjo: "banjo", kazooie: "banjo", rosalina: "rosalina", estela: "rosalina",
  bowserjr: "bowserjr", bj: "bowserjr", robalina: "rob", bayo: "bayonetta",
  planta: "piranhaplant", doc: "drmario", capitanfalcon: "captainfalcon",
  falcon: "captainfalcon", samusoscura: "darksamus",
};

function findCharacter(input) {
  const query = input.toLowerCase().replace(/[^a-z0-9]/g, "");
  const searchId = CHARACTER_ALIASES[query] || query;

  return (
      SMASH_CHARACTERS.find(c => c.id === searchId) ||
      SMASH_CHARACTERS.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, "") === searchId) ||
      SMASH_CHARACTERS.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, "").includes(searchId))
  );
}

function buildPanel(session) {
  let totalPot = 0;
  const byChar = {};

  for (const [userId, data] of session.bettors) {
    totalPot += data.amount;
    if (!byChar[data.characterId]) byChar[data.characterId] = { total: 0, users: [] };
    byChar[data.characterId].total += data.amount;
    byChar[data.characterId].users.push({ userId, amount: data.amount });
  }

  const activeCharacters = SMASH_CHARACTERS.filter(c => byChar[c.id]);
  const characterLines = activeCharacters.length > 0
      ? activeCharacters.map(char => {
        const entry = byChar[char.id];
        const names = entry.users.map(u => `<@${u.userId}> (${COIN}${u.amount.toLocaleString()})`).join(", ");
        return `> ${char.emoji} **${char.name}** — ${COIN}${entry.total.toLocaleString()} | ${names}`;
      })
      : ["> Nadie ha apostado todavía. Sean los primeros."];

  const statusLine = session.open
      ? `⏳ **Apuestas abiertas** — Bote: ${COIN}${totalPot.toLocaleString()}`
      : `🔒 **Apuestas cerradas** — Bote: ${COIN}${totalPot.toLocaleString()}`;

  const container = new ContainerBuilder()
      .setAccentColor(0x6C3483)
      .addTextDisplayComponents(t =>
          t.setContent(
              `### 🎮 Smash Bros — Apuestas\nHosteado por <@${session.hostId}>\n\n${statusLine}\n\n${characterLines.join("\n")}`
          )
      )
      .addSeparatorComponents(s => s);

  if (session.open) {
    container.addActionRowComponents(row =>
        row.setComponents(
            new ButtonBuilder()
                .setCustomId(`smash_bet_${session.sessionId}`)
                .setLabel(`Apostar +${(BET_INCREMENT / 1000).toFixed(0)}k`)
                .setEmoji("🪙")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`smash_close_${session.sessionId}`)
                .setLabel("Cerrar apuestas")
                .setEmoji("🚀")
                .setStyle(ButtonStyle.Success),
        )
    );
  }

  return container;
}

module.exports = {
  data: new SlashCommandBuilder()
      .setName("smash")
      .setDescription("Abre una sesión de apuestas para Smash Bros"),

  async execute(interaction) {
    const hostId = interaction.user.id;

    for (const [, s] of sessions) {
      if (s.hostId === hostId && s.open) {
        return interaction.reply({
          content: "Ya tienes una sesión activa. Ciérrala antes de abrir una nueva.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    await userService.createUser(hostId, interaction.user.username);

    const sessionId = interaction.id;
    const tempSession = {
      hostId, channelId: interaction.channelId, sessionId,
      messageId: null, open: true, bettors: new Map(), timeout: null,
    };

    await interaction.reply({ components: [buildPanel(tempSession)], flags: MessageFlags.IsComponentsV2 });

    const reply = await interaction.fetchReply();
    tempSession.messageId = reply.id;

    tempSession.timeout = setTimeout(async () => {
      const session = sessions.get(sessionId);
      if (!session || !session.open) return;
      session.open = false;
      try {
        const msg = await interaction.channel.messages.fetch(session.messageId);
        await msg.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });
      } catch (_) {}
    }, SMASH_TIMEOUT);

    sessions.set(sessionId, tempSession);
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("smash_")) return false;

    const parts = interaction.customId.split("_");
    const action = parts[1];
    const sessionId = parts[2];
    const session = sessions.get(sessionId);

    if (action === "bet") {
      if (!session || !session.open) {
        return interaction.reply({ content: "Las apuestas ya están cerradas.", flags: MessageFlags.Ephemeral });
      }

      const userId = interaction.user.id;

      if (session.bettors.has(userId)) {
        const bettor = session.bettors.get(userId);
        await userService.createUser(userId, interaction.user.username);

        try {
          await userService.removeBalance(userId, BET_INCREMENT, false);
        } catch {
          return interaction.reply({
            content: `No tienes suficientes monedas para aumentar tu apuesta.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        bettor.amount += BET_INCREMENT;
        const charName = SMASH_CHARACTERS.find(c => c.id === bettor.characterId)?.name;

        const msg = await interaction.channel.messages.fetch(session.messageId);
        await msg.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });

        return interaction.reply({
          content: `Apuesta aumentada. Ahora tienes **${COIN}${bettor.amount.toLocaleString()}** en **${charName}**.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder().setCustomId("smash_modal").setTitle("¿A quién le apuestas?");
      modal.addComponents(
          new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                  .setCustomId(`charinput_${sessionId}`)
                  .setLabel("Nombre o alias del personaje")
                  .setPlaceholder("Ej: DK, Mario, Steve, Samus...")
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
                  .setMinLength(1)
                  .setMaxLength(30)
          )
      );

      return interaction.showModal(modal);
    }

    if (action === "close") {
      if (!session) {
        return interaction.reply({ content: "Esta sesión ya no existe.", flags: MessageFlags.Ephemeral });
      }
      if (interaction.user.id !== session.hostId) {
        return interaction.reply({ content: "Solo el hoster puede cerrar las apuestas.", flags: MessageFlags.Ephemeral });
      }
      if (!session.open) {
        return interaction.reply({ content: "Las apuestas ya estaban cerradas.", flags: MessageFlags.Ephemeral });
      }

      clearTimeout(session.timeout);
      session.open = false;

      const msg = await interaction.channel.messages.fetch(session.messageId);
      await msg.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });

      return interaction.reply({
        content: "Apuestas cerradas. Usa `/smash-resultado` para declarar al ganador cuando termine el juego.",
        flags: MessageFlags.Ephemeral,
      });
    }

    return false;
  },

  async handleModal(interaction) {
    if (interaction.customId !== "smash_modal") return;

    const inputField = interaction.fields.fields.first();
    const sessionId = inputField.customId.replace("charinput_", "");
    const session = sessions.get(sessionId);

    if (!session || !session.open) {
      return interaction.reply({ content: "Las apuestas ya están cerradas.", flags: MessageFlags.Ephemeral });
    }

    const userId = interaction.user.id;
    if (session.bettors.has(userId)) {
      return interaction.reply({
        content: "Ya apostaste. Usa el botón de apostar para sumar más a tu apuesta.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const char = findCharacter(inputField.value);
    if (!char) {
      return interaction.reply({
        content: `No encontré ningún personaje con "${inputField.value}". Intenta con el nombre completo.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const uniqueChars = new Set([...session.bettors.values()].map(d => d.characterId));
    if (!uniqueChars.has(char.id) && uniqueChars.size >= 8) {
      return interaction.reply({
        content: "Ya hay 8 personajes en esta partida. Elige uno de los que ya participan.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await userService.createUser(userId, interaction.user.username);
    try {
      await userService.removeBalance(userId, BET_INCREMENT, false);
    } catch {
      return interaction.reply({
        content: `No tienes suficientes monedas para apostar.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    session.bettors.set(userId, { characterId: char.id, amount: BET_INCREMENT, username: interaction.user.username });

    const msg = await interaction.channel.messages.fetch(session.messageId);
    await msg.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });

    return interaction.reply({
      content: `¡Apuesta registrada! **${COIN}${BET_INCREMENT.toLocaleString()}** van a **${char.name}** ${char.emoji}. Que gane el mejor.`,
      flags: MessageFlags.Ephemeral,
    });
  },

  sessions,
  findCharacter,
};