const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  async execute(interaction) {
    // Responder inmediatamente para medir la latencia
    await interaction.reply({ content: 'Pinging...', flags: MessageFlags.Ephemeral });

    // Calcula el tiempo que tardó Discord en reconocer la interacción
    const latency = interaction.client.ws.ping; // Latencia de Web Socket (heartbeat)
    const responseTime = Date.now() - interaction.createdTimestamp; // Latencia de la interacción

    // Editar la respuesta inicial con los resultados
    await interaction.editReply({
      content: `Pong! 🏓
            **Latencia del Bot (API Ping):** ${latency}ms
            **Latencia de la Interacción:** ${responseTime}ms`,
    });
  },
};