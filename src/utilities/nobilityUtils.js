async function addDonation(connection, userId, donation) {
  connection.execute('INSERT INTO noble_donations(user_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = amount + VALUES(amount)', [userId, donation])
}

async function getDonationRank(connection, userId = null) {
  const query = userId
    ? 'SELECT user_id, amount FROM noble_donations WHERE user_id = ? ORDER BY amount DESC LIMIT 6'
    : 'SELECT user_id, amount FROM noble_donations ORDER BY amount DESC LIMIT 6';

  const [rows] = await connection.execute(query, userId ? [userId] : []);
  return rows;
}


async function getNobilityRoles(connection) {
  const [rows] = await connection.execute('SELECT id, title, emoji, role_id, `limit` FROM noble_roles')
  return rows
}

module.exports = { addDonation, getDonationRank, getNobilityRoles }