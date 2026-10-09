const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const config = require("../../utils/config");

const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("rewards-list")
      .setDescription("Muestra la lista de recompensas diarias activas por rol."),

  async execute(interaction) {
    let rows;
    try {
      rows = db.query("SELECT role_id, ammount FROM role_rewards ORDER BY ammount ASC");
    } catch (error) {
      console.error(error);
      return interaction.reply({
        content: "Error obteniendo la lista de recompensas.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!rows || rows.length === 0) {
      return interaction.reply({
        content: "No hay recompensas configuradas en este momento.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const lines = rows.map((row, index) =>
        `**${index + 1}.** <@&${row.role_id}> — **${COIN}${row.ammount.toLocaleString()}** diarias`
    ).join("\n");

    return interaction.reply({ content: `📜 **Recompensas diarias por rol**\n\n${lines}` });
  }
};