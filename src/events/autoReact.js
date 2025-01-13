const { Events } = require("discord.js");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const reactions = {
      "1324197341447848046": ["👋"],
      "1324950228083802283": ["👍", "👎"],
    };

    const reactionEmojis = reactions[message.channel.id];
    if (reactionEmojis) {
      try {
        await Promise.all(reactionEmojis.map(emoji => message.react(emoji)));
      } catch (error) {
        console.error(`No se pudo reaccionar al mensaje: ${error}`);
      }
    }
  },
};
