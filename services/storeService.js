const supabase = require("./dbService");
const { sendCommand } = require("./minecraftService");
const { isValidMinecraftNick } = require("../utils/validation");

async function getItem(itemId) {
  const { data, error } = await supabase
      .from("store")
      .select("*")
      .eq("id", itemId)
      .eq("status", "available")
      .single();
  if (error) return null;
  return data;
}

async function getItems(status = "available") {
  const { data, error } = await supabase
      .from("store")
      .select("*")
      .eq("status", status);
  if (error) throw error;
  return data ?? [];
}

async function buyItem(discordId, itemIdOrItem, mcNick = null) {
  const { data: users, error: userError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("discord_id", discordId)
      .single();
  if (userError || !users) throw new Error("Usuario no encontrado");

  let item;
  if (typeof itemIdOrItem === "object" && itemIdOrItem !== null) {
    item = itemIdOrItem;
    if (item.status !== "available") throw new Error("Item no disponible");
  } else {
    item = await getItem(itemIdOrItem);
    if (!item) throw new Error("Item no disponible");
  }

  if (users.balance < item.price) throw new Error("No tienes suficientes créditos");

  const { data: success, error: rpcError } = await supabase.rpc("decrement_balance", {
    p_discord_id: discordId,
    p_amount: item.price,
  });
  if (rpcError) throw rpcError;
  if (success === false) throw new Error("No tienes suficientes créditos");

  if (item.minecraft_item && mcNick) {
    if (!isValidMinecraftNick(mcNick)) throw new Error("El nickname de Minecraft proporcionado no es válido.");
    await sendCommand(`give ${mcNick} ${item.minecraft_item}`);
  }

  return { user: users, item, totalPrice: item.price };
}

async function addItem({ name, description, price, iconId, minecraftItem }) {
  const { error } = await supabase
      .from("store")
      .insert({ name, description, price, icon_id: iconId, minecraft_item: minecraftItem, status: "available" });
  if (error) throw error;
}

async function updateItem(id, { name, description, price, iconId, minecraftItem }) {
  const { error } = await supabase
      .from("store")
      .update({ name, description, price, icon_id: iconId, minecraft_item: minecraftItem })
      .eq("id", id);
  if (error) throw error;
}

async function deleteItem(id) {
  const { error } = await supabase.from("store").delete().eq("id", id);
  if (error) throw error;
}

module.exports = { getItem, getItems, buyItem, addItem, updateItem, deleteItem };