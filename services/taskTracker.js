const cooldownService = require("./cooldownService");
const userService = require("./userService");
const { logTransaction } = require("./transactionService");
const { logGameOutcome } = require("../utils/discordLogger");
const config = require("../utils/config");

const COIN = config.emojis.coin;

const minBank = config.tasks.minBankEarn || 300000;
const maxBank = config.tasks.maxBankEarn || 640000;
const percentage = config.tasks.commissionPercent || 12;
const avgWorkReward = Math.floor(((minBank + maxBank) / 2) * (percentage / 100)); // ~56,400
const dailyTaskReward = avgWorkReward * 2; // ~112,800

// Array de tareas rotativas por día
const tasks = [
  {
    id: "send_messages",
    description: "Enviar 3 mensajes en cualquier canal de texto.",
    target: 3,
    reward: dailyTaskReward,
    type: "messages"
  }
];

// Almacenamiento en memoria para el progreso de tareas aceptadas
// Map<userId, { taskId, progress, target, description, reward, type }>
const activeTasks = new Map();

function getDailyTask() {
  const day = new Date().getDate();
  const taskIndex = day % tasks.length;
  return tasks[taskIndex];
}

module.exports = {
  getDailyTask,
  
  getActiveTask(userId) {
    return activeTasks.get(userId) || null;
  },

  acceptTask(userId) {
    const todayTask = getDailyTask();
    activeTasks.set(userId, {
      taskId: todayTask.id,
      progress: 0,
      target: todayTask.target,
      description: todayTask.description,
      reward: todayTask.reward,
      type: todayTask.type
    });
    return todayTask;
  },

  async handleMessage(message) {
    const userId = message.author.id;
    const active = activeTasks.get(userId);
    if (!active) return;

    // Verificar si hoy ya la completó en la base de datos
    const completedCd = await cooldownService.checkCooldown(userId, "daily_task");
    if (completedCd) {
      activeTasks.delete(userId);
      return;
    }

    // Verificar si la tarea coincide con la de hoy
    const todayTask = getDailyTask();
    if (active.taskId !== todayTask.id) {
      activeTasks.delete(userId);
      return;
    }

    if (active.type === "messages") {
      if (active.progress < active.target) {
        active.progress += 1;
      }

      // Si se completa
      if (active.progress >= active.target) {
        // Verificar balance del banco (las recompensas se pagan desde el banco del servidor)
        const bankBalance = await userService.getBalance("server_bank");
        if (bankBalance < active.reward) {
          try {
            const errorMsg = await message.channel.send(`❌ **El Banco del Servidor está en quiebra:** No hay suficientes monedas en el banco para pagar tu recompensa por completar la tarea diaria (Faltan **${COIN}${(active.reward - bankBalance).toLocaleString("es-DO")}**). ¡Sigue realizando tareas con \`/trabajo\` para rellenar las arcas del banco!`);
            setTimeout(async () => {
              await errorMsg.delete().catch(() => {});
            }, 30000);
          } catch {}
          return;
        }

        activeTasks.delete(userId);

        // Descontar del banco y añadir al usuario
        await userService.addBalance("server_bank", -active.reward, false);
        await logTransaction({ discordId: "server_bank", type: "bank_withdrawal", amount: -active.reward, itemName: `Pago de tarea diaria a <@${userId}>` });

        await userService.addBalance(userId, active.reward, false);
        await logTransaction({ discordId: userId, type: "daily_task", amount: active.reward });

        // Cooldown hasta la medianoche local
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const secondsUntilMidnight = Math.ceil((midnight - now) / 1000);
        await cooldownService.setCooldown(userId, "daily_task", secondsUntilMidnight);

        const fakeInteraction = {
          client: message.client,
          channel: message.channel,
          user: message.author
        };
        await logGameOutcome(fakeInteraction, "Tarea Diaria", 0, active.reward, true).catch(console.error);
      }
    }
  }
};
