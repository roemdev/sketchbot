const { EmbedBuilder } = require("discord.js");
const assets = require("../../config/assets.json");
const ms = require("ms");

module.exports = {
  name: "ping",
  description: "Muestra la latencia del bot, la API de Discord y la base de datos.",

  async execute(message, args) {
    const botLatency = (Date.now() - message.createdTimestamp) / 1000; // Convierte a segundos
    const apiLatency = message.client.ws.ping / 1000; // Convierte a segundos
    const botUptime = process.uptime() * 1000;
    const uptimeFormatted = ms(botUptime, { long: true });

    const connection = message.client.dbConnection;

    let dbLatency = "N/A";
    try {
      const start = Date.now();
      await connection.query("SELECT 1");
      dbLatency = (Date.now() - start) / 1000; // Convierte a segundos
    } catch (error) {
      console.error("Error al medir la latencia de la base de datos:", error);
      dbLatency = "Error";
    }

    // Función para redondear a máximo 4 decimales sin ceros innecesarios
    const formatLatency = (value) =>
      typeof value === "number" ? parseFloat(value.toFixed(4)) : value;

    const embed = new EmbedBuilder()
      .setColor('Random')
      .setTitle('Pong! 🏓')
      .setDescription(
        `**Bot:** \`${formatLatency(botLatency)}s\`\n` +
        `**API:** \`${formatLatency(apiLatency)}s\`\n` +
        `**DB:** \`${dbLatency !== "Error" ? formatLatency(dbLatency) + "s" : "Error"}\`\n` +
        `**Uptime:** \`${uptimeFormatted}\``
      )

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  },
};
