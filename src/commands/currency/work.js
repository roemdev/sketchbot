const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trabajar")
    .setDescription("Este comando te permite trabajar y ganar créditos."),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const cooldownDuration = 600000; // 10 minutos
    const currentTime = Date.now();
    const author = {
      name: interaction.user.displayName,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    };

    try {
      // Verificar si el usuario tiene un cooldown activo en la base de datos para el comando /trabajar
      const [cooldownRows] = await connection.query(
        "SELECT work FROM currency_users_cooldowns WHERE user_id = ?",
        [userId]
      );

      if (cooldownRows.length > 0) {
        const lastWorkTime = new Date(cooldownRows[0].work).getTime();
        if (currentTime < lastWorkTime + cooldownDuration) {
          const nextWorkTime = Math.floor(
            (lastWorkTime + cooldownDuration) / 1000
          );
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setDescription(
                  `${assets.emoji.deny} Todavía no puedes trabajar. Podrás intentarlo de nuevo: <t:${nextWorkTime}:R>.`
                ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      // Verificar si el usuario existe en currency_users
      const [userRows] = await connection.query(
        "SELECT * FROM currency_users WHERE user_id = ?",
        [userId]
      );

      if (userRows.length === 0) {
        // Si no existe, crearlo
        await connection.query(
          "INSERT INTO currency_users (user_id) VALUES (?)",
          [userId]
        );
      }

      // Obtener tareas de la categoría "work"
      const [taskRows] = await connection.query(
        `SELECT * FROM currency_tasks WHERE type = "work"`
      );

      if (taskRows.length === 0) {
        throw new Error("No se encontró una tarea válida para trabajar.");
      }

      const task = taskRows[0];
      const earnings =
        Math.floor(Math.random() * (task.value_max - task.value_min + 1)) +
        task.value_min; // Calcular la ganancia entre min y max
      const description = task.description;

      // Actualizar el balance en la base de datos
      const [rows] = await connection.query(
        "SELECT balance FROM currency_users WHERE user_id = ?",
        [userId]
      );

      if (rows.length > 0) {
        // Si el usuario ya existe, actualizar su balance
        const newBalance = rows[0].balance + earnings;
        const [updateResult] = await connection.query(
          "UPDATE currency_users SET balance = ? WHERE user_id = ?",
          [newBalance, userId]
        );

        if (updateResult.affectedRows === 0) {
          throw new Error("No se pudo actualizar el balance del usuario.");
        }
      } else {
        // Si el usuario no existe, insertarlo con el balance inicial
        const [insertResult] = await connection.query(
          "INSERT INTO currency_users (user_id, balance) VALUES (?, ?)",
          [userId, earnings]
        );
        if (insertResult.affectedRows === 0) {
          throw new Error(
            "No se pudo insertar el usuario en la base de datos."
          );
        }
      }

      // Actualizar cooldown en la base de datos
      await connection.query(
        "INSERT INTO currency_users_cooldowns (user_id, work) VALUES (?, ?) ON DUPLICATE KEY UPDATE work = VALUES(work)",
        [userId, new Date(currentTime + cooldownDuration)]
      );

      // Responder al usuario con el balance obtenido
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setAuthor(author)
            .setColor(assets.color.green)
            .setDescription(
              `No tiene tiempo de jugar, de cantar, de bailar, solo sabe trabajar... 💼 Has ganado **🔸${earnings.toLocaleString()}** créditos!`
            ),
        ],
      });
    } catch (error) {
      console.error("Error al procesar el comando trabajar:", error);
      return interaction.reply({
        content: "Hubo un problema. Por favor, intenta de nuevo más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
