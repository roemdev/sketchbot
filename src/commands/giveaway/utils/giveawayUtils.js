const { EmbedBuilder } = require("discord.js");

async function endGiveaway(giveawayId, client) {
  try {
    const connection = client.dbConnection;

    // Obtener información del sorteo
    const [giveaway] = await connection.query(
      `SELECT winners_count, channel_id, message_id FROM giveaways WHERE id = ?`,
      [giveawayId]
    );

    if (giveaway.length === 0) return;
    const { winners_count, channel_id, message_id } = giveaway[0];

    // Obtener las entradas del sorteo
    const [entries] = await connection.query(
      `SELECT user_id, is_vip FROM giveaway_entries WHERE giveaway_id = ?`,
      [giveawayId]
    );

    // Crear una lista ponderada de entradas
    let weightedEntries = [];
    entries.forEach(entry => {
      // Si el usuario es VIP, añadimos su entrada dos veces para aumentar su probabilidad
      weightedEntries.push(entry.user_id);
      if (entry.is_vip) {
        weightedEntries.push(entry.user_id); // Duplicamos su entrada
      }
    });

    // Seleccionar ganadores únicos
    const winners = [];
    while (winners.length < winners_count && weightedEntries.length > 0) {
      // Seleccionar un ganador aleatorio de la lista ponderada
      const randomIndex = Math.floor(Math.random() * weightedEntries.length);
      const winner = weightedEntries[randomIndex];

      // Si el ganador ya fue seleccionado, lo ignoramos
      if (!winners.includes(winner)) {
        winners.push(winner);

        // Eliminar todas las entradas de este usuario para evitar que sea seleccionado nuevamente
        weightedEntries = weightedEntries.filter(userId => userId !== winner);
      }
    }

    // Actualizar el estado del sorteo en la base de datos
    await connection.query(
      `UPDATE giveaways SET status = 'ended' WHERE id = ?`,
      [giveawayId]
    );

    // Obtener el canal y mensaje del sorteo
    const channel = await client.channels.fetch(channel_id);
    const message = await channel.messages.fetch(message_id);

    // Anunciar los ganadores
    const winnersMention = winners.map((winner) => `<@${winner}>`).join(", ");
    await message.reply(`🎉 ¡El sorteo ha terminado! Ganadores: ${winnersMention}`);
  } catch (error) {
    console.error("Error al finalizar el sorteo:", error);
  }
}

module.exports = { endGiveaway };
