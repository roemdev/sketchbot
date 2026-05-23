const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const db = require("../../services/dbService");
const config = require("../../utils/config");

const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("rewards-list")
      .setDescription("Muestra la lista de recompensas diarias activas por rol."),

  async execute(interaction) {
    const { data: rows, error } = await db
        .from("role_rewards")
        .select("role_id, ammount")
        .order("ammount", { ascending: true });

    if (error) {
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