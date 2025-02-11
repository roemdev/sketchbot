module.exports = async function handleAutocomplete(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command || !command.autocomplete) return;

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    console.error("Error en el autocompletado:", error);
    await interaction.respond([
      { name: "Error al cargar opciones", value: "error" },
    ]);
  }
};