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
      `SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?`,
      [giveawayId]
    );

    // Seleccionar ganadores aleatorios
    const winners = entries.sort(() => Math.random() - 0.5).slice(0, winners_count);

    // Actualizar el estado del sorteo en la base de datos
    await connection.query(
      `UPDATE giveaways SET status = 'ended' WHERE id = ?`,
      [giveawayId]
    );

    // Obtener el canal y mensaje del sorteo
    const channel = await client.channels.fetch(channel_id);
    const message = await channel.messages.fetch(message_id);

    // Anunciar los ganadores
    const winnersMention = winners.map((winner) => `<@${winner.user_id}>`).join(", ");
    await message.reply(`🎉 ¡El sorteo ha terminado! Ganadores: ${winnersMention}`);
  } catch (error) {
    console.error("Error al finalizar el sorteo:", error);
  }
}

module.exports = { endGiveaway };
