const publicLogService = require("../services/publicLogService");

/**
 * Registra el resultado de juegos, trabajos y tareas enviando la notificación
 * exclusivamente al canal de logs público.
 */
async function logGameOutcome(interaction, gameName, bet, netProfit, won) {
  try {
    const user = interaction.user;
    if (!interaction.client || !user) return;

    if (won) {
      if (gameName === "Trabajo" || gameName === "Tarea Diaria" || gameName === "Subsidio Diario") {
        publicLogService.logWorkReward(interaction.client, { userId: user.id, amount: netProfit, sourceName: gameName }).catch(() => {});
      } else if (netProfit > 0) {
        publicLogService.logCoinWin(interaction.client, { userId: user.id, amount: netProfit, gameName }).catch(() => {});
      }
    } else if (!won && bet > 0) {
      publicLogService.logCoinLoss(interaction.client, { userId: user.id, amount: bet, gameName }).catch(() => {});
    }

  } catch (error) {
    console.error("[discordLogger] Error al procesar log público:", error);
  }
}

module.exports = { logGameOutcome };
