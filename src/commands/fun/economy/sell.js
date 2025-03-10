const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vender")
    .setDescription("Vende un ítem de tu inventario.")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("El nombre del ítem que deseas vender.")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de ítems que deseas vender.")
        .setMinValue(1)
        .setRequired(false)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;
    const connection = interaction.client.dbConnection;

    try {
      const [rows] = await connection.query(
        "SELECT cui.item_id, ci.name " +
        "FROM curr_user_inventory cui " +
        "JOIN curr_items ci ON cui.item_id = ci.id " +
        "WHERE cui.user_id = ?;",
        [interaction.user.id]
      );

      const choices = rows.map((row) => ({ name: row.name, value: row.name }));
      await interaction.respond(choices);
    } catch (error) {
      console.error("Error en el autocompletado de /vender:", error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const itemName = interaction.options.getString("item");
    const quantity = interaction.options.getInteger("cantidad") || 1;

    try {
      const [items] = await connection.query(
        "SELECT id, name, cost, emoji FROM curr_items WHERE BINARY name = ?",
        [itemName.trim()]
      );

      if (items.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} No se encontró el ítem "${itemName}" en la tienda.`
              ),
          ],
        });
      }

      const item = items[0];
      const totalSaleValue = item.cost * quantity;
      const itemEmoji = item.emoji || "";

      const [inventory] = await connection.query(
        "SELECT quantity FROM curr_user_inventory WHERE user_id = ? AND item_id = ?",
        [userId, item.id]
      );

      if (inventory.length === 0 || inventory[0].quantity < quantity) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} No tienes suficientes ${itemName} para vender.`
              ),
          ],
        });
      }

      const remainingQuantity = inventory[0].quantity - quantity;

      if (remainingQuantity > 0) {
        await connection.query(
          "UPDATE curr_user_inventory SET quantity = ? WHERE user_id = ? AND item_id = ?",
          [remainingQuantity, userId, item.id]
        );
      } else {
        await connection.query(
          "DELETE FROM curr_user_inventory WHERE user_id = ? AND item_id = ?",
          [userId, item.id]
        );
      }

      await connection.query(
        "UPDATE curr_users SET balance = balance + ? WHERE id = ?",
        [totalSaleValue, userId]
      );

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setAuthor({
              name: interaction.user.displayName,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })
            .setTitle(`${assets.emoji.check} Venta realizada`)
            .setDescription(
              `> **[ ${quantity} ]** ${itemEmoji} ${item.name}\n` +
              `> Recibiste **⏣${totalSaleValue.toLocaleString()}** créditos por la venta.`
            ),
        ],
      });
    } catch (error) {
      console.error("Error al procesar la venta:", error);
      return interaction.reply({
        content: "Hubo un problema al procesar tu venta. Intenta de nuevo más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
