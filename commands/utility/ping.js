const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder().setName("ping").setDescription("Comprueba si el bot sigue vivo."),

  async execute(interaction) {
    await interaction.reply({ content: "Midiendo...", flags: MessageFlags.Ephemeral });

    const wsPing = interaction.client.ws.ping;
    const interactionPing = Date.now() - interaction.createdTimestamp;

    return interaction.editReply({
      content: `🏓 **Pong!** WebSocket: **${wsPing}ms** — Interacción: **${interactionPing}ms**`,
      flags: MessageFlags.Ephemeral,
    });
  },
};