module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {

    // ---------- Modal ----------
    if (interaction.isModalSubmit()) {
      const cmd = require("../commands/store/store");
      if (typeof cmd.modalHandler === "function") {
        await cmd.modalHandler(interaction);
      }
      return;
    }

    // ---------- Select Menu ----------
    if (interaction.isStringSelectMenu()) {
      const cmd = require("../commands/store/store");
      if (typeof cmd.selectHandler === "function") {
        await cmd.selectHandler(interaction);
      }
      return;
    }

    // ---------- Botones ----------
    if (interaction.isButton()) {
      // Aquí enrutas los botones del comando swap
      const swapCmd = require("../commands/economy/swap");
      if (swapCmd && typeof swapCmd.buttonHandler === "function") {
        await swapCmd.buttonHandler(interaction);
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
