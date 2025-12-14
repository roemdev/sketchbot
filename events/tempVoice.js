const config = require("../core.json");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    // Asegura que el mapa de canales temporales exista
    client.tempVCs = client.tempVCs || new Map();

    const joinChannelId = config.voice.vcJoinChannel;
    const guild = newState.guild || oldState.guild;

    // I. CREACIÓN: Usuario entra al canal de activación
    if ((!oldState.channelId || oldState.channelId !== newState.channelId) && newState.channelId === joinChannelId) {
      const parent = newState.channel.parent;
      const channelName = config.voice.vcNameTemplate.replace("{username}", newState.member.user.displayName || newState.member.user.username);

      try {
        const tempChannel = await guild.channels.create({
          name: channelName,
          type: 2, // GuildVoice
          parent: parent,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              allow: ["Connect", "ViewChannel"]
            }
          ]
        });

        await newState.setChannel(tempChannel);

        client.tempVCs.set(tempChannel.id, { ownerId: newState.id });
      } catch (error) {
        console.error("Error al crear o mover al canal temporal:", error);
      }
    }

    // II. LIMPIEZA: Usuario sale de un canal temporal
    // Verifica si el canal que el usuario dejó es temporal
    if (oldState.channelId && client.tempVCs.has(oldState.channelId)) {

      const channel = oldState.channel;

      if (channel) {
        // Si el canal queda vacío, se elimina
        if (channel.members.size === 0) {
          try {
            await channel.delete();
            client.tempVCs.delete(oldState.channelId);
          } catch (error) {
            console.error(`Error al intentar eliminar el canal ${channel.id}:`, error.message);
            client.tempVCs.delete(oldState.channelId);
          }
        }
      } else {
        // Limpiar referencia si el canal no se pudo obtener
        client.tempVCs.delete(oldState.channelId);
      }
    }
  }
};