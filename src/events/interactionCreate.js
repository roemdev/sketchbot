const { Events } = require("discord.js");
const handleAutocomplete = require("../handlers/autocompleteHandler");
const handleChatInputCommand = require("../handlers/chatInputCommandHandler");
const handleButton = require("../handlers/giveawayButtonHandler");
const { handleVoiceMasterCommand } = require('../handlers/voiceMasterHandler');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isAutocomplete()) {
      return handleAutocomplete(interaction);
    }

    if (interaction.isChatInputCommand()) {
      return handleChatInputCommand(interaction);
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('ga')) { // ga - giveaway
        return handleButton(interaction);
      } else if (interaction.customId.startsWith('vm')) { // vm - voice master
        return handleVoiceMasterCommand(interaction);
      }
    }
  },
};
