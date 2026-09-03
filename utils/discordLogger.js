const { MessageFlags } = require("discord.js");
const config = require("./config");
const COIN = config.emojis.coin;

/**
 * Envía un log público del resultado del juego al canal donde se jugó
 * y lo auto-elimina después de 30 segundos para mantener el canal limpio.
 */
async function logGameOutcome(interaction, gameName, bet, netProfit, won) {
  try {
    const channel = interaction.channel;
    if (!channel) return;

    const user = interaction.user;
    const emoji = won ? "📈" : "📉";
    const status = won ? "ganó" : "perdió";

    // Si perdió, no se muestra el signo "-" porque el término "perdió" ya lo indica
    const netChange = won
      ? `${COIN}${netProfit.toLocaleString("es-DO")}`
      : `${COIN}${bet.toLocaleString("es-DO")}`;

    const amountDetails = (won && bet > 0)
      ? ` (Apuesta: ${COIN}${bet.toLocaleString("es-DO")})`
      : "";

    const messageText = `${emoji} **[${gameName}]** <@${user.id}> **${status}** **${netChange}**${amountDetails}`;

    // Enviar el mensaje de forma normal en el canal donde se está jugando
    const sentMessage = await channel.send({ content: messageText });

    // Auto-eliminar el mensaje después de 30 segundos (30,000 ms)
    setTimeout(async () => {
      try {
        await sentMessage.delete();
      } catch (err) {
        // Ignorar si el mensaje ya fue eliminado manualmente o si faltan permisos
        if (err.code !== 10008) {
          console.error("[discordLogger] Error al auto-eliminar el log:", err.message);
        }
      }
    }, 30000);

    // --- ENVIAR NOTIFICACIÓN AL CANAL DE LOGS PÚBLICO ---
    const publicLogService = require("../services/publicLogService");
    if (interaction.client && user) {
      if (won) {
        if (gameName === "Trabajo" || gameName === "Tarea Diaria" || gameName === "Subsidio Diario") {
          publicLogService.logWorkReward(interaction.client, { userId: user.id, amount: netProfit, sourceName: gameName }).catch(() => {});
        } else if (netProfit > 0) {
          publicLogService.logCoinWin(interaction.client, { userId: user.id, amount: netProfit, gameName }).catch(() => {});
        }
      } else if (!won && bet > 0) {
        publicLogService.logCoinLoss(interaction.client, { userId: user.id, amount: bet, gameName }).catch(() => {});
      }
    }

  } catch (error) {
    console.error("[discordLogger] Error al enviar el log del resultado del juego a Discord:", error);
  }
}

module.exports = { logGameOutcome };
