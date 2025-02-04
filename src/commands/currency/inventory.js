const {
  SlashCommandSubcommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("inventario")
    .setDescription("Muestra los ítems en tu inventario junto con sus ID."),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    try {
      // Consulta unificada para obtener los ítems del usuario (droppable y de tienda)
      const [items] = await connection.query(
        "SELECT " +
        " CASE WHEN cui.item_id IS NOT NULL THEN LPAD(cui.item_id, 4, '0') ELSE NULL END AS formatted_item_id, " +
        " CASE WHEN cui.store_item_id IS NOT NULL THEN CONCAT('S', LPAD(cui.store_item_id, 3, '0')) ELSE NULL END AS formatted_store_item_id, " +
        " COALESCE(ci.name, cs.name) AS item_name, " +
        " COALESCE(ci.value, cs.price) AS item_value, " +
        " cui.quantity " +
        " FROM currency_user_inventory cui " +
        " LEFT JOIN currency_items ci ON cui.item_id = ci.item_id " +
        " LEFT JOIN currency_store cs ON cui.store_item_id = cs.store_item_id " +
        " WHERE cui.user_id = ? " +
        " AND cui.quantity > 0;",
        [userId]
      );

      // Verificar si el usuario tiene ítems
      if (items.length === 0) {
        return interaction.reply({
          content: `${assets.emoji.deny} No tienes ítems en tu inventario.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Construir la descripción del embed con los ítems y sus ID
      const itemList = items
        .map(
          (item) =>
            `\`🆔\` ${item.formatted_item_id || item.formatted_store_item_id} | ` +
            `\`📦\` **${item.quantity}** | ` +
            `\`📜\` ${item.item_name} | ` +
            `\`💰\` ⏣ ${item.item_value.toLocaleString()}`
        )
        .join("\n");

      // Crear el embed con la lista de ítems
      const inventoryEmbed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle("🎒 Inventario de economía")
        .setDescription(itemList)
      //.setFooter({ text: '🆔 id del item | 🔢 cantidad | 📦 nombre | 💰 valor' });

      // Responder con el embed
      return interaction.reply({
        embeds: [inventoryEmbed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error al procesar el comando inventario:", error);
      return interaction.reply({
        content:
          "Hubo un problema al obtener tu inventario. Por favor, intenta de nuevo más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
