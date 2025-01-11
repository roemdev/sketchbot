const { Events, ActivityType  } = require("discord.js");
const updateVoiceChannel = require("./updateVoiceChannel");
const config = require('../../config.json');


module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Bot listo! Conectado como ${client.user.tag}`);
    
    client.user.setPresence({
      activities: [
        { name: '/ayuda', type: ActivityType.Listening }
      ],
      status: "online",
    });    
    
    // ID del servidor y del canal de voz
    const guildId = config.bot.guildId;
    const voiceChannelId = "1327513515438772335";

    // Buscar el servidor y llamar a la función de actualización
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      await updateVoiceChannel(guild, voiceChannelId);
    } else {
      console.error("No se pudo encontrar el servidor especificado.");
    }
  },
};
