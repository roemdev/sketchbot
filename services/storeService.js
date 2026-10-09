const db = require("./dbService");
const userService = require("./userService");
const { sendCommand } = require("./minecraftService");
const { isValidMinecraftNick } = require("../utils/validation");

async function getItem(itemId) {
  const row = db.get(`SELECT * FROM store WHERE id = ? AND status = 'available'`, itemId);
  return row ?? null;
}

async function getItems(status = "available") {
  const rows = db.query(`SELECT * FROM store WHERE status = ?`, status);
  return rows ?? [];
}

async function buyItem(discordId, itemIdOrItem, mcNick = null) {
  let item;
  if (typeof itemIdOrItem === "object" && itemIdOrItem !== null) {
    item = itemIdOrItem;
    if (item.status !== "available") throw new Error("Item no disponible");
  } else {
    item = await getItem(itemIdOrItem);
    if (!item) throw new Error("Item no disponible");
  }

  const updatedUser = db.transaction(() => {
    const user = db.get(`SELECT * FROM user_stats WHERE discord_id = ?`, discordId);
    if (!user) throw new Error("Usuario no encontrado");

    if (user.balance < item.price) throw new Error("No tienes suficientes créditos");

    db.run(`UPDATE user_stats SET balance = balance - ? WHERE discord_id = ?`, item.price, discordId);

    // Suma cero: depositar en el banco central
    db.run(
      `INSERT INTO user_stats (discord_id, username, balance) VALUES ('server_bank', 'Banco del Servidor', ?)
       ON CONFLICT(discord_id) DO UPDATE SET balance = balance + ?`,
      item.price,
      item.price
    );

    return db.get(`SELECT * FROM user_stats WHERE discord_id = ?`, discordId);
  });

  if (item.minecraft_item && mcNick) {
    if (!isValidMinecraftNick(mcNick)) throw new Error("El nickname de Minecraft proporcionado no es válido.");
    await sendCommand(`give ${mcNick} ${item.minecraft_item}`);
  }

  return { user: updatedUser, item, totalPrice: item.price };
}

async function addItem({ name, description, price, iconId, minecraftItem }) {
  db.run(
    `INSERT INTO store (name, description, price, icon_id, minecraft_item, status)
     VALUES (?, ?, ?, ?, ?, 'available')`,
    name,
    description,
    price,
    iconId,
    minecraftItem
  );
}

async function updateItem(id, { name, description, price, iconId, minecraftItem }) {
  db.run(
    `UPDATE store SET name = ?, description = ?, price = ?, icon_id = ?, minecraft_item = ?
     WHERE id = ?`,
    name,
    description,
    price,
    iconId,
    minecraftItem,
    id
  );
}

async function deleteItem(id) {
  db.run(`DELETE FROM store WHERE id = ?`, id);
}

module.exports = { getItem, getItems, buyItem, addItem, updateItem, deleteItem };