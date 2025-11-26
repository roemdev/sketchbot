const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config/config.json");

function getStatus(latency) {
  if (latency < 60) return { label: "Excelente", emoji: "🟢", level: 5 };
  if (latency < 120) return { label: "Buena", emoji: "🟡", level: 4 };
  if (latency < 200) return { label: "Regular", emoji: "🟠", level: 3 };
  return { label: "Mala", emoji: "🔴", level: 2 };
}

function makeBar(level) {
  const total = 5;
  const filled = "█".repeat(level);
  const empty = "░".repeat(total - level);
  return filled + empty;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Mide la latencia del bot y la API de Discord."),

  async execute(interaction) {
    const start = Date.now();
    await interaction.deferReply();

    const botPing = Date.now() - start;
    const apiPing = interaction.client.ws.ping;

    const botStatus = getStatus(botPing);
    const apiStatus = getStatus(apiPing);

    const embed = new EmbedBuilder()
      .setColor(config.embed.colorBase)
      .setTitle("Latencia")
      .addFields(
        {
          name: `${botStatus.emoji} Bot`,
          value:
            `**${botPing} ms**\n` +
            `Estado: **${botStatus.label}**\n` +
            `Latencia: \`${makeBar(botStatus.level)}\``,
          inline: true
        },
        {
          name: `${apiStatus.emoji} Discord API`,
          value:
            `**${apiPing} ms**\n` +
            `Estado: **${apiStatus.label}**\n` +
            `Latencia: \`${makeBar(apiStatus.level)}\``,
          inline: true
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
