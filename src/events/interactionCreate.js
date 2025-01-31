const { Events } = require("discord.js");
const handleAutocomplete = require("../utils/autocompleteHandler");
const handleChatInputCommand = require("../utils/chatInputCommandHandler");
const handleButton = require("../utils/giveawayButtonHandler");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Manejar autocompletado
    if (interaction.isAutocomplete()) {
      return handleAutocomplete(interaction);
    }

    if (interaction.isChatInputCommand()) {
      return handleChatInputCommand(interaction);
    }

    if (interaction.isButton()) {
      return handleButton(interaction);
    }
  },
};