const { Events, MessageFlags } = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Manejar autocompletado
    if (interaction.isAutocomplete()) {
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
      return;
    }

    // Manejar comandos de barra (/)
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
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
      return;
    }

    // Manejar botones (entradas al sorteo)
    if (interaction.isButton()) {
      const [action, giveawayId] = interaction.customId.split("_"); // Separar el customId
      if (action === "enterButton") {
        try {
          const connection = interaction.client.dbConnection;

          // Verificar si el sorteo existe y está activo
          const [giveaway] = await connection.query(
            `SELECT * FROM giveaways WHERE id = ? AND status = 'active'`,
            [giveawayId]
          );

          if (giveaway.length === 0) {
            return interaction.reply({
              content: "Este sorteo ya ha terminado.",
              flags: MessageFlags.Ephemeral,
            });
          }

          // Verificar si el usuario ya ha ingresado
          const [entry] = await connection.query(
            `SELECT * FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?`,
            [giveawayId, interaction.user.id]
          );

          if (entry.length > 0) {
            return interaction.reply({
              content: "Ya has ingresado a este sorteo.",
              flags: MessageFlags.Ephemeral,
            });
          }

          // Guardar la entrada en la base de datos
          await connection.query(
            `INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)`,
            [giveawayId, interaction.user.id]
          );

          // Obtener el número actual de entradas
          const [entries] = await connection.query(
            `SELECT COUNT(*) AS entryCount FROM giveaway_entries WHERE giveaway_id = ?`,
            [giveawayId]
          );

          const entryCount = entries[0].entryCount;

          // Obtener el mensaje original del sorteo
          const channel = await interaction.client.channels.fetch(giveaway[0].channel_id);
          const message = await channel.messages.fetch(giveaway[0].message_id);

          // Obtener el embed del mensaje
          const embed = message.embeds[0];

          // Verificar si el embed tiene campos
          if (!embed.data.fields) {
            embed.data.fields = [];
          }

          // Buscar el campo "Entradas"
          const entriesField = embed.data.fields.find((field) => field.name === "Entradas");

          // Si el campo no existe, lo agregamos
          if (!entriesField) {
            embed.addFields({ name: "Entradas", value: entryCount.toString(), inline: true });
          } else {
            // Si el campo existe, lo actualizamos
            entriesField.value = entryCount.toString();
          }

          // Editar el mensaje original con el embed actualizado
          await message.edit({ embeds: [embed] });

          await interaction.reply({
            content: "¡Has ingresado al sorteo!",
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          console.error("Error al manejar la entrada:", error);
          await interaction.reply({
            content: "Hubo un error al ingresar al sorteo.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      return;
    }
  },
};