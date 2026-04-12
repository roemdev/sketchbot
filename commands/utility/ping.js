const { SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder().setName("ping").setDescription("Muestra la latencia del bot."),

  async execute(interaction) {
    await interaction.reply({ content: "Midiendo latencia... dame un segundo.", flags: MessageFlags.Ephemeral });

    const wsPing = interaction.client.ws.ping;
    const interactionPing = Date.now() - interaction.createdTimestamp;

    await interaction.editReply({
      content: "",
      components: [
        new ContainerBuilder().setAccentColor(0x5B7FA6)
            .addTextDisplayComponents(t => t.setContent(
                `### 🏓 Pong!\n**Latencia WebSocket:** ${wsPing}ms\n**Latencia de interacción:** ${interactionPing}ms`
            ))
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
