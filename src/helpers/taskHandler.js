const { EmbedBuilder, MessageFlags } = require("discord.js");
const assets = require("../../assets.json")

const taskHandler = async (interaction, taskName) => {
  const connection = interaction.client.dbConnection;
  const userId = interaction.user.id;
  const currentTime = Date.now();

  try {
    // Obtener la configuración de la tarea desde la base de datos
    const [taskConfigRows] = await connection.query(
      "SELECT * FROM currency_tasks_config WHERE task_type = ?",
      [taskName]
    );

    if (taskConfigRows.length === 0) {
      throw new Error(`No se encontró la configuración para la tarea: ${taskName}`);
    }

    const taskConfig = taskConfigRows[0];
    const cooldownDuration = taskConfig.cooldown;

    // Verificar el último uso de la tarea
    const [cooldownRows] = await connection.query(
      `SELECT ${taskConfig.task_type} FROM currency_users_cooldowns WHERE user_id = ?`,
      [userId]
    );

    if (cooldownRows.length > 0) {
      const lastTaskTime = new Date(cooldownRows[0][taskConfig.task_type]).getTime();
      if (currentTime < lastTaskTime + cooldownDuration) {
        const nextTaskTime = Math.floor(
          (lastTaskTime + cooldownDuration) / 1000
        );
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} Todavía no puedes usar este comando. Podrás intentarlo de nuevo: <t:${nextTaskTime}:R>.`
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // Calcular recompensa
    const reward =
      Math.floor(
        Math.random() * (taskConfig.reward_max - taskConfig.reward_min + 1)
      ) + taskConfig.reward_min;

    // Actualizar cooldown en la base de datos
    await connection.query(
      `INSERT INTO currency_users_cooldowns (user_id, ${taskConfig.task_type}) VALUES (?, ?) ON DUPLICATE KEY UPDATE ${taskConfig.task_type} = VALUES(${taskConfig.task_type})`,
      [userId, new Date(currentTime)]
    );

    // Actualizar balance del usuario
    const [userRows] = await connection.query(
      "SELECT balance FROM currency_users WHERE user_id = ?",
      [userId]
    );

    if (userRows.length > 0) {
      const newBalance = userRows[0].balance + reward;
      await connection.query(
        "UPDATE currency_users SET balance = ? WHERE user_id = ?",
        [newBalance, userId]
      );
    } else {
      await connection.query(
        "INSERT INTO currency_users (user_id, balance) VALUES (?, ?)",
        [userId, reward]
      );
    }

    // Responder al usuario
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: interaction.user.username,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setColor(assets.color.green)
          .setDescription(
            `${taskConfig.description} ¡Has ganado **🔸${reward.toLocaleString()}** créditos!`
          ),
      ],
    });
  } catch (error) {
    console.error(error);
    return interaction.reply({
      content:
        "Hubo un error procesando este comando. Por favor, inténtalo de nuevo más tarde.",
      flags: MessageFlags.Ephemeral,
    });
  }
};

module.exports = taskHandler;
