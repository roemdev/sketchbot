const { Events, MessageFlags } = require("discord.js");
//const handleButton = require("../commands/fun/giveaway/giveawayButtonHandler");
const { handleVoiceMasterCommand } = require("../commands/management/voice-master/voiceMasterHandler");
const { handleOpenTicket } = require("../commands/management/ticket-system/ticketHandler");
const { handleButtonInteraction, handleModalInteraction } = require("../commands/fun/nobility/nobilityHandler");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Autocompletado
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (command?.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error("Error en el autocompletado:", error);
          await interaction.respond([{ name: "Error al cargar opciones", value: "error" }]);
        }
      }
      return;
    }

    // Comando de barra (Slash Command)
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`No se encontró el comando: ${interaction.commandName}`);
        return;
      }
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        const replyOptions = { content: "Hubo un error al ejecutar este comando.", flags: MessageFlags.Ephemeral };
        interaction.replied || interaction.deferred
          ? await interaction.followUp(replyOptions)
          : await interaction.reply(replyOptions);
      }
      return;
    }

    // Botones
    if (interaction.isButton()) {
      //if (interaction.customId.startsWith("ga")) return await handleButton(interaction); // Giveaway
      if (interaction.customId.startsWith("vm")) return await handleVoiceMasterCommand(interaction); // Voice Master
      if (interaction.customId.startsWith("tk")) return await handleOpenTicket(interaction); // Ticket System
      if (interaction.customId.startsWith("nb")) return await handleButtonInteraction(interaction); // Nobility
    }

    // Modales
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "donation_modal") {
        const connection = interaction.client.dbConnection;
        const userId = interaction.user.id;
        await handleModalInteraction(interaction, connection, userId); // Modal para donaciones
      }
    }
  },
};
