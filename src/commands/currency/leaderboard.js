const {
  SlashCommandSubcommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName("clasificacion")
    .setDescription("Muestra la clasificación de los 10 miembros con más créditos."),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const guild = interaction.guild;

    try {
      // Obtener los 10 usuarios con más balance
      const [rows] = await connection.query(
        "SELECT id, balance FROM curr_users ORDER BY balance DESC LIMIT 10"
      );

      if (rows.length === 0) {
        return interaction.reply({
          content: "No hay datos disponibles para mostrar la clasificación.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Obtener los nombres de los usuarios
      const description = await Promise.all(
        rows.map(async (row, index) => {
          let username = "Usuario desconocido";

          try {
            // Asegúrate de que estamos tratando el id como string para evitar truncados
            const userIdString = row.id.toString();

            // Intentar obtener al usuario desde la caché o hacer un fetch
            const member = await guild.members.fetch(userIdString).catch(() => null);
            if (member) {
              username = member.user.username;
            } else {
              // Si el usuario no está en el servidor, intenta hacer fetch global
              const user = await interaction.client.users.fetch(userIdString).catch(() => null);
              if (user) {
                username = user.username;
              }
            }
          } catch (error) {
            console.error(`Error al obtener usuario ${row.id}:`, error);
          }

          return `\`${index + 1}.\` ${username} • ⏣${row.balance.toLocaleString()}`;
        })
      );

      // Construir el embed con la clasificación
      const embed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle("🏦 Clasificación de Arkania")
        .setDescription(description.join("\n"));

      // Enviar el embed con la clasificación
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error al obtener la clasificación:", error);
      return interaction.reply({
        content: "Hubo un error al obtener la clasificación. Por favor, intenta más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
