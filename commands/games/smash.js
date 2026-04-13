const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ContainerBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const config = require("../../core.json");
const userService = require("../../services/userService");
const { logTransaction } = require("../../services/transactionService");
const SMASH_CHARACTERS = require("../../data/smash.json");

const BET_INCREMENT = config.smash.betIncrement;
const SMASH_TIMEOUT = config.smash.timeout * 1000;
const HOST_CUT = config.smash.hostCut;
const COIN = config.emojis.coin;

const sessions = new Map();

// --- Funciones de Utilidad ---
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
      : ["> Nadie ha apostado todavía."];

  const statusLine = session.open
      ? `⏳ **Apuestas abiertas** — Bote: ${COIN}${totalPot.toLocaleString()}`
      : `🔒 **Apuestas cerradas** — Bote: ${COIN}${totalPot.toLocaleString()}`;

  const container = new ContainerBuilder()
      .setAccentColor(0x6C3483)
      .addTextDisplayComponents(t => t.setContent(`### 🎮 Smash Bros — Apuestas\nHost: <@${session.hostId}>\n\n${statusLine}\n\n${characterLines.join("\n")}`))
      .addSeparatorComponents(s => s);

  if (session.open) {
    container.addActionRowComponents(row => row.setComponents(
        new ButtonBuilder().setCustomId(`smash_bet_${session.sessionId}`).setLabel(`Apostar +${(BET_INCREMENT / 1000).toFixed(0)}k`).setEmoji("🪙").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`smash_close_${session.sessionId}`).setLabel("Cerrar apuestas").setEmoji("🚀").setStyle(ButtonStyle.Success),
    ));
  }
  return container;
}

module.exports = {
  data: new SlashCommandBuilder()
      .setName("smash")
      .setDescription("Gestión de apuestas de Smash Bros")
      .addSubcommand(sub =>
          sub.setName("nuevo")
              .setDescription("Abre una nueva sesión de apuestas")
      )
      .addSubcommand(sub =>
          sub.setName("resultado")
              .setDescription("Declara el ganador y reparte el bote")
              .addStringOption(o => o.setName("ganador").setDescription("Nombre o alias del personaje que ganó").setRequired(true))
      ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const hostId = interaction.user.id;

    // --- LÓGICA: NUEVO ---
    if (sub === "nuevo") {
      for (const [, s] of sessions) {
        if (s.hostId === hostId && s.open) {
          return interaction.reply({ content: "Ya tienes una sesión activa.", flags: MessageFlags.Ephemeral });
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
        if (session && session.open) {
          session.open = false;
          const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
          if (msg) await msg.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });
        }
      }, SMASH_TIMEOUT);

      sessions.set(sessionId, tempSession);
    }

    // --- LÓGICA: RESULTADO ---
    if (sub === "resultado") {
      const winnerInput = interaction.options.getString("ganador");
      const winnerChar = findCharacter(winnerInput);

      if (!winnerChar) {
        return interaction.reply({ content: `No encontré al personaje "${winnerInput}".`, flags: MessageFlags.Ephemeral });
      }

      let sessionKey, session;
      for (const [key, s] of sessions) {
        if (s.hostId === hostId && !s.open) {
          session = s;
          sessionKey = key;
          break;
        }
      }

      if (!session) {
        return interaction.reply({ content: "No tienes sesiones cerradas esperando resultado.", flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply();
      let totalPot = 0;
      for (const [, data] of session.bettors) totalPot += data.amount;

      const winners = [...session.bettors.entries()]
          .filter(([, data]) => data.characterId === winnerChar.id)
          .map(([uId, data]) => ({ uId, amount: data.amount }));

      const hostEarnings = Math.floor(totalPot * HOST_CUT);
      const prizePool = totalPot - hostEarnings;

      await userService.addBalance(hostId, hostEarnings, false);
      await logTransaction({ discordId: hostId, type: "smash_host", amount: hostEarnings });

      if (winners.length === 0) {
        await userService.addBalance(hostId, prizePool, false);
        sessions.delete(sessionKey);
        return interaction.editReply({
          components: [new ContainerBuilder().setAccentColor(0x5B7FA6).addTextDisplayComponents(t => t.setContent(`### ${winnerChar.emoji} ${winnerChar.name} ganó\nNadie apostó por él. El bote va al host.`))],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const winnersTotalBet = winners.reduce((sum, w) => sum + w.amount, 0);
      for (const winner of winners) {
        const payout = Math.floor(prizePool * (winner.amount / winnersTotalBet));
        await userService.addBalance(winner.uId, payout, false);
        await logTransaction({ discordId: winner.uId, type: "smash_win", amount: payout });
      }

      sessions.delete(sessionKey);
      return interaction.editReply({
        components: [new ContainerBuilder().setAccentColor(0xF4C542).addTextDisplayComponents(t => t.setContent(`### 🏆 ¡${winnerChar.name} ganó!\nBote repartido: ${COIN}${prizePool.toLocaleString()}.`))],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },

  // --- HANDLER DE BOTONES Y MODAL ---
  async buttonHandler(interaction) {
    if (!interaction.isButton() || !interaction.customId.startsWith("smash_")) return false;
    const [ , action, sessionId] = interaction.customId.split("_");
    const session = sessions.get(sessionId);

    if (action === "close" && session) {
      if (interaction.user.id !== session.hostId) return interaction.reply({ content: "Solo el host puede cerrar.", flags: MessageFlags.Ephemeral });
      clearTimeout(session.timeout);
      session.open = false;
      await interaction.update({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });
      return true;
    }

    if (action === "bet" && session && session.open) {
      if (session.bettors.has(interaction.user.id)) {
        const bettor = session.bettors.get(interaction.user.id);
        try {
          await userService.removeBalance(interaction.user.id, BET_INCREMENT, false);
          bettor.amount += BET_INCREMENT;
          await interaction.message.edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });
          return interaction.reply({ content: `Apuesta aumentada a **${COIN}${bettor.amount.toLocaleString()}**.`, flags: MessageFlags.Ephemeral });
        } catch {
          return interaction.reply({ content: "No tienes suficientes monedas.", flags: MessageFlags.Ephemeral });
        }
      }
      const modal = new ModalBuilder().setCustomId("smash_modal").setTitle("¿A quién le apuestas?");
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`charinput_${sessionId}`).setLabel("Personaje").setStyle(TextInputStyle.Short).setRequired(true)));
      await interaction.showModal(modal);
      return true;
    }
    return false;
  },

  async handleModal(interaction) {
    if (interaction.customId !== "smash_modal") return;
    const input = interaction.fields.fields.first();
    const sessionId = input.customId.replace("charinput_", "");
    const session = sessions.get(sessionId);

    if (!session || !session.open) return interaction.reply({ content: "Apuestas cerradas.", flags: MessageFlags.Ephemeral });
    const char = findCharacter(input.value);
    if (!char) return interaction.reply({ content: "Personaje no encontrado.", flags: MessageFlags.Ephemeral });

    try {
      await userService.removeBalance(interaction.user.id, BET_INCREMENT, false);
      session.bettors.set(interaction.user.id, { characterId: char.id, amount: BET_INCREMENT });
      await (await interaction.channel.messages.fetch(session.messageId)).edit({ components: [buildPanel(session)], flags: MessageFlags.IsComponentsV2 });
      return interaction.reply({ content: `¡Apuesta registrada por ${char.name}!`, flags: MessageFlags.Ephemeral });
    } catch {
      return interaction.reply({ content: "No tienes suficientes monedas.", flags: MessageFlags.Ephemeral });
    }
  }
};