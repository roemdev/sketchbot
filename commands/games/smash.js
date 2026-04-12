const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const config = require("../../core.json");
const userService = require("../../services/userService");

const SMASH_TIMEOUT = config.smash.timeout * 1000;
const BET_INCREMENT = config.smash.betIncrement;

const SMASH_CHARACTERS = require("../../data/smash.json");
const CHARACTER_ALIASES = {
  "dk": "donkey kong",
  "k rool": "king k. rool",
  "k. rool": "king k. rool",
  "diddy": "diddy kong",
  "bayo": "samus", // or separate if there's a specific samus/bayo alias needed
  "g&w": "mr. game & watch",
  "game and watch": "mr. game & watch",
  "doc": "dr. mario",
  "dedede": "king dedede",
  "zss": "zero suit samus",
  "falcon": "captain falcon",
  "puff": "jigglypuff",
  "jiggly": "jigglypuff",
  "mac": "little mac",
  "rosa": "rosalina & luma",
  "rosalina": "rosalina & luma",
  "byleth": "byleth",
  "hero": "byleth", // Simplified for generic matching
  "minmin": "min min",
  "pac": "pac-man",
  "pacman": "pac-man",
  "pythra": "pyra / mythra",
  "pyra": "pyra / mythra",
  "mythra": "pyra / mythra",
  "aegis": "pyra / mythra",
  "plant": "piranha plant",
  "brawler": "mii brawler",
  "swordfighter": "mii swordfighter",
  "gunner": "mii gunner",
};

const sessions = new Map();

function findCharacter(input) {
  const lowerInput = input.toLowerCase().trim();
  const mapped = CHARACTER_ALIASES[lowerInput] || lowerInput;

  return SMASH_CHARACTERS.find(char =>
    char.name.toLowerCase() === mapped ||
    char.name.toLowerCase().includes(mapped) ||
    char.id.toLowerCase() === mapped
  );
}

function buildPanel(session) {
  let totalBote = 0;
  for (const [, data] of session.bettors) totalBote += data.amount;

  const characters = new Map();
  for (const [, data] of session.bettors) {
    if (!characters.has(data.characterId)) {
      const char = SMASH_CHARACTERS.find(c => c.id === data.characterId);
      characters.set(data.characterId, {
        emoji: char.emoji,
        name: char.name,
        total: 0,
        players: [],
      });
    }
    const cData = characters.get(data.characterId);
    cData.total += data.amount;
    cData.players.push(`${data.username} (${config.emojis.coin}${data.amount.toLocaleString()})`);
  }

  let playersList = "";
  if (characters.size === 0) {
    playersList = "Aún nadie ha apostado.";
  } else {
    for (const [, cData] of characters) {
      playersList += `\n${cData.emoji} **${cData.name}** - Total: ${config.emojis.coin}${cData.total.toLocaleString()}\n`;
      playersList += cData.players.map(p => `└ ${p}`).join("\n") + "\n";
    }
  }

  const container = new ContainerBuilder()
      .setAccentColor(0x6C3483)
      .addTextDisplayComponents(t =>
          t.setContent(
              `### 🥊 ¡Arrancan las Apuestas de Smash Bros!\n` +
              `**Mesa manejada por:** <@${session.hostId}>\n` +
              `**Taquilla:** ${session.open ? "🟢 ¡Vengan esas monedas!" : "🔴 NO VA MÁS"}\n\n` +
              `**Pozo en Juego:** **${totalBote.toLocaleString()}** ${config.emojis.coin}\n` +
              `**Jugadores apostados:**\n${playersList}`
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
                .setLabel("Cerrar apuestas e iniciar")
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
          content: `❌ ¡Epa! Ya tienes una mesa de apuestas abierta. Ciérrala antes de armar otra fiesta.`,
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

    const container = buildPanel(tempSession);
    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

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
        return interaction.reply({
          content: `🔒 Demasiado tarde. Las apuestas están cerradas.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const userId = interaction.user.id;

      if (session.bettors.has(userId)) {
        const bettor = session.bettors.get(userId);
        await userService.createUser(userId, interaction.user.username);

        try {
          await userService.removeBalance(userId, BET_INCREMENT, false);
        } catch {
          return interaction.reply({
            content: `❌ Mmm... no te alcanza para más. Cuesta **${BET_INCREMENT.toLocaleString()}** ${config.emojis.coin} subir la apuesta.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        bettor.amount += BET_INCREMENT;
        const charName = SMASH_CHARACTERS.find(c => c.id === bettor.characterId)?.name;
        const msg = await interaction.channel.messages.fetch(session.messageId);
        await msg.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });

        return interaction.reply({
          content: `🔥 ¡Te calientas! Ahora tienes **${bettor.amount.toLocaleString()}** ${config.emojis.coin} metidos en **${charName}**. ¡A cruzar los dedos!`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder().setCustomId("smash_modal").setTitle("Elige tu personaje de Smash");
      modal.addComponents(
          new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                  .setCustomId(`charinput_${sessionId}`)
                  .setLabel("Escribe el nombre o alias")
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
        return interaction.reply({
          content: `❌ Aquí no hay nada, esta sesión desapareció.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.user.id !== session.hostId) {
        return interaction.reply({
          content: `🚫 ¡Manos quietas! Solo el dueño de la mesa puede cerrar la caja.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!session.open) {
        return interaction.reply({
          content: `ℹ️ Ya cerraste las apuestas, amigo. No le des más veces.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      clearTimeout(session.timeout);
      session.open = false;

      const msg = await interaction.channel.messages.fetch(session.messageId);
      await msg.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });

      return interaction.reply({
        content: `🔒 ¡La suerte está echada! Usa \`/smash-resultado\` cuando los golpes acaben.`,
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
      return interaction.reply({
        content: `🔒 ¡Demasiado lento! La mesa acaba de cerrar.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const userId = interaction.user.id;
    if (session.bettors.has(userId)) {
      return interaction.reply({
        content: `ℹ️ Oye, ya apostaste. Si quieres subir la apuesta, pica el botón de apostar de nuevo.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const char = findCharacter(inputField.value);
    if (!char) {
      return interaction.reply({
        content: `❌ Hmm... ¿"${inputField.value}"? Ese no me suena de nada. Intenta escribir su nombre mejor.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const uniqueChars = new Set([...session.bettors.values()].map(d => d.characterId));
    if (!uniqueChars.has(char.id) && uniqueChars.size >= 8) {
      return interaction.reply({
        content: `❌ ¡Uy! Ya tenemos a 8 personajes partiéndose la cara. Te toca escoger a alguno de los que ya están en el ring.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await userService.createUser(userId, interaction.user.username);
    try {
      await userService.removeBalance(userId, BET_INCREMENT, false);
    } catch {
      return interaction.reply({
        content: `❌ Pfff... no te alcanza. La entrada mínima es **${BET_INCREMENT.toLocaleString()}** ${config.emojis.coin}. Ve a juntar moneditas.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    session.bettors.set(userId, { characterId: char.id, amount: BET_INCREMENT, username: interaction.user.username });

    const msg = await interaction.channel.messages.fetch(session.messageId);
    await msg.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });

    return interaction.reply({
      content: `💥 ¡Boom! Has lanzado **${BET_INCREMENT.toLocaleString()}** ${config.emojis.coin} sobre los hombros de **${char.name}**. ¡Que no te decepcione!`,
      flags: MessageFlags.Ephemeral,
    });
  },

  sessions,
  findCharacter,
};
