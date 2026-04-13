const { Events, MessageFlags, Collection } = require("discord.js");
const voiceController = require("../utils/voiceController");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (
        (interaction.isButton() || interaction.isUserSelectMenu()) &&
        interaction.customId.startsWith("vc_")
    ) {
      return voiceController.handleInteraction(interaction);
    }

    if (interaction.isModalSubmit()) {
      const commandName = interaction.customId.replace("_modal", "").replaceAll("_", "-");
      const modalModule = interaction.client.commands.get(commandName);

      if (modalModule && typeof modalModule.handleModal === "function") {
        try {
          await modalModule.handleModal(interaction);
        } catch (error) {
          console.error(`Error ejecutando handleModal para ${commandName}:`, error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "Algo salió mal procesando el formulario. Intenta de nuevo.", flags: MessageFlags.Ephemeral }).catch(console.error);
          }
        }
      }
      return;
    }

    let command = null;

    if (interaction.isChatInputCommand()) {
      command = interaction.client.commands.get(interaction.commandName);
    } else if (interaction.isButton()) {
      const commandName = interaction.customId.split("_")[0];
      const buttonModule = interaction.client.commands.get(commandName);

      if (buttonModule && typeof buttonModule.buttonHandler === "function") {
        try {
          const handled = await buttonModule.buttonHandler(interaction);
          if (handled) return;
        } catch (error) {
          console.error(`Error ejecutando buttonHandler para ${commandName}:`, error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "Algo salió mal con ese botón. Intenta de nuevo.", flags: MessageFlags.Ephemeral }).catch(console.error);
          }
        }
      }
      return;
    } else if (interaction.isStringSelectMenu()) {
      const commandName = interaction.customId.split("_")[0];
      const menuModule = interaction.client.commands.get(commandName);

      if (menuModule && typeof menuModule.buttonHandler === "function") {
        try {
          const handled = await menuModule.buttonHandler(interaction);
          if (handled) return;
        } catch (error) {
          console.error(`Error ejecutando buttonHandler (select) para ${commandName}:`, error);
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "Algo salió mal con esa selección. Intenta de nuevo.", flags: MessageFlags.Ephemeral }).catch(console.error);
          }
        }
      }
      return;
    }

    if (interaction.isChatInputCommand() && !command) {
      console.error(`No se encontró el comando: ${interaction.commandName}`);
      return;
    }

    if (command && command.cooldown) {
      const { cooldowns } = interaction.client;
      const now = Date.now();
      const cooldownAmount = (command.cooldown ?? 5) * 1_000;

      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const timestamps = cooldowns.get(command.data.name);

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1_000);
          return interaction.reply({
            content: `Tranquilo, todavía no puedes usar \`/${command.data.name}\`. Vuelve <t:${expiredTimestamp}:R>.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
    }

    try {
      if (command) await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const errorMessage = "Algo salió mal ejecutando ese comando. Intenta de nuevo.";
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral }).catch(console.error);
      } else {
        await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral }).catch(console.error);
      }
    }
  },
};