const { Events } = require("discord.js");
const handleAutocomplete = require("../handlers/autocompleteHandler");
const handleChatInputCommand = require("../handlers/chatInputCommandHandler");
const handleButton = require("../commands/fun/giveaway/giveawayButtonHandler");
const { handleVoiceMasterCommand } = require('../commands/management/voice-master/voiceMasterHandler');
const { handleOpenTicket } = require('../commands/management/ticket-system/ticketHandler')

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

      if (interaction.customId.startsWith('tk')) { // vm - voice master
        await handleOpenTicket(interaction);
        return;
      }
    }
  },
};
