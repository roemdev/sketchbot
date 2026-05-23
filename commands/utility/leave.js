const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { ttsQueues } = require('../../events/messageCreate.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Desconecta al bot del canal de voz y limpia la cola de mensajes.'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const connection = getVoiceConnection(guildId);

    // Limpiar la cola si existe para este servidor
    if (ttsQueues && ttsQueues.has(guildId)) {
      ttsQueues.delete(guildId);
    }

    if (connection) {
      connection.destroy();
      return interaction.reply({ content: 'Me he desconectado del canal de voz.', flags: MessageFlags.Ephemeral });
    } else {
      return interaction.reply({ content: 'No estoy en ningún canal de voz en este momento.', flags: MessageFlags.Ephemeral });
    }
  },
};
