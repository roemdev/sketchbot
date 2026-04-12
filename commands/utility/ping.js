const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder().setName("ping").setDescription("Muestra la latencia del bot."),

  async execute(interaction) {
    await interaction.reply({ content: "Midiendo latencia... dame un segundo.", flags: MessageFlags.Ephemeral });

    const wsPing = interaction.client.ws.ping;
    const interactionPing = Date.now() - interaction.createdTimestamp;

    await interaction.editReply({
      content: `🏓 **¡Pong!**\nEl WebSocket tardó **${wsPing}ms** y mi cerebro tardó **${interactionPing}ms** en responder. ¡No está mal!`,
      components: [],
    });
  },
};
