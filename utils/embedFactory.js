const { EmbedBuilder } = require("discord.js");
const config = require("../core.json");

/**
 * Crea un embed estandarizado según el tipo definido en core.json
 *
 * @param {"base"|"info"|"success"|"error"} type
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function makeEmbed(type = "base", title = "", description = "") {
  const color = config.embeds[type] || config.embeds.base;

  const embed = new EmbedBuilder()
    .setColor(color);

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);

  return embed;
}

module.exports = { makeEmbed };
