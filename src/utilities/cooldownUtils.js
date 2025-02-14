const getCooldown = async (userId, command, connection) => {
  const [rows] = await connection.query(
    "SELECT last_used FROM curr_cooldowns WHERE user_id = ? AND command = ?;",
    [userId, command]
  );
  return rows.length > 0 ? rows[0].last_used : null;
};

const setCooldown = async (userId, command, connection, cooldownTime) => {
  await connection.query(
    `INSERT INTO curr_cooldowns (user_id, command, last_used) 
     VALUES (?, ?, ?) 
     ON DUPLICATE KEY UPDATE last_used = ?;`,
    [userId, command, new Date(), new Date()]
  );
};

const isOnCooldown = async (userId, command, connection, cooldownDuration) => {
  const lastUsed = await getCooldown(userId, command, connection);
  if (!lastUsed) return false;

  const lastUsedUTC = new Date(lastUsed).getTime() - new Date().getTimezoneOffset() * 60000;
  const currentTimeUTC = Date.now();
  const elapsedTime = currentTimeUTC - lastUsedUTC;

  return elapsedTime < cooldownDuration ? cooldownDuration - elapsedTime : false;
};

module.exports = { getCooldown, setCooldown, isOnCooldown };