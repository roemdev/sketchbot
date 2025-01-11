const { Events } = require("discord.js");
const updateVoiceChannel = require("./updateVoiceChannel");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const voiceChannelId = "1327513515438772335"; // Reemplaza con el ID de tu canal de voz

    // Llamar a la función para actualizar el canal de voz
    await updateVoiceChannel(member.guild, voiceChannelId);
  },
};
