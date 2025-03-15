const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../../config/assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trivia-clasificacion")
    .setDescription("Muestra la clasificación de los 10 miembros con más puntos de trivia."),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const guild = interaction.guild;

    try {
      // Obtener los 10 usuarios con más puntos de trivia
      const [rows] = await connection.query(
        "SELECT user_id, score FROM trivia_scores ORDER BY score DESC LIMIT 10"
      );

      if (rows.length === 0) {
        return interaction.reply({
          content: "No hay datos disponibles para mostrar la clasificación.",
        });
      }

      // Obtener los nombres de los usuarios
      const description = await Promise.all(
        rows.map(async (row, index) => {
          let username = "Usuario desconocido";

          try {
            const userIdString = row.user_id.toString();
            const member = await guild.members.fetch(userIdString).catch(() => null);
            if (member) {
              username = member.user.username;
            } else {
              const user = await interaction.client.users.fetch(userIdString).catch(() => null);
              if (user) {
                username = user.username;
              }
            }
          } catch (error) {
            console.error(`Error al obtener usuario ${row.user_id}:`, error);
          }

          return `\`${index + 1}.\` ${username} • **${row.score.toLocaleString()}** puntos`;
        })
      );

      // Construir el embed con la clasificación
      const embed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle("🧠 Clasificación de Trivia")
        .setDescription(description.join("\n"));

      // Enviar el embed con la clasificación
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error al obtener la clasificación de trivia:", error);
      return interaction.reply({
        content: "Hubo un error al obtener la clasificación de trivia. Por favor, intenta más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
