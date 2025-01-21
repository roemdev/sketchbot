const { Events, ChannelType, PermissionsBitField } = require("discord.js");

// Map to track dynamically created voice channels
const voiceChannelsMap = new Map();

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const guild = newState.guild;
    const baseChannelId = "1312872660715175956";

    // User joins the base voice channel
    if (
      newState.channelId === baseChannelId &&
      oldState.channelId !== baseChannelId
    ) {
      const member = newState.member;

      // Create a new voice channel with the user's username
      const newChannel = await guild.channels.create({
        name: member.user.username,
        type: ChannelType.GuildVoice,
        parent: newState.channel?.parent || null,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
            ],
          },
          {
            id: guild.members.me.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.Connect,
            ],
          },
        ],
      });

      // Move the user to the newly created channel
      await member.voice.setChannel(newChannel);

      // Add the channel to the map with the owner's ID
      voiceChannelsMap.set(newChannel.id, member.id);
    }

    // Remove dynamically created voice channels when they are empty
    if (oldState.channelId && voiceChannelsMap.has(oldState.channelId)) {
      const channel = oldState.channel;

      if (channel.members.size === 0) {
        try {
          await channel.delete();
          voiceChannelsMap.delete(oldState.channelId);
        } catch (error) {
          console.error(`Failed to delete voice channel: ${error.message}`);
        }
      }
    }
  },
};

// Export the map for use in other modules
module.exports.voiceChannelsMap = voiceChannelsMap;
