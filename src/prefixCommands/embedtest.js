const { EmbedBuilder } = require("discord.js");
const assets = require("../../assets.json");
const ms = require("ms");

module.exports = {
  name: "embed",
  description: "Embed test",

  async execute(message) {
    message.reply({ 
      content: 'Hola bb',
      allowedMentions: { repliedUser: false } })
  },
};
