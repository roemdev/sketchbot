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
      .setAccentColor(0xC0392B)
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
          components: [
            new ContainerBuilder().setAccentColor(0xC0392B)
                .addTextDisplayComponents(t => t.setContent("### ❌ Sesión activa\nCierra la sesión anterior antes de abrir una nueva."))
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
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
          components: [
            new ContainerBuilder().setAccentColor(0xC0392B)
                .addTextDisplayComponents(t => t.setContent("### 🔒 Sesión cerrada\nLas apuestas ya están cerradas."))
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
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
            components: [
              new ContainerBuilder().setAccentColor(0xC0392B)
                  .addTextDisplayComponents(t => t.setContent(`### ❌ Saldo insuficiente\nNecesitas ${config.emojis.coin}${BET_INCREMENT.toLocaleString()} para aumentar tu apuesta.`))
            ],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
          });
        }

        bettor.amount += BET_INCREMENT;
        const charName = SMASH_CHARACTERS.find(c => c.id === bettor.characterId)?.name;
        const msg = await interaction.channel.messages.fetch(session.messageId);
        await msg.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });

        return interaction.reply({
          components: [
            new ContainerBuilder().setAccentColor(0xF4C542)
                .addTextDisplayComponents(t => t.setContent(`### ✅ Apuesta aumentada\nTu apuesta total es ahora ${config.emojis.coin}${bettor.amount.toLocaleString()} en **${charName}**.`))
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
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
          components: [
            new ContainerBuilder().setAccentColor(0xC0392B)
                .addTextDisplayComponents(t => t.setContent("### ❌ No encontrada\nEsta sesión ya no existe."))
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      if (interaction.user.id !== session.hostId) {
        return interaction.reply({
          components: [
            new ContainerBuilder().setAccentColor(0xC0392B)
                .addTextDisplayComponents(t => t.setContent("### 🚫 Sin permiso\nSolo el hoster puede cerrar las apuestas."))
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      if (!session.open) {
        return interaction.reply({
          components: [
            new ContainerBuilder().setAccentColor(0x5B7FA6)
                .addTextDisplayComponents(t => t.setContent("### ℹ️ Ya cerrado\nLas apuestas ya estaban cerradas."))
          ],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      clearTimeout(session.timeout);
      session.open = false;

      const msg = await interaction.channel.messages.fetch(session.messageId);
      await msg.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });

      return interaction.reply({
        components: [
          new ContainerBuilder().setAccentColor(0xF4C542)
              .addTextDisplayComponents(t => t.setContent("### ✅ Apuestas cerradas\nUsa `/smash-resultado` para declarar el personaje ganador cuando termine el juego."))
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
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
        components: [
          new ContainerBuilder().setAccentColor(0xC0392B)
              .addTextDisplayComponents(t => t.setContent("### 🔒 Sesión cerrada\nLas apuestas ya están cerradas."))
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }

    const userId = interaction.user.id;
    if (session.bettors.has(userId)) {
      return interaction.reply({
        components: [
          new ContainerBuilder().setAccentColor(0x5B7FA6)
              .addTextDisplayComponents(t => t.setContent("### ℹ️ Ya apostaste\nUsa el botón de apostar directamente para sumar a tu apuesta."))
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }

    const char = findCharacter(inputField.value);
    if (!char) {
      return interaction.reply({
        components: [
          new ContainerBuilder().setAccentColor(0xC0392B)
              .addTextDisplayComponents(t => t.setContent(`### ❌ No encontrado\nNo se encontró ningún personaje asociado a "${inputField.value}". Intenta escribir el nombre completo.`))
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }

    const uniqueChars = new Set([...session.bettors.values()].map(d => d.characterId));
    if (!uniqueChars.has(char.id) && uniqueChars.size >= 8) {
      return interaction.reply({
        components: [
          new ContainerBuilder().setAccentColor(0xC0392B)
              .addTextDisplayComponents(t => t.setContent("### ❌ Límite alcanzado\nYa se apostó al límite de 8 personajes. Escoge uno de los que ya participan."))
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }

    await userService.createUser(userId, interaction.user.username);
    try {
      await userService.removeBalance(userId, BET_INCREMENT, false);
    } catch {
      return interaction.reply({
        components: [
          new ContainerBuilder().setAccentColor(0xC0392B)
              .addTextDisplayComponents(t => t.setContent(`### ❌ Saldo insuficiente\nNecesitas ${config.emojis.coin}${BET_INCREMENT.toLocaleString()} para apostar.`))
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }

    session.bettors.set(userId, { characterId: char.id, amount: BET_INCREMENT, username: interaction.user.username });

    const msg = await interaction.channel.messages.fetch(session.messageId);
    await msg.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });

    return interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(0xF4C542)
            .addTextDisplayComponents(t => t.setContent(`### ✅ ¡Apuesta registrada!\nApostaste ${config.emojis.coin}${BET_INCREMENT.toLocaleString()} a **${char.name}**.`))
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },

  sessions,
  findCharacter,
};
