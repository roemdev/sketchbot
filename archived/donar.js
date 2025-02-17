const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const assets = require("../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("donar")
    .setDescription("Dona un ítem de tu inventario a otro usuario.")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("El usuario al que deseas donar el ítem.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("El nombre del ítem que deseas donar.")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de ítems que deseas donar.")
        .setMinValue(1)
        .setRequired(true)
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
      console.error("Error en el autocompletado de /donar:", error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const donorId = interaction.user.id; // El que dona
    const recipientId = interaction.options.getUser("usuario").id; // El que recibe
    const itemName = interaction.options.getString("item");
    const quantity = interaction.options.getInteger("cantidad");

    try {
      // Obtener el ítem de la base de datos
      const [items] = await connection.query(
        "SELECT id, name, emoji FROM curr_items WHERE BINARY name = ?",
        [itemName.trim()]
      );

      if (items.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} No se encontró el ítem "${itemName}" en tu inventario.`
              ),
          ],
        });
      }

      const item = items[0];

      // Verificar inventario del donante (usuario que dona)
      const [inventory] = await connection.query(
        "SELECT quantity FROM curr_user_inventory WHERE user_id = ? AND item_id = ?",
        [donorId, item.id]
      );

      if (inventory.length === 0 || inventory[0].quantity < quantity) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} No tienes suficientes ${itemName} para donar.`
              ),
          ],
        });
      }

      // Actualizar inventario del donante (restar ítems)
      await connection.query(
        "UPDATE curr_user_inventory SET quantity = quantity - ? WHERE user_id = ? AND item_id = ?",
        [quantity, donorId, item.id]
      );

      // Actualizar inventario del receptor (sumar ítems)
      await connection.query(
        "INSERT INTO curr_user_inventory (user_id, item_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?",
        [recipientId, item.id, quantity, quantity]
      );

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setAuthor({
              name: interaction.user.displayName,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })
            .setTitle(`${assets.emoji.check} Ítem donado`)
            .setDescription(
              `> **[ ${quantity} ]** ${item.emoji || ""} ${item.name} ha sido donado a ${interaction.options.getUser("usuario").tag}.`
            ),
        ],
      });
    } catch (error) {
      console.error("Error al procesar la donación:", error);
      return interaction.reply({
        content: "Hubo un problema al procesar tu donación. Intenta de nuevo más tarde.",
        ephemeral: true,
      });
    }
  },
};
