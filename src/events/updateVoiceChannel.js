module.exports = async (guild, voiceChannelId) => {
  try {
    // Buscar el canal de voz por su ID
    const voiceChannel = guild.channels.cache.get(voiceChannelId);

    if (!voiceChannel) {
      console.error("El canal de voz no existe o no se pudo encontrar.");
      return;
    }

    // Obtener el número total de miembros en el servidor
    const totalMembers = guild.memberCount - 8;

    // Renombrar el canal con el número de miembros
    await voiceChannel.edit({ name: `👥╏${totalMembers}/200` });
  } catch (error) {
    console.error("Error actualizando el canal de voz:", error);
  }
};