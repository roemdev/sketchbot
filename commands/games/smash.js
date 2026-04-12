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
const HOST_CUT = config.smash.hostCut;

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
  const COIN = config.emojis.coin;
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
      : ["> Aún no hay apuestas registradas."];

  const statusLine = session.open
      ? `⏳ **Apuestas abiertas** — Bote total: ${COIN}${totalPot.toLocaleString()}`
      : `🔒 **Apuestas cerradas** — Bote total: ${COIN}${totalPot.toLocaleString()}`;

  const container = new ContainerBuilder()
      .setAccentColor(0xC0392B)
      .addTextDisplayComponents(t =>
          t.setContent(
              `### 🎮 Smash Bros — Torneo de Apuestas\nHosteado por <@${session.hostId}>\n\n${statusLine}\n\n${characterLines.join("\n")}`
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