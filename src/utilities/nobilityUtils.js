async function addDonation(connection, userId, donation) {
  if (isNaN(donation) || donation <= 0) {
    throw new Error("La donación debe ser un número positivo.");
  }

  await connection.execute(
    'INSERT INTO noble_donations(user_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
    [userId, donation, donation]
  );
}

async function getDonationRank(connection, userId = null) {
  let query;
  let params = [];

  if (userId) {
    query = 'SELECT amount FROM noble_donations WHERE user_id = ?';
    params = [userId];
  } else {
    query = 'SELECT user_id, amount FROM noble_donations ORDER BY amount DESC LIMIT 6';
  }

  const [rows] = await connection.execute(query, params);
  return rows;
}

async function getNobilityRoles(connection) {
  const [rows] = await connection.execute('SELECT id, title, emoji, role_id, `limit` FROM noble_roles');
  return rows;
}

module.exports = { addDonation, getDonationRank, getNobilityRoles };
