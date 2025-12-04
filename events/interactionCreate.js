const { Events } = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const commandName = interaction.commandName;

    // ---------- Slash Commands ----------
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(commandName);
      if (!command) {
        console.error(`No se encontró el comando ${commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error ejecutando ${commandName}`);
        console.error(error);
      }

      // ---------- Buttons ----------
    } else if (interaction.isButton()) {
      const commandsWithButtons = ["comprar", "swap", "trabajo", "test"]; // agrega aquí los comandos que tengan botones

      for (const cmdName of commandsWithButtons) {
        const cmd = interaction.client.commands.get(cmdName);
        if (cmd?.buttonHandler) {
          const handled = await cmd.buttonHandler(interaction);
          if (handled) return; // si un comando maneja el botón, no seguimos
        }
      }

      // ---------- Autocomplete ----------
    } else if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(commandName);
      if (command?.autocompleteHandler) {
        await command.autocompleteHandler(interaction);
      }
    }
  }
};
