const { EmbedBuilder } = require('discord.js');
const assets = require('../../assets.json');
const { Events } = require('discord.js');

const rewardAmount = 5000; // Créditos por mensaje diario
const rewardChannelId = '1240392315307032597'; // Reemplaza con el ID del canal específico

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    if (message.channel.id !== rewardChannelId) return;

    const connection = message.client.dbConnection; // Conexión a la base de datos
    const userId = message.author.id;

    // Obtener la fecha actual en formato YYYY-MM-DD
    const today = new Date();
    const currentDay = today.toISOString().split('T')[0];

    try {
      // Verificar si el usuario ya existe en la base de datos
      const [rows] = await connection.query(
        'SELECT DATE_FORMAT(last_reward_day, "%Y-%m-%d") AS last_reward_day, balance FROM currency_users WHERE user_id = ?',
        [userId]
      );

      let balance;

      if (rows.length > 0) {
        const lastRewardDay = rows[0].last_reward_day;

        // Si la última recompensa es igual al día actual, salir sin hacer nada
        if (lastRewardDay && lastRewardDay === currentDay) {
          return;
        }

        // Si es un nuevo día, actualizar el balance y la fecha
        balance = rows[0].balance + rewardAmount;
        await connection.query(
          'UPDATE currency_users SET last_reward_day = ?, balance = ? WHERE user_id = ?',
          [currentDay, balance, userId]
        );
      } else {
        // Si el usuario no existe, insertarlo con la recompensa inicial
        balance = rewardAmount;
        await connection.query(
          'INSERT INTO currency_users (user_id, last_reward_day, balance) VALUES (?, ?, ?)',
          [userId, currentDay, balance]
        );
      }

      // Enviar mensaje de recompensa
      const embed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(`¡Primer mensaje del día! 🔸**+${rewardAmount}** créditos 🎉`);

      await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    } catch (error) {
      console.error('Error al otorgar la recompensa diaria:', error);

      return message.reply({ content: 'Hubo un error al procesar tu recompensa diaria. Por favor, intenta más tarde.', });
    }
  },
};
