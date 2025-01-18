const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');

const userCooldown = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trabajar')
    .setDescription('¡Trabaja y gana dinero haciendo tareas diversas! 💼'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    // Verificar cooldown
    const lastWorkTime = userCooldown.get(userId);
    const currentTime = Date.now();
    const cooldownDuration = 60000; // 1 minuto

    if (lastWorkTime && currentTime - lastWorkTime < cooldownDuration) {
      const nextWorkTime = Math.floor((lastWorkTime + cooldownDuration) / 1000);
      const embed = new EmbedBuilder()
        .setColor(assets.color.red)
        .setDescription(`${assets.emoji.deny} Todavía no puedes volver a trabajar. Podrás intentarlo de nuevo en: <t:${nextWorkTime}:R>.`);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Consultar las probabilidades y tareas desde la base de datos
    let probabilities = {};
    let randomTask;

    try {
      // Consultar las probabilidades
      const [probabilityRows] = await connection.query('SELECT rarity, probability FROM task_probabilities');
      probabilities = probabilityRows.reduce((acc, row) => {
        acc[row.rarity] = row.probability;
        return acc;
      }, {});

      // Consultar una tarea aleatoria desde la base de datos
      const [taskRows] = await connection.query(`
        SELECT * FROM currency_tasks
        WHERE type = "work"
        ORDER BY RAND()
        LIMIT 1;
      `);
      randomTask = taskRows[0];
    } catch (error) {
      console.error('Error al obtener las tareas de la base de datos:', error);
      return interaction.reply({ content: 'Hubo un problema al obtener las tareas. Por favor, inténtalo de nuevo más tarde.', flags: MessageFlags.Ephemeral });
    }

    // Verificar que randomTask tiene value_min y value_max
    if (!randomTask || randomTask.value_min === undefined || randomTask.value_max === undefined) {
      return interaction.reply({
        content: 'Hubo un error al seleccionar una tarea válida. Por favor, intenta de nuevo.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const earnings = Math.floor(Math.random() * (randomTask.value_max - randomTask.value_min + 1)) + randomTask.value_min;

    // Actualizar balance en la base de datos
    try {
      const [rows] = await connection.query('SELECT balance FROM currency WHERE user_id = ?', [userId]);

      if (rows.length > 0) {
        // Si el usuario ya existe, actualizar su balance
        const newBalance = rows[0].balance + earnings;
        const [updateResult] = await connection.query('UPDATE currency SET balance = ? WHERE user_id = ?', [newBalance, userId]);
        
        if (updateResult.affectedRows === 0) {
          throw new Error('No se pudo actualizar el balance del usuario.');
        }
      } else {
        // Si el usuario no existe, insertarlo con el balance inicial
        const [insertResult] = await connection.query('INSERT INTO currency (user_id, balance) VALUES (?, ?)', [userId, earnings]);
        if (insertResult.affectedRows === 0) {
          throw new Error('No se pudo insertar el usuario en la base de datos.');
        }
      }
    } catch (error) {
      console.error('Error al actualizar el balance en la base de datos:', error);
      return interaction.reply({ content: 'Hubo un problema al actualizar tu balance. Por favor, inténtalo de nuevo más tarde.', flags: MessageFlags.Ephemeral });
    }

    // Actualizar cooldown
    userCooldown.set(userId, currentTime);

    // Mensaje
    const embed = new EmbedBuilder()
      .setColor(earnings > 0 ? assets.color.green : assets.color.red)
      .setDescription(`💼 ${randomTask.description}. 🔸**+${earnings.toLocaleString()}** créditos`);

    await interaction.reply({ embeds: [embed] });
  },
};
