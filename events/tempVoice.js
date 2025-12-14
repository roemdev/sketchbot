const config = require("../core.json");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    const client = oldState.client;

    if (!client.tempVCs) {
      client.tempVCs = new Map();
    }

    const joinChannelId = config.voice.vcJoinChannel;
    const guild = newState.guild || oldState.guild;

    if (
      oldState.channelId !== newState.channelId &&
      newState.channelId === joinChannelId
    ) {
      const parent = newState.channel.parent;

      const channelName = config.voice.vcNameTemplate.replace(
        "{username}",
        newState.member.displayName ?? newState.member.user.username
      );

      try {
        const tempChannel = await guild.channels.create({
          name: channelName,
          type: 2, // GuildVoice
          parent: parent ?? null,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              allow: ["ViewChannel", "Connect"]
            }
          ]
        });

        await newState.setChannel(tempChannel);

        client.tempVCs.set(tempChannel.id, {
          ownerId: newState.id
        });
      } catch (error) {
        console.error("Error al crear o mover al canal temporal:", error);
      }
    }

    if (oldState.channelId && client.tempVCs.has(oldState.channelId)) {
      const channel = oldState.channel;

      if (!channel) {
        client.tempVCs.delete(oldState.channelId);
        return;
      }

      if (channel.members.size === 0) {
        try {
          await channel.delete();
        } catch (error) {
          console.error(
            `Error al eliminar el canal temporal ${channel.id}:`,
            error
          );
        } finally {
          client.tempVCs.delete(oldState.channelId);
        }
      }
    }
  }
};
