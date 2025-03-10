// utils/getTragamonedasConfig.js
async function getJackpotConfig(connection) {
  try {
    const [rows] = await connection.execute('SELECT * FROM currency_jackpot_config LIMIT 1');
    if (rows.length > 0) {
      return {
        costPerSpin: rows[0].cost_per_spin,
        regularPrize: rows[0].regular_prize,
        jackpotPrize: rows[0].jackpot_prize,
      };
    } else {
      throw new Error('No se encontró la configuración de jackpot en la base de datos.');
    }
  } catch (error) {
    console.error('Error al obtener la configuración de jackpot:', error);
    throw error;
  }
}

module.exports = { getJackpotConfig };