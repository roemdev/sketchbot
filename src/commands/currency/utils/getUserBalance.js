async function getUserBalance(connection, userId) {
  const [rows] = await connection.execute('SELECT balance FROM currency_users WHERE user_id = ?', [userId]);
  return rows.length ? rows[0].balance : 0;
}

module.exports = { getUserBalance };
