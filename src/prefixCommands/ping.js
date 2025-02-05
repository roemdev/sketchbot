const { EmbedBuilder } = require("discord.js");
const assets = require("../../assets.json");
const ms = require("ms");

module.exports = {
  name: "ping",
  description: "Muestra la latencia del bot y de la API de Discord.",

  async execute(message, args) {
    const botLatency = Date.now() - message.createdTimestamp;
    const apiLatency = message.client.ws.ping;
    const botUptime = process.uptime() * 1000;
    const uptimeFormatted = ms(botUptime, { long: true });
    const currentDateTime = new Date().toLocaleString();
    const embed = new EmbedBuilder();

    embed
      .setColor(assets.color.base)
      .addFields(
        { name: " ", value: `**Bot:** \`${botLatency}ms\``, inline: true },
        { name: " ", value: `**API:** \`${apiLatency}ms\``, inline: true },
        { name: " ", value: `**Uptime:** \`${uptimeFormatted}\``, inline: true }
      )
      .setFooter(currentDateTime);

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
