const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');

const userCooldown = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rezar')
    .setDescription('Este comando te permite rezar y ganar créditos.'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const cooldownDuration = 14400000; // 1 minuto
    const currentTime = Date.now();

    // Verificar cooldown
    const lastPrayTime = userCooldown.get(userId);
    if (lastPrayTime && currentTime - lastPrayTime < cooldownDuration) {
      const nextPrayTime = Math.floor((lastPrayTime + cooldownDuration) / 1000);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setDescription(`${assets.emoji.deny} Todavía no puedes rezar. Podrás intentarlo de nuevo: <t:${nextPrayTime}:R>.`)
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      // Realizar la consulta para obtener la tarea de tipo "pray"
      const [taskRows] = await connection.query(`SELECT * FROM currency_tasks WHERE type = "pray" LIMIT 1`);

      // Verificar si se encontró la tarea
      if (taskRows.length === 0) {
        throw new Error('No se encontró una tarea válida.');
      }

      const task = taskRows[0];
      const earnings = Math.floor(Math.random() * (task.value_max - task.value_min + 1)) + task.value_min; // Calcular la ganancia entre min y max
      const description = task.description;

      // Actualizar el balance en la base de datos
      const [rows] = await connection.query('SELECT balance FROM currency_users WHERE user_id = ?', [userId]);

      if (rows.length > 0) {
        // Si el usuario ya existe, actualizar su balance
        const newBalance = rows[0].balance + earnings;
        const [updateResult] = await connection.query('UPDATE currency_users SET balance = ? WHERE user_id = ?', [newBalance, userId]);

        if (updateResult.affectedRows === 0) {
          throw new Error('No se pudo actualizar el balance del usuario.');
        }
      } else {
        // Si el usuario no existe, insertarlo con el balance inicial
        const [insertResult] = await connection.query('INSERT INTO currency_users (user_id, balance) VALUES (?, ?)', [userId, earnings]);
        if (insertResult.affectedRows === 0) {
          throw new Error('No se pudo insertar el usuario en la base de datos.');
        }
      }

      // Actualizar cooldown
      userCooldown.set(userId, currentTime);

      // Responder al usuario con el balance obtenido
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setDescription(`🙏 ¡Rezaste tan fuerte que alguien te escuchó! has ganado **🔸${earnings.toLocaleString()}** créditos!`)
        ]
      });
    } catch (error) {
      console.error('Error al procesar el comando rezar:', error);
      return interaction.reply({
        content: 'Hubo un problema. Por favor, intenta de nuevo más tarde.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
