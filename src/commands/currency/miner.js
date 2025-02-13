const { SlashCommandBuilder } = require("discord.js");
const { executeJob } = require("../../handlers/jobHandler");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("minar")
    .setDescription("Trabaja como minero y obtén recompensas")
    .addStringOption((option) =>
      option
        .setName("mapa")
        .setDescription("El mapa donde deseas trabajar.")
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;

    try {
      const connection = interaction.client.dbConnection;
      const [rows] = await connection.query("SELECT id, name FROM curr_maps ORDER BY id ASC;");

      const choices = rows.map((row) => ({
        name: row.name,
        value: row.name,
      }));

      await interaction.respond(choices);
    } catch (error) {
      console.error("Error en autocomplete para /minar:", error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    await executeJob(interaction, "Minero", assets);
  },
};
