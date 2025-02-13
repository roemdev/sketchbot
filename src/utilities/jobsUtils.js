const getCooldown = async (userId, jobId, connection) => {
  const [rows] = await connection.query(
    "SELECT last_used FROM curr_cooldowns WHERE user_id = ? AND action_id = ? AND action_type = 'job';",
    [userId, jobId]
  );

  return rows.length > 0 ? new Date(rows[0].last_used).getTime() : null;
};

const setCooldown = async (userId, jobId, connection) => {
  await connection.query(
    `INSERT INTO curr_cooldowns (user_id, action_id, action_type, last_used)
     VALUES (?, ?, 'job', CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE last_used = CURRENT_TIMESTAMP;`,
    [userId, jobId]
  );
};

const getRequiredItem = async (mapa, jobId, connection) => {
  const [rows] = await connection.query(
    `SELECT ci.id AS item_id, ci.name AS item_name, ci.emoji AS item_emoji
     FROM curr_maps cm
     LEFT JOIN curr_map_requirements cmr ON cm.id = cmr.map_id
     LEFT JOIN curr_items ci ON cmr.item_id = ci.id
     WHERE cm.name = ? AND cmr.job_id = ?;`,
    [mapa, jobId]
  );

  return rows.length > 0 ? rows[0] : null;
};

const checkUserHasItem = async (userId, itemId, connection) => {
  const [rows] = await connection.query(
    "SELECT quantity FROM curr_user_inventory WHERE user_id = ? AND item_id = ?;",
    [userId, itemId]
  );

  return rows.length > 0 && rows[0].quantity > 0;
};

const removeItem = async (userId, itemId, connection) => {
  await connection.query(
    "UPDATE curr_user_inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?;",
    [userId, itemId]
  );
};

const generateRewards = async (jobId, connection) => {
  const madera = Math.floor(Math.random() * 3) + 1;
  const hojas = Math.floor(Math.random() * 3) + 1;
  const basura = Math.min(5 - (madera + hojas), Math.floor(Math.random() * 4));

  const itemIds = [1, 2, 3];
  const [itemData] = await connection.query(
    "SELECT id, name, emoji FROM curr_items WHERE id IN (?, ?, ?);",
    itemIds
  );

  const itemMap = itemData.reduce((map, item) => {
    map[item.id] = { name: item.name, emoji: item.emoji };
    return map;
  }, {});

  const rewards = [
    { item_id: 1, cantidad: madera },
    { item_id: 2, cantidad: hojas },
    ...(basura > 0 ? [{ item_id: 3, cantidad: basura }] : [])
  ];

  return { rewards, itemMap };
};

const updateUserBalance = async (userId, amount, connection) => {
  await connection.query(
    "UPDATE curr_users SET balance = balance + ? WHERE id = ?;",
    [amount, userId]
  );
};

module.exports = {
  getCooldown,
  setCooldown,
  getRequiredItem,
  checkUserHasItem,
  removeItem,
  generateRewards,
  updateUserBalance
};
