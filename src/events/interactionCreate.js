module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    // ---------- Modal ----------
    if (interaction.isModalSubmit()) {
      await require("../commands/store/store").modalHandler(interaction);
      return;
    }

    // ---------- Select Menu ----------
    if (interaction.isStringSelectMenu()) {
      await require("../commands/store/store").selectHandler(interaction);
      return;
    }

    // ---------- Comando normal ----------
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    command.execute(interaction, client);
  }
};
