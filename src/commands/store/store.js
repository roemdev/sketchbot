const { SlashCommandBuilder } = require("discord.js");
const storeService = require("../../services/storeService");
const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../../core.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tienda")
    .setDescription("Muestra los items disponibles en la tienda"),

  async execute(interaction) {
    const items = await storeService.getItems("available");

    if (!items.length) {
      return interaction.reply({
        embeds: [makeEmbed("error", "Tienda vacía", "No hay items disponibles actualmente.")],
        ephemeral: true
      });
    }

    // Construcción de la descripción completa del embed
    const description = items
      .map(item =>
        `${item.icon_id} **${item.name}** | **${config.emojis.coin}${item.price.toLocaleString()}**\n` +
        `> ${item.description || "Sin descripción"}`
      )
      .join("\n\n");

    const embed = makeEmbed(
      "base",
      "🛒 Tienda",
      description
    );

    return interaction.reply({ embeds: [embed] });
  }
};
