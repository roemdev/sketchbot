module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {

    // ---------- Modal ----------
    if (interaction.isModalSubmit()) {
      const storeCmd = require("../commands/store/store");
      if (typeof storeCmd.modalHandler === "function") {
        await storeCmd.modalHandler(interaction);
      }
      return;
    }

    // ---------- Select Menu ----------
    if (interaction.isStringSelectMenu()) {
      const storeCmd = require("../commands/store/store");
      if (typeof storeCmd.selectHandler === "function") {
        await storeCmd.selectHandler(interaction);
      }
      return;
    }

    // ---------- Botones ----------
    if (interaction.isButton()) {

      // Botones del comando swap
      const swapCmd = require("../commands/economy/swap");
      if (swapCmd && typeof swapCmd.buttonHandler === "function") {
        const handled = await swapCmd.buttonHandler(interaction);
        if (handled) return; // <- si lo manejó swap, no sigas
      }

      // Botones del comando comprar
      const buyCmd = require("../commands/store/buy");
      if (buyCmd && typeof buyCmd.buttonHandler === "function") {
        const handled = await buyCmd.buttonHandler(interaction);
        if (handled) return;
      }

      // Botones del comando trabajo
      const workCmd = require("../commands/economy/task");
      if (workCmd && typeof workCmd.buttonHandler === "function") {
        const handled = await workCmd.buttonHandler(interaction);
        if (handled) return;
      }

      return;
    }

    // ---------- Slash Commands ----------
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    await command.execute(interaction, client);
  }
};
