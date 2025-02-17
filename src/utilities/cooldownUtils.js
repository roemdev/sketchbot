// cooldownUtils.js
async function checkCooldown(connection, userId, actionId, actionType, cooldownDuration) {
  const currentTimeUTC = new Date();

  const [cooldowns] = await connection.query(
    'SELECT last_used FROM curr_cooldowns WHERE user_id = ? AND action_id = ? AND action_type = ?',
    [userId, actionId, actionType]
  );

  if (cooldowns.length > 0 && cooldowns[0].last_used) {
    const lastUsedUTC = new Date(cooldowns[0].last_used).getTime();
    const elapsedTime = currentTimeUTC.getTime() - lastUsedUTC;

    if (elapsedTime < cooldownDuration) {
      const remainingTime = cooldownDuration - elapsedTime;
      const timestamp = Math.floor((currentTimeUTC.getTime() + remainingTime) / 1000);
      return { onCooldown: true, remainingTime, timestamp };
    }
  }

  return { onCooldown: false, currentTimeUTC };
}

async function updateCooldown(connection, userId, actionId, actionType, currentTimeUTC) {
  const currentTimeUTCAdjusted = new Date(currentTimeUTC.getTime() - currentTimeUTC.getTimezoneOffset() * 60000).toISOString();
  const formattedTime = currentTimeUTCAdjusted.slice(0, 19).replace('T', ' ');

  await connection.query(
    'INSERT INTO curr_cooldowns (user_id, action_id, action_type, last_used) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE last_used = ?',
    [userId, actionId, actionType, formattedTime, formattedTime]
  );
}

module.exports = { checkCooldown, updateCooldown };
