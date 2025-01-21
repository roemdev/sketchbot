const { Events, MessageFlags } = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isAutocomplete()) {
      // Aquí manejamos la interacción de autocompletado
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command || !command.autocomplete) return;

      try {
        await command.autocomplete(interaction); // Llamamos al método de autocompletado del comando
      } catch (error) {
        console.error("Error en el autocompletado:", error);
        await interaction.respond([
          { name: "Error al cargar opciones", value: "error" },
        ]); // Respuesta en caso de error
      }
      return; // Salimos aquí para evitar procesar el comando normal después
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
