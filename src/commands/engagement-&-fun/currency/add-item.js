const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setName("add-item")
    .setDescription("Otorga un ítem a un usuario.")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("El usuario al que deseas dar el ítem.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("El nombre del ítem que deseas dar.")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de ítems que deseas dar.")
        .setMinValue(1)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;
    const connection = interaction.client.dbConnection;

    try {
      const [rows] = await connection.query(
        "SELECT id, name FROM curr_items"
      );

      const choices = rows.map((row) => ({ name: row.name, value: row.name }));
      await interaction.respond(choices);
    } catch (error) {
      console.error("Error en el autocompletado de /dar:", error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.options.getUser("usuario").id;
    const itemName = interaction.options.getString("item");
    const quantity = interaction.options.getInteger("cantidad");

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

      // Actualizar inventario del usuario
      await connection.query(
        "INSERT INTO curr_user_inventory (user_id, item_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?",
        [userId, item.id, quantity, quantity]
      );

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setAuthor({
              name: interaction.user.displayName,
              iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
            })
            .setTitle(`${assets.emoji.check} Ítem otorgado`)
            .setDescription(
              `> **[ ${quantity} ]** ${item.emoji || "❓"} ${item.name} - <@${userId}>.`
            ),
        ],
      });
    } catch (error) {
      console.error("Error al otorgar el ítem:", error);
      return interaction.reply({
        content: "Hubo un problema al otorgar el ítem. Intenta de nuevo más tarde.",
        ephemeral: true,
      });
    }
  },
};
