const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trabajar')
    .setDescription('Este comando te permite trabajar y ganar créditos.'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const cooldownDuration = 14400000; // 4 horas
    const currentTime = Date.now();

    try {
      // Verificar si el usuario tiene un cooldown activo para el comando "trabajar"
      const [cooldownRows] = await connection.query(
        'SELECT cooldown_end_time FROM currency_users_cooldowns WHERE user_id = ? AND command_name = ?',
        [userId, 'trabajar']
      );

      if (cooldownRows.length > 0) {
        const cooldownEndTime = new Date(cooldownRows[0].cooldown_end_time).getTime();

        // Si el cooldown no ha terminado, mostrar mensaje con el tiempo restante
        if (currentTime < cooldownEndTime) {
          const nextWorkTime = Math.floor(cooldownEndTime / 1000);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setDescription(`${assets.emoji.deny} Todavía no puedes trabajar. Podrás intentarlo de nuevo: <t:${nextWorkTime}:R>.`)
            ],
            flags: MessageFlags.Ephemeral
          });
        }
      }

      // Verificar si el usuario existe en currency_users
      const [userRows] = await connection.query(
        'SELECT * FROM currency_users WHERE user_id = ?',
        [userId]
      );

      if (userRows.length === 0) {
        // Si no existe, crearlo
        await connection.query(
          'INSERT INTO currency_users (user_id) VALUES (?)',
          [userId]
        );
      }

      // Aquí agregamos la lógica para realizar la "tarea de trabajo" y calcular la recompensa (por ejemplo, créditos)
      const reward = Math.floor(Math.random() * (100 - 50 + 1)) + 50; // Recompensa aleatoria entre 50 y 100 créditos

      // Actualizar el balance del usuario con la recompensa
      const [updateBalanceResult] = await connection.query(
        'UPDATE currency_users SET balance = balance + ? WHERE user_id = ?',
        [reward, userId]
      );

      if (updateBalanceResult.affectedRows === 0) {
        throw new Error('No se pudo actualizar el balance del usuario.');
      }

      // Actualizar o insertar el cooldown para el comando "trabajar"
      const cooldownEndTime = new Date(currentTime + cooldownDuration);
      const [cooldownUpdateResult] = await connection.query(
        'INSERT INTO currency_users_cooldowns (user_id, command_name, cooldown_end_time) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE cooldown_end_time = ?',
        [userId, 'trabajar', cooldownEndTime, cooldownEndTime]
      );

      if (cooldownUpdateResult.affectedRows === 0) {
        throw new Error('No se pudo actualizar el cooldown del usuario.');
      }

      // Responder al usuario con el resultado del trabajo
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setDescription(`💼 ¡Has trabajado y ganado **🔸${reward}** créditos!`)
        ]
      });
    } catch (error) {
      console.error('Error al procesar el comando trabajar:', error);
      return interaction.reply({
        content: 'Hubo un problema. Por favor, intenta de nuevo más tarde.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
