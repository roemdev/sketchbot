const { SlashCommandSubcommandBuilder, EmbedBuilder } = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("comprar")
    .setDescription("Compra un ítem o un rol de la tienda.")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("El nombre del ítem o rol que deseas comprar.")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de ítems que deseas comprar (por defecto 1).")
        .setMinValue(1)
        .setRequired(false)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;
    const connection = interaction.client.dbConnection;

    try {
      const [rows] = await connection.query(
        "SELECT id, name FROM curr_items WHERE type = 'shop' ORDER BY name"
      );

      const choices = rows.map((row) => ({ name: row.name, value: row.name }));
      await interaction.respond(choices);
    } catch (error) {
      console.error("Error en el autocompletado de /comprar:", error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const itemName = interaction.options.getString("item");
    const quantity = interaction.options.getInteger("cantidad") || 1; // Por defecto 1

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
          ]
        });
      }

      const item = items[0];
      const totalPrice = item.cost * quantity;
      const itemEmoji = item.emoji || "";

      const [userRows] = await connection.query(
        "SELECT balance FROM curr_users WHERE id = ?",
        [userId]
      );

      if (userRows.length === 0 || userRows[0].balance < totalPrice) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} No tienes suficientes créditos para comprar ${quantity}x "${itemName}".`
              ),
          ]
        });
      }

      await connection.query(
        "UPDATE curr_users SET balance = balance - ? WHERE id = ?",
        [totalPrice, userId]
      );

      await connection.query(
        "INSERT INTO curr_user_inventory (user_id, item_id, quantity) " +
        "VALUES (?, ?, ?) " +
        "ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)",
        [userId, item.id, quantity]
      );

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setAuthor({
              name: interaction.user.displayName,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })
            .setTitle(`${assets.emoji.check} Compra realizada`)
            .setDescription(
              `Has comprado [${quantity}] ${itemEmoji} **${item.name}** por **${totalPrice}** créditos.`
            ),
        ],
      });
    } catch (error) {
      console.error("Error al procesar la compra:", error);
      return interaction.reply({
        content: "Hubo un problema al procesar tu compra. Intenta de nuevo más tarde.",
        ephemeral: true,
      });
    }
  },
};
