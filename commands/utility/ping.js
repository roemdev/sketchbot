const { SlashCommandBuilder } = require('discord.js');
const { makeEmbed } = require('../../utils/embedFactory');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  async execute(interaction) {
    // Responder inmediatamente para medir la latencia
    await interaction.reply({ content: 'Pinging...', ephemeral: true });

    // Calcula el tiempo que tardó Discord en reconocer la interacción
    const latency = interaction.client.ws.ping; // Latencia de Web Socket (heartbeat)
    const responseTime = Date.now() - interaction.createdTimestamp; // Latencia de la interacción

    const embed = makeEmbed(
      'info',
      '🏓 Pong!',
      `**Latencia del Bot (API Ping):** ${latency}ms\n**Latencia de la Interacción:** ${responseTime}ms`
    );

    // Editar la respuesta inicial con los resultados
    await interaction.editReply({
      content: '',
      embeds: [embed],
    });
  },
};