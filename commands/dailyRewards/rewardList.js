const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const { makeContainer, CV2, CV2_EPHEMERAL } = require("../../utils/ui");
const config = require("../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rewards-list")
    .setDescription("Muestra la lista de recompensas diarias activas por rol."),

  async execute(interaction) {
    const rows = await db.query(
      "SELECT role_id, ammount FROM role_rewards ORDER BY ammount ASC"
    );

    if (!rows || rows.length === 0) {
      return interaction.reply({
        components: [makeContainer("info", "Vacío", "No hay recompensas configuradas actualmente.")],
        flags: CV2_EPHEMERAL,
      });
    }

    const list = rows
      .map((row, i) => `**${i + 1}.** <@&${row.role_id}> — **${config.emojis.coin}${row.ammount.toLocaleString()}** diarios`)
      .join("\n");

    return interaction.reply({
      components: [makeContainer("info", "Tabla de Recompensas", list)],
      flags: CV2,
    });
  },
};
