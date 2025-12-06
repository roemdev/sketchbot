const { sendCommand } = require("./minecraftService");
const pool = require("./dbService");

// ---------------------------------------------------------------------
//  GET ITEM BY NAME (exacto o aproximado)
// ---------------------------------------------------------------------
async function getItemByName(name) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `
      SELECT * FROM store
      WHERE name LIKE ? AND status = 'available'
      ORDER BY id
      LIMIT 1
      `,
      [`%${name}%`]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------------
//  GET ITEM BY ID
// ---------------------------------------------------------------------
async function getItem(itemId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT * FROM store WHERE id = ? AND status = 'available'",
      [itemId]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------------
//  GET ALL ITEMS
// ---------------------------------------------------------------------
async function getItems(status = "available") {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT * FROM store WHERE status = ?",
      [status]
    );
    return rows;
  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------------
//  BUY ITEM
// ---------------------------------------------------------------------
async function buyItem(discordId, itemId, mcNick = null) {
  const conn = await pool.getConnection();
  try {
    const [users] = await conn.query(
      "SELECT * FROM user_stats WHERE discord_id = ?",
      [discordId]
    );
    if (!users.length) throw new Error("Usuario no encontrado");
    const user = users[0];

    const [items] = await conn.query(
      "SELECT * FROM store WHERE id = ? AND status = 'available'",
      [itemId]
    );
    if (!items.length) throw new Error("Item no disponible");
    const item = items[0];

    const totalPrice = item.price // * quantity;
    if (user.balance < totalPrice)
      throw new Error("No tienes suficientes créditos");

    await conn.query(
      "UPDATE user_stats SET balance = balance - ? WHERE discord_id = ?",
      [totalPrice, discordId]
    );
    user.balance -= totalPrice;

    if (item.minecraft_item && mcNick) {
      const command = `give ${mcNick} ${item.minecraft_item}`;
      await sendCommand(command);
    }

    return { user, item, totalPrice };
  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------------

module.exports = {
  getItem,
  getItems,
  buyItem,
  getItemByName
};