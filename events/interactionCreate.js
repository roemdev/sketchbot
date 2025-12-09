const { Events } = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {

    // -------------------------------------------------
    // AUTOCOMPLETE
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
    // BOTONES
    // -------------------------------------------------
    if (interaction.isButton()) {
      const id = interaction.customId;

      // 1. Prefix-based routing (CORREGIDO)
      if (id.startsWith("swap_")) {
        try {
          const swapCmd = require("../commands/economy/swap");
          if (swapCmd.buttonHandler) {
            return await swapCmd.buttonHandler(interaction);
          }
        } catch (err) {
          console.error("Error en buttonHandler SWAP:", err);
        }
        return;
      }

      if (id.startsWith("buy_")) {
        try {
          const buyCmd = require("../commands/store/buy");
          if (buyCmd.buttonHandler) {
            return await buyCmd.buttonHandler(interaction);
          }
        } catch (err) {
          console.error("Error en buttonHandler BUY:", err);
        }
        return;
      }

      if (id.startsWith("task_")) {
        try {
          const taskCmd = require("../commands/economy/task");
          if (taskCmd.buttonHandler) {
            return await taskCmd.buttonHandler(interaction);
          }
        } catch (err) {
          console.error("Error en buttonHandler TASK:", err);
        }
        return;
      }

      if (id.startsWith("giftbox_")) {
        try {
          const giftboxCmd = require("../commands/games/giftbox");
          if (giftboxCmd.buttonHandler) {
            return await giftboxCmd.buttonHandler(interaction);
          }
        } catch (err) {
          console.error("Error en buttonHandler GIFTBOX:", err);
        }
        return;
      }

      if (id.startsWith("tower_")) {
        try {
          const towerCmd = require("../commands/games/riskTower");
          if (towerCmd.buttonHandler) {
            return await towerCmd.buttonHandler(interaction);
          }
        } catch (err) {
          console.error("Error en buttonHandler TOWER:", err);
        }
        return;
      }

      if (id.startsWith("highroll_")) {
        try {
          const cmd = require("../commands/games/highroll");
          if (cmd.buttonHandler) {
            return await cmd.buttonHandler(interaction);
          }
        } catch (err) {
          console.error("Error en buttonHandler HIGHROLL:", err);
        }
        return;
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
