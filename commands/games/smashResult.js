const { SlashCommandBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../core.json");
const userService = require("../../services/userService");
const { logTransaction } = require("../../services/transactionService");
const smashCommand = require("./smash");

const HOST_CUT = config.smash.hostCut;
const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("smash-resultado")
      .setDescription("Declara el personaje ganador y distribuye el bote")
      .addStringOption(opt =>
          opt.setName("personaje").setDescription("Nombre o alias del personaje ganador").setRequired(true)
      ),

  async execute(interaction) {
    const hostId = interaction.user.id;
    const winnerInput = interaction.options.getString("personaje");
    const winnerChar = smashCommand.findCharacter(winnerInput);

    if (!winnerChar) {
      return interaction.reply({
        content: `No encontré ningún personaje con "${winnerInput}". Revisa el nombre o alias.`,
        flags: MessageFlags.Ephemeral,
      });
    }

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
        content: "No tienes ninguna sesión de apuestas cerrada esperando resultado.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    let totalPot = 0;
    for (const [, data] of session.bettors) totalPot += data.amount;

    const winners = [...session.bettors.entries()]
        .filter(([, data]) => data.characterId === winnerChar.id)
        .map(([userId, data]) => ({ userId, amount: data.amount, username: data.username }));

    const hostEarnings = Math.floor(totalPot * HOST_CUT);
    const prizePool = totalPot - hostEarnings;

    await userService.createUser(hostId, interaction.user.username);
    await userService.addBalance(hostId, hostEarnings, false);
    await logTransaction({ discordId: hostId, type: "smash_host", amount: hostEarnings });

    if (winners.length === 0) {
      await userService.addBalance(hostId, prizePool, false);
      await logTransaction({ discordId: hostId, type: "smash_host_nowinners", amount: prizePool });
      sessions.delete(sessionKey);

      return interaction.editReply({
        components: [
          new ContainerBuilder().setAccentColor(0x5B7FA6)
              .addTextDisplayComponents(t => t.setContent(
                  `### ${winnerChar.emoji} ${winnerChar.name} ganó — sin apostadores\n` +
                  `Nadie apostó por **${winnerChar.name}**. El bote de ${COIN}${totalPot.toLocaleString()} fue directo al hoster.`
              ))
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const winnersTotalBet = winners.reduce((sum, w) => sum + w.amount, 0);
    const payoutLines = [];

    for (const winner of winners) {
      const payout = Math.floor(prizePool * (winner.amount / winnersTotalBet));
      await userService.addBalance(winner.userId, payout, false);
      await logTransaction({ discordId: winner.userId, type: "smash_win", amount: payout });
      payoutLines.push(`<@${winner.userId}> apostó ${COIN}${winner.amount.toLocaleString()} → recibe ${COIN}${payout.toLocaleString()}`);
    }

    sessions.delete(sessionKey);

    return interaction.editReply({
      components: [
        new ContainerBuilder().setAccentColor(0xF4C542)
            .addTextDisplayComponents(t => t.setContent(
                `### ${winnerChar.emoji} ¡${winnerChar.name} ganó!\n\n` +
                `**Bote total:** ${COIN}${totalPot.toLocaleString()}\n` +
                `**Comisión del hoster (${HOST_CUT * 100}%):** ${COIN}${hostEarnings.toLocaleString()}\n` +
                `**Premio repartido:** ${COIN}${prizePool.toLocaleString()}\n\n` +
                `**Ganadores:**\n${payoutLines.join("\n")}`
            ))
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};