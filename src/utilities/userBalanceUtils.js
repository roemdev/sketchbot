async function getUserBalance(connection, userId) {
  const [rows] = await connection.execute('SELECT balance FROM curr_users WHERE id = ?', [userId]);
  return rows.length ? rows[0].balance : 0;
}

async function updateUserBalance(connection, userId, amount) {
  try {
    const [userData] = await connection.execute('SELECT balance FROM curr_users WHERE id = ?', [userId]);

    let newBalance;

    if (userData.length === 0) {
      newBalance = amount < 0 ? 0 : amount;
      await connection.execute('INSERT INTO curr_users (id, balance) VALUES (?, ?)', [userId, newBalance]);
    } else {
      newBalance = userData[0].balance + amount;
      if (newBalance < 0) newBalance = 0;

      await connection.execute('UPDATE curr_users SET balance = ? WHERE id = ?', [newBalance, userId]);
    }

    return newBalance;
  } catch (error) {
    console.error(`Error al modificar el balance del usuario ${userId}:`, error);
    throw error;
  }
}

module.exports = { getUserBalance, updateUserBalance };