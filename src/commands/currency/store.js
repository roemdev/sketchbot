const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tienda")
    .setDescription("Muestra todos los ítems disponibles en la tienda."),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;

    try {
      // Consulta los ítems disponibles en la tienda
      const [items] = await connection.query(
        "SELECT name, description, price, stock FROM currency_store"
      );

      // Verificar si hay ítems en la tienda
      if (items.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} Actualmente no hay ítems disponibles en la tienda.`
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Crear el embed con los ítems
      const embed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle("🏪 Tienda de Arkania")
        .setFooter({ text: "Para comprar utiliza /comprar" });

      items.forEach((item) => {
        embed.addFields({
          name: `${item.name} - 🔸${item.price}`,
          value: `>>> ${item.description || "Sin descripción"}\n**Stock**: ${
            item.stock ?? "Ilimitado"
          }`,
        });
      });

      // Responder al usuario con el embed
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error al procesar el comando tienda:", error);
      return interaction.reply({
        content:
          "Hubo un problema al cargar la tienda. Por favor, intenta de nuevo más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
