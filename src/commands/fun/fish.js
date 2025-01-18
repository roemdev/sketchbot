const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');

const userCooldown = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pescar')
    .setDescription('¡Lanza tu caña y ve qué puedes pescar! 🎣'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    // Verificar cooldown
    const lastFishTime = userCooldown.get(userId);
    const currentTime = Date.now();
    const cooldownDuration = 60000; // 1 minuto

    if (lastFishTime && currentTime - lastFishTime < cooldownDuration) {
      const nextFishTime = Math.floor((lastFishTime + cooldownDuration) / 1000);
      const embed = new EmbedBuilder()
        .setColor(assets.color.red)
        .setDescription(`${assets.emoji.deny} Todavía no puedes volver a pescar. Podrás intentarlo en: <t:${nextFishTime}:R>.`);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // Obtener las probabilidades de la base de datos
    let probabilities;
    try {
      const [probRows] = await connection.query('SELECT * FROM task_probabilities WHERE rarity IN ("common", "rare", "epic", "funny")');
      probabilities = probRows.reduce((acc, row) => {
        acc[row.rarity] = row.probability;
        return acc;
      }, {});
    } catch (error) {
      console.error('Error al obtener las probabilidades:', error);
      return interaction.reply({ content: 'Hubo un error al obtener las probabilidades para pescar.', flags: MessageFlags.Ephemeral });
    }

    // Obtener una fila aleatoria de la tabla currency_tasks
    let randomTask;
    try {
      const [taskRows] = await connection.query(`
        SELECT * FROM currency_tasks
        WHERE type = "fish"
        ORDER BY RAND()
        LIMIT 1;
      `);
      randomTask = taskRows[0];
    } catch (error) {
      console.error('Error al obtener una tarea aleatoria de pesca:', error);
      return interaction.reply({ content: 'Hubo un error al obtener una tarea aleatoria de pesca.', flags: MessageFlags.Ephemeral });
    }

    // Verificar que randomTask tiene value_min y value_max
    if (!randomTask || randomTask.value_min === undefined || randomTask.value_max === undefined) {
      return interaction.reply({
        content: 'Hubo un error al seleccionar una tarea válida para pescar. Por favor, intenta de nuevo.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const earnings = Math.floor(Math.random() * (randomTask.value_max - randomTask.value_min + 1)) + randomTask.value_min;

    // Actualizar balance en la base de datos
    try {
      const [rows] = await connection.query('SELECT balance FROM currency WHERE user_id = ?', [userId]);
      let balance;

      if (rows.length > 0) {
        // Si el usuario existe, actualizamos su balance
        balance = rows[0].balance + earnings;
        await connection.query('UPDATE currency SET balance = ? WHERE user_id = ?', [balance, userId]);
      } else {
        // Si el usuario no existe, insertamos un nuevo registro
        balance = earnings;
        await connection.query('INSERT INTO currency (user_id, balance) VALUES (?, ?)', [userId, balance]);
      }
    } catch (error) {
      console.error('Error al actualizar el balance en la base de datos:', error);
      return interaction.reply({ content: 'Error al actualizar tu balance en la base de datos.', flags: MessageFlags.Ephemeral });
    }

    // Actualizar cooldown
    userCooldown.set(userId, currentTime);

    // Mensaje
    const embed = new EmbedBuilder()
      .setColor(earnings > 0 ? assets.color.green : assets.color.red)
      .setDescription(`🎣 ${randomTask.description}. 🔸**+${earnings.toLocaleString()}** créditos`);

    await interaction.reply({ embeds: [embed] });
  },
};
