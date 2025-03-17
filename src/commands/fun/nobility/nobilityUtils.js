const { updateUserBalance, getUserBalance } = require('../economy/utils/userBalanceUtils')

async function addDonate(connection, userId, amount) {
  try {

    const balance = await getUserBalance(connection, userId)
    if (balance <= 0) { return false }

    await connection.execute('INSERT INTO noble_donations (user_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = amount + VALUES(amount)', [userId, amount]);
    await updateUserBalance(connection, userId, -amount);
  } catch (error) {
    console.error(`Error en addDonate para el usuario ${userId}: `, error);
    throw error;
  }
}

async function getDonation(connection, userId) {
  try {
    const [rows] = await connection.execute('SELECT user_id, amount FROM noble_donations WHERE user_id = ?', [userId]);
    return rows.length ? rows[0].amount : 0
  } catch (error) {
    console.error(`Error en getDonation para el usuario ${userId}: `, error);
    throw error;
  }
}

async function getDonators(connection) {
  try {
    const [rows] = await connection.execute('SELECT user_id, amount FROM noble_donations ORDER BY amount DESC LIMIT 6');
    return rows; // Retorna los resultados
  } catch (error) {
    console.error(`Error en getDonators: `, error);
    return []; // Retorna un array vacío en caso de error
  }
}

module.exports = { addDonate, getDonation, getDonators }