const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vender")
    .setDescription("Vende un ítem de tu inventario.")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("El nombre del ítem que deseas vender.")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("La cantidad de ítems que deseas vender.")
        .setRequired(true)
        .setMinValue(1)
    ),

  async autocomplete(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    try {
      // Obtener los primeros 10 ítems del inventario del usuario (por item_id)
      const [rows] = await connection.query(
        "SELECT item_id FROM currency_user_inventory WHERE user_id = ? LIMIT 10",
        [userId]
      );

      // Si no hay ítems en el inventario, devolver un array vacío
      if (rows.length === 0) {
        return interaction.respond([]);
      }

      // Mapear los item_ids a una lista de ids
      const itemIds = rows.map((row) => row.item_id);

      // Obtener los ítems en currency_items que corresponden a esos item_ids
      const [items] = await connection.query(
        "SELECT name, item_id FROM currency_items WHERE item_id IN (?)",
        [itemIds]
      );

      // Si no se encontraron ítems con esos item_ids, devolver un array vacío
      if (items.length === 0) {
        return interaction.respond([]);
      }

      // Mapear los resultados a un formato adecuado para el autocompletado
      const choices = items.map((item) => ({
        name: item.name,
        value: item.name,
      }));

      // Responder con las opciones de autocompletado
      await interaction.respond(choices);
    } catch (error) {
      console.error(
        "Error al cargar las opciones de autocomplete para /vender:",
        error
      );
    }
  },

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const itemName = interaction.options.getString("item");
    const quantityToSell = interaction.options.getInteger("cantidad");
    const author = {
      name: interaction.user.displayName,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    };

    try {
      // Obtener el ítem de la tabla currency_items para obtener el ID
      const [storeItem] = await connection.query(
        "SELECT * FROM currency_items WHERE name = ?",
        [itemName]
      );

      if (storeItem.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} No se encontró el ítem "${itemName}".`
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const item = storeItem[0];

      // Obtener el ítem del inventario del usuario
      const [userItems] = await connection.query(
        "SELECT * FROM currency_user_inventory WHERE user_id = ?",
        [userId, item.item_id]
      );

      if (userItems.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} No tienes el ítem "${itemName}" en tu inventario.`
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const userItem = userItems[0];

      // Verificar si el usuario tiene suficiente cantidad del ítem
      if (userItem.quantity < quantityToSell) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} No tienes suficiente cantidad de "${itemName}" para vender.`
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // El valor de venta será el valor registrado en currency_items
      const salePrice = item.value * quantityToSell;

      // Actualizar la cantidad de ítems en el inventario
      const newQuantity = userItem.quantity - quantityToSell;
      await connection.query(
        "UPDATE currency_user_inventory SET quantity = ? WHERE user_id = ? AND item_id = ?",
        [newQuantity, userId, userItem.item_id]
      );

      // Si la cantidad llega a 0, eliminar el ítem del inventario
      if (newQuantity === 0) {
        await connection.query(
          "DELETE FROM currency_user_inventory WHERE user_id = ? AND item_id = ?",
          [userId, userItem.item_id]
        );
      }

      // Aumentar los créditos del usuario
      await connection.query(
        "UPDATE currency_users SET balance = balance + ? WHERE user_id = ?",
        [salePrice, userId]
      );

      // Responder al usuario
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setAuthor(author)
            .setColor(assets.color.green)
            .setDescription(
              `${assets.emoji.check} Has vendido **${quantityToSell} x ${itemName}** por **🔸${salePrice}** créditos.`
            ),
        ],
      });
    } catch (error) {
      console.error("Error al procesar el comando vender:", error);
      return interaction.reply({
        content:
          "Hubo un problema al procesar tu venta. Por favor, intenta de nuevo más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
