const { Events, MessageFlags, Collection } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    let command = null;

    if (interaction.isChatInputCommand()) {
      command = interaction.client.commands.get(interaction.commandName);

    } else if (interaction.isButton()) {
      const commandName = interaction.customId.split('_')[0];
      const buttonModule = interaction.client.commands.get(commandName);

      if (buttonModule && typeof buttonModule.buttonHandler === 'function') {
        try {
          const handled = await buttonModule.buttonHandler(interaction);
          if (handled) return;
        } catch (error) {
          console.error(`Error executing buttonHandler for ${commandName}:`, error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: 'Hubo un error al procesar este botón.',
              flags: MessageFlags.Ephemeral
            });
          }
        }
      }
      return;

    } else if (interaction.isStringSelectMenu()) {
      return;
    }

    if (interaction.isChatInputCommand() && !command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    // --- LÓGICA DE COOLDOWN ---
    if (command && command.cooldown) {
      const { cooldowns } = interaction.client;
      const now = Date.now();
      const defaultCooldownDuration = 5;
      const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;

      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const timestamps = cooldowns.get(command.data.name);

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1_000);
          return interaction.reply({
            content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
    }

    // --- EJECUCIÓN DEL COMANDO ---
    try {
      if (command) {
        await command.execute(interaction);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = 'There was an error while executing this command!';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
      }
    }
  },
};