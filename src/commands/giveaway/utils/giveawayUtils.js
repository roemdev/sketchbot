async function endGiveaway(giveawayId, client) {
  try {
    const connection = client.dbConnection;

    const [giveaway] = await connection.query(
      `SELECT winners_count, channel_id, message_id FROM giveaways WHERE id = ?`,
      [giveawayId]
    );

    if (giveaway.length === 0) return;
    const { winners_count, channel_id, message_id } = giveaway[0];

    const [entries] = await connection.query(
      `SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?`,
      [giveawayId]
    );

    if (entries.length === 0) {
      console.log("No hay participantes en el sorteo.");
      return;
    }

    let participants = entries.map(entry => entry.user_id);

    // Mezclar la lista de participantes
    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }

    shuffleArray(participants);

    // Elegimos ganadores sin repetir
    const winners = new Set();
    for (let i = 0; i < participants.length && winners.size < winners_count; i++) {
      winners.add(participants[i]);
    }

    const winnersArray = Array.from(winners);

    if (winnersArray.length < winners_count) {
      console.log(`⚠️ No se encontraron suficientes ganadores únicos.`);
    }

    await connection.query(`UPDATE giveaways SET status = 'ended' WHERE id = ?`, [giveawayId]);

    const channel = await client.channels.fetch(channel_id);
    const message = await channel.messages.fetch(message_id);

    const winnersMention = winnersArray.map(winner => `<@${winner}>`).join(", ");
    await message.reply(`🎉 ¡El sorteo ha terminado! Ganadores: ${winnersMention}`);

  } catch (error) {
    console.error("Error al finalizar el sorteo:", error);
  }
}
