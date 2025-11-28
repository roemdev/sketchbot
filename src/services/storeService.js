const { sendCommand } = require("./minecraftService");
const pool = require("./dbService");

// ---------- HANDLERS POR TIPO ----------
const typeHandlers = {
  minecraft: async (user, item, quantity, mcNick) => {
    const minecraftItem = item.minecraft_item;
    const command = `give ${mcNick} ${minecraftItem} ${quantity}`;
    await sendCommand(command);
  },


  // Puedes agregar más tipos aquí
};

// ---------- OBTENER UN ITEM ----------
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

// ---------- OBTENER TODOS LOS ITEMS ----------
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

// ---------- COMPRA DE ITEM NORMAL ----------
async function buyItem(discordId, itemId, quantity = 1) {
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

    const totalPrice = item.price * quantity;
    if (user.balance < totalPrice) throw new Error("No tienes suficientes créditos");

    await conn.query(
      "UPDATE user_stats SET balance = balance - ? WHERE discord_id = ?",
      [totalPrice, discordId]
    );
    user.balance -= totalPrice;

    // Ejecutar handler si no es minecraft
    if (item.type !== "minecraft") {
      const handler = typeHandlers[item.type];
      if (handler) await handler(user, item, quantity);
    }

    return { user, item, totalPrice };
  } finally {
    conn.release();
  }
}

// ---------- COMPRA DE ITEM CON NICK DE MINECRAFT ----------
async function buyItemWithMCNick(discordId, itemId, quantity = 1, mcNick) {
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

    const totalPrice = item.price * quantity;
    if (user.balance < totalPrice) throw new Error("No tienes suficientes créditos");

    await conn.query(
      "UPDATE user_stats SET balance = balance - ? WHERE discord_id = ?",
      [totalPrice, discordId]
    );
    user.balance -= totalPrice;

    // Ejecutar handler según tipo
    const handler = typeHandlers[item.type];
    if (handler) {
      await handler(user, item, quantity, mcNick);
    }

    return { user, item, totalPrice };
  } finally {
    conn.release();
  }
}

module.exports = {
  getItem,
  getItems,
  buyItem,
  buyItemWithMCNick,
  typeHandlers
};
