const { Events } = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {

    // -------------------------------------------------
    // AUTOCOMPLETE (siempre debe ir primero)
    // -------------------------------------------------
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (command?.autocompleteHandler) {
        try {
          await command.autocompleteHandler(interaction);
        } catch (err) {
          console.error(`Error en autocomplete de ${interaction.commandName}:`, err);
          try {
            await interaction.respond([]);
          } catch { }
        }
      }
      return;
    }


    // -------------------------------------------------
    // BOTONES (versión compatible con tus handlers antiguos)
    // -------------------------------------------------
    if (interaction.isButton()) {

      // Swap
      try {
        const swapCmd = require("../commands/economy/swap");
        if (swapCmd.buttonHandler) {
          const handled = await swapCmd.buttonHandler(interaction);
          if (handled) return;
        }
      } catch (err) {
        console.error("Error en buttonHandler SWAP:", err);
      }

      // Comprar
      try {
        const buyCmd = require("../commands/store/buy");
        if (buyCmd.buttonHandler) {
          const handled = await buyCmd.buttonHandler(interaction);
          if (handled) return;
        }
      } catch (err) {
        console.error("Error en buttonHandler BUY:", err);
      }

      // Task / trabajo
      try {
        const taskCmd = require("../commands/economy/task");
        if (taskCmd.buttonHandler) {
          const handled = await taskCmd.buttonHandler(interaction);
          if (handled) return;
        }
      } catch (err) {
        console.error("Error en buttonHandler TASK:", err);
      }

      return;
    }


    // -------------------------------------------------
    // SLASH COMMANDS
    // -------------------------------------------------
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`Error ejecutando ${interaction.commandName}:`, error);

        try {
          await interaction.reply({
            content: "Ocurrió un error interno al ejecutar el comando.",
            ephemeral: true
          });
        } catch { }
      }
    }
  }
};
