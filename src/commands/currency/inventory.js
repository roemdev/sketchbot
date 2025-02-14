const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");
const { getUserBalance } = require("../../utilities/userBalanceUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventario")
    .setDescription("Muestra los ítems en tu inventario."),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    try {
      // Obtener los ítems del usuario con su emoji y cantidad
      const [items] = await connection.query(
        `SELECT ci.id, ci.name, ci.emoji, cui.quantity 
         FROM curr_user_inventory cui
         JOIN curr_items ci ON cui.item_id = ci.id
         WHERE cui.user_id = ? AND cui.quantity > 0`,
        [userId]
      );

      // Si el usuario no tiene ítems
      if (items.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(`${assets.emoji.deny} No tienes ítems en tu inventario.`),
          ],
        });
      }

      // Construir la lista de ítems
      const itemList = items
        .map(item => `\`🆔\` \`${item.id}\` | \`${item.emoji || "❓"}\` ${item.name} | \`📦\` **${item.quantity}**`)
        .join("\n");
      const balance = await getUserBalance(connection, userId);

      // Crear el embed con la lista de ítems
      const inventoryEmbed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle("🎒 Tu Inventario")
        .setDescription(`${itemList}`)
        .setFooter({ text: `Balance: ⏣${balance.toLocaleString()} créditos` })

      // Responder con el embed
      return interaction.reply({
        embeds: [inventoryEmbed],
      });
    } catch (error) {
      console.error("Error al procesar el comando inventario:", error);
      return interaction.reply({
        content: "Hubo un problema al obtener tu inventario. Intenta de nuevo más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
