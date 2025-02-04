const {
  SlashCommandSubcommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("clasificación")
    .setDescription(
      "Muestra la clasificación de los 10 miembros con más créditos."
    ),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;

    try {
      // Obtener los 10 usuarios con más balance
      const [rows] = await connection.query(
        "SELECT user_id, membership, balance FROM currency_users ORDER BY balance DESC LIMIT 10"
      );

      if (rows.length === 0) {
        return interaction.reply({
          content: "No hay datos disponibles para mostrar la clasificación.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Construir la descripción del embed
      let description = "Los **10** más ricos del servidor:\n\n";

      for (const [index, row] of rows.entries()) {
        const userId = row.user_id;
        const membership = row.membership;
        const balance = row.balance;

        // Obtener el username basado en el ID
        const user = await interaction.client.users.fetch(userId);
        const userTag = membership === "vip" ? `${user.username} ${assets.emoji.vipstar}` : user.username;

        // Concatenar la información en la descripción
        description += `${index + 1}. ${userTag} • ⏣ ${balance.toLocaleString()}\n`;
      }

      // Construir el embed con la clasificación
      const embed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle("🏦 Clasificación de Arkania")
        .setDescription(description);

      // Enviar el embed con la clasificación
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error al obtener la clasificación:", error);
      return interaction.reply({
        content:
          "Hubo un error al obtener la clasificación. Por favor, intenta más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
