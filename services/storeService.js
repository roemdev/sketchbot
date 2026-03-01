const { sendCommand } = require("./minecraftService");
const db = require("./dbService");
const { isValidMinecraftNick } = require("../utils/validation");

// ---------------------------------------------------------------------
//  GET ITEM BY NAME (exacto o aproximado)
// ---------------------------------------------------------------------
async function getItemByName(name) {
  // En SQLite recibimos directamente el array de filas
  const rows = await db.query(
    `
    SELECT * FROM store
    WHERE name LIKE ? AND status = 'available'
    ORDER BY id
    LIMIT 1
    `,
    [`%${name}%`]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------
//  GET ITEM BY ID
// ---------------------------------------------------------------------
async function getItem(itemId) {
  const rows = await db.query(
    "SELECT * FROM store WHERE id = ? AND status = 'available'",
    [itemId]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------
//  GET ALL ITEMS
// ---------------------------------------------------------------------
async function getItems(status = "available") {
  const rows = await db.query(
    "SELECT * FROM store WHERE status = ?",
    [status]
  );
  return rows;
}

// ---------------------------------------------------------------------
//  BUY ITEM
// ---------------------------------------------------------------------
async function buyItem(discordId, itemIdOrItem, mcNick = null) {
  // 1. Obtener usuario
  const users = await db.query(
    "SELECT * FROM user_stats WHERE discord_id = ?",
    [discordId]
  );
  if (!users.length) throw new Error("Usuario no encontrado");
  const user = users[0];

  // 2. Obtener item
  let item;
  if (typeof itemIdOrItem === 'object' && itemIdOrItem !== null) {
    item = itemIdOrItem;
    if (item.status !== 'available') throw new Error("Item no disponible");
  } else {
    const items = await db.query(
      "SELECT * FROM store WHERE id = ? AND status = 'available'",
      [itemIdOrItem]
    );
    if (!items.length) throw new Error("Item no disponible");
    item = items[0];
  }

  // 3. Verificar saldo
  const totalPrice = item.price; // * quantity;
  if (user.balance < totalPrice)
    throw new Error("No tienes suficientes créditos");

  // 4. Descontar saldo (Usamos execute para UPDATE)
  await db.execute(
    "UPDATE user_stats SET balance = balance - ? WHERE discord_id = ?",
    [totalPrice, discordId]
  );
  user.balance -= totalPrice;

  // 5. Entregar item en Minecraft si aplica
  if (item.minecraft_item && mcNick) {
    if (!isValidMinecraftNick(mcNick)) {
      throw new Error("El nickname de Minecraft proporcionado no es válido.");
    }
    const command = `give ${mcNick} ${item.minecraft_item}`;
    await sendCommand(command);
  }

  return { user, item, totalPrice };
}

// ---------------------------------------------------------------------

module.exports = {
  getItem,
  getItems,
  buyItem,
  getItemByName
};