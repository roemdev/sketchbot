async function updateUserBalance(connection, userId, amount) {
  try {
    const [userData] = await connection.execute('SELECT balance FROM currency_users WHERE user_id = ?', [userId]);

    let newBalance;

    if (userData.length === 0) {
      newBalance = amount < 0 ? 0 : amount;
      await connection.execute('INSERT INTO currency_users (user_id, balance) VALUES (?, ?)', [userId, newBalance]);
    } else {
      newBalance = userData[0].balance + amount;
      if (newBalance < 0) newBalance = 0;

      await connection.execute('UPDATE currency_users SET balance = ? WHERE user_id = ?', [newBalance, userId]);
    }

    return newBalance;
  } catch (error) {
    console.error(`Error al modificar el balance del usuario ${userId}:`, error);
    throw error;
  }
}

module.exports = { updateUserBalance };