const config = require("../core.json");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    const joinChannelId = config.voice.vcJoinChannel;

    // Usuario entra al canal de activación
    if ((!oldState.channelId || oldState.channelId !== newState.channelId) && newState.channelId === joinChannelId) {
      const guild = newState.guild;

      // Crear canal temporal en la misma categoría
      const parent = newState.channel.parent;
      const channelName = config.voice.vcNameTemplate.replace("{username}", newState.member.user.username);
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

      // Mover al usuario al canal temporal
      await newState.setChannel(tempChannel);

      // Guardar referencia para borrarlo luego
      client.tempVCs = client.tempVCs || new Map();
      client.tempVCs.set(tempChannel.id, { ownerId: newState.id });
    }

    // Usuario sale de un canal temporal
    if (oldState.channelId && client.tempVCs?.has(oldState.channelId)) {
      const tempInfo = client.tempVCs.get(oldState.channelId);
      const channel = oldState.channel;
      if (channel.members.size === 0) {
        await channel.delete().catch(() => { });
        client.tempVCs.delete(oldState.channelId);
      }
    }
  }
};
