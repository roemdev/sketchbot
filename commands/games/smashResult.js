const { SlashCommandBuilder, MessageFlags } = require("discord.js");

const config = require("../../core.json");
const userService = require("../../services/userService");
const { logTransaction } = require("../../services/transactionService");
const { makeEmbed } = require("../../utils/embedFactory");
const smashCommand = require("./smash");

const SMASH_CHARACTERS = config.smash.characters;
const HOST_CUT = config.smash.hostCut;

// ─── Buscador de Personajes ──────────────────────────────────────────────────
function findCharacter(input) {
  const query = input.toLowerCase().replace(/[^a-z0-9]/g, "");

  const aliases = {
    dk: "donkeykong",
    krool: "kingkrool",
    kkr: "kingkrool",
    gw: "mrgamewatch",
    gameandwatch: "mrgamewatch",
    mac: "littlemac",
    zss: "zerosuitsamus",
    dedede: "kingdedede",
    gannon: "ganondorf",
    zelda: "zelda",
    pyra: "pyramythra",
    mythra: "pyramythra",
    aegis: "pyramythra",
    banjo: "banjo",
    kazooie: "banjo",
    rosalina: "rosalina",
    estela: "rosalina",
    bowserjr: "bowserjr",
    bj: "bowserjr",
    robalina: "rob",
    bayo: "bayonetta",
    planta: "piranhaplant",
    doc: "drmario",
    capitanfalcon: "captainfalcon",
    falcon: "captainfalcon",
    samusoscura: "darksamus",
  };

  const searchId = aliases[query] || query;

  let found = SMASH_CHARACTERS.find((c) => c.id === searchId);
  if (found) return found;

  found = SMASH_CHARACTERS.find(
    (c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, "") === searchId,
  );
  if (found) return found;

  found = SMASH_CHARACTERS.find((c) =>
    c.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .includes(searchId),
  );
  return found;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("smash-resultado")
    .setDescription("Declara el personaje ganador y distribuye el bote")
    .addStringOption((opt) =>
      opt
        .setName("personaje")
        .setDescription("Escribe el nombre o alias del personaje ganador")
        .setRequired(true),
    ),

  async execute(interaction) {
    const hostId = interaction.user.id;
    const winnerInput = interaction.options.getString("personaje");
    const coin = config.emojis.coin;

    // Usamos el buscador en lugar de las opciones predefinidas
    const winnerChar = findCharacter(winnerInput);

    if (!winnerChar) {
      return interaction.reply({
        embeds: [
          makeEmbed(
            "error",
            "Personaje no encontrado",
            `No se encontró ningún personaje asociado a "${winnerInput}". Escribe el nombre o alias correctamente.`,
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const winnerCharId = winnerChar.id;

    // Find this host's active (closed) session
    const sessions = smashCommand.sessions;
    let session = null;
    let sessionKey = null;

    for (const [key, s] of sessions) {
      if (s.hostId === hostId && !s.open) {
        session = s;
        sessionKey = key;
        break;
      }
    }

    if (!session) {
      return interaction.reply({
        embeds: [
          makeEmbed(
            "error",
            "Sin sesión activa",
            "No tienes ninguna sesión de apuestas cerrada pendiente de resultado.",
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Calculate pot
    let totalPot = 0;
    for (const [, data] of session.bettors) totalPot += data.amount;

    // Winners: all bettors who chose the winning character
    const winners = [];
    for (const [userId, data] of session.bettors) {
      if (data.characterId === winnerCharId) {
        winners.push({ userId, amount: data.amount, username: data.username });
      }
    }

    // Host cut (always)
    const hostEarnings = Math.floor(totalPot * HOST_CUT);
    const prizePool = totalPot - hostEarnings;

    await interaction.deferReply();

    // Pay host
    await userService.createUser(hostId, interaction.user.username);
    await userService.addBalance(hostId, hostEarnings, false);
    await logTransaction({
      discordId: hostId,
      type: "smash_host",
      amount: hostEarnings,
    });

    if (winners.length === 0) {
      // Nadie ganó, el pozo restante se le queda al host
      await userService.addBalance(hostId, prizePool, false);
      await logTransaction({
        discordId: hostId,
        type: "smash_host_nowinners",
        amount: prizePool,
      });

      sessions.delete(sessionKey);

      return interaction.editReply({
        embeds: [
          makeEmbed(
            "info",
            `${winnerChar.emoji} ${winnerChar.name} ganó — sin apostadores`,
            `Nadie apostó por **${winnerChar.name}**. El bote de ${coin}${totalPot.toLocaleString()} fue al hoster.`,
          ),
        ],
      });
    }

    // Distribute proportionally
    const winnersTotalBet = winners.reduce((sum, w) => sum + w.amount, 0);
    const payoutLines = [];

    for (const winner of winners) {
      const proportion = winner.amount / winnersTotalBet;
      const payout = Math.floor(prizePool * proportion);
      await userService.addBalance(winner.userId, payout, false);
      await logTransaction({
        discordId: winner.userId,
        type: "smash_win",
        amount: payout,
      });
      payoutLines.push(
        `<@${winner.userId}> apostó ${coin}${winner.amount.toLocaleString()} → recibe ${coin}${payout.toLocaleString()}`,
      );
    }

    sessions.delete(sessionKey);

    return interaction.editReply({
      embeds: [
        makeEmbed(
          "success",
          `${winnerChar.emoji} ${winnerChar.name} ganó`,
          [
            `**Bote total:** ${coin}${totalPot.toLocaleString()}`,
            `**Comisión del hoster (${HOST_CUT * 100}%):** ${coin}${hostEarnings.toLocaleString()}`,
            `**Premio repartido:** ${coin}${prizePool.toLocaleString()}`,
            ``,
            `**Ganadores:**`,
            ...payoutLines,
          ].join("\n"),
        ),
      ],
    });
  },
};
