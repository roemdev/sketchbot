async function updateUserBalance(connection, userId, amount) {
  try {
    const [userData] = await connection.execute('SELECT balance FROM currency_users WHERE user_id = ?', [userId]);

    if (userData.length === 0) {
      throw new Error('El usuario no tiene una cuenta de economía activa.');
    }

    let newBalance = userData[0].balance + amount;
    if (newBalance < 0) newBalance = 0;

    await connection.execute('UPDATE currency_users SET balance = ? WHERE user_id = ?', [newBalance, userId]);

    return newBalance;
  } catch (error) {
    console.error(`Error al modificar el balance del usuario ${userId}:`, error);
    throw error;
  }
}

module.exports = { updateUserBalance };
