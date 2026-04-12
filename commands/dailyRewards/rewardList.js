const { SlashCommandBuilder } = require("discord.js");
const db = require("../../services/dbService");
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
        content: `Mmm, la caja fuerte está vacía. No hay ninguna recompensa configurada ahora mismo. 🦗`,
      });
    }

    const list = rows
      .map((row, i) => `**${i + 1}.** <@&${row.role_id}> — **${row.ammount.toLocaleString()}** ${config.emojis.coin} diarios`)
      .join("\n");

    return interaction.reply({
      content: `### 📋 Tabla de Recompensas\nAquí está lo que pagan por cada rol:\n${list}`,
    });
  },
};
