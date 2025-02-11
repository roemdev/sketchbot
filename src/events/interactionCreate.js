const { Events } = require("discord.js");
const handleAutocomplete = require("../handlers/autocompleteHandler");
const handleChatInputCommand = require("../handlers/chatInputCommandHandler");
const handleButton = require("../handlers/giveawayButtonHandler");
const { handleVoiceMasterCommand } = require('../handlers/voiceMasterHandler');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isAutocomplete()) {
      await handleAutocomplete(interaction);
      return;
    }

    if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('ga')) { // ga - giveaway
        await handleButton(interaction);
        return;
      }

      if (interaction.customId.startsWith('vm')) { // vm - voice master
        await handleVoiceMasterCommand(interaction);
        return;
      }
    }
  },
};
