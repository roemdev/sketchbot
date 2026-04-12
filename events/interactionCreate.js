const { Events, MessageFlags, Collection } = require("discord.js");
const voiceController = require("../utils/voiceController");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // --- 1. INTERCEPTAMOS LOS CONTROLES DE VOZ ---
    if (
      (interaction.isButton() || interaction.isUserSelectMenu()) &&
      interaction.customId.startsWith("vc_")
    ) {
      return voiceController.handleInteraction(interaction);
    }

    // --- 2. MANEJO DE MODALES ---
    if (interaction.isModalSubmit()) {
      const commandName = interaction.customId
        .replace("_modal", "")
        .replaceAll("_", "-");
      const modalModule = interaction.client.commands.get(commandName);

      if (modalModule && typeof modalModule.handleModal === "function") {
        try {
          await modalModule.handleModal(interaction);
        } catch (error) {
          console.error(
            `Error executing handleModal for ${commandName}:`,
            error,
          );
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "Uy, ese formulario salió travieso. Prueba otra vez.",
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
      return;
    }

    let command = null;

    // --- 3. MANEJO DE COMANDOS Y OTROS BOTONES ---
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
          console.error(
            `Error executing buttonHandler for ${commandName}:`,
            error,
          );
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "Ese botón se puso rebelde 😅. Inténtalo de nuevo.",
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
      return;
    } else if (interaction.isStringSelectMenu()) {
      // Route smash character select to smash buttonHandler
      const commandName = interaction.customId.split("_")[0];
      const menuModule = interaction.client.commands.get(commandName);

      if (menuModule && typeof menuModule.buttonHandler === "function") {
        try {
          const handled = await menuModule.buttonHandler(interaction);
          if (handled) return;
        } catch (error) {
          console.error(
            `Error executing buttonHandler (select) for ${commandName}:`,
            error,
          );
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "Esa selección se enredó un poquito. Dale otra vez.",
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
      return;
    }

    if (interaction.isChatInputCommand() && !command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    // --- 4. LÓGICA DE COOLDOWN ---
    if (command && command.cooldown) {
      const { cooldowns } = interaction.client;
      const now = Date.now();
      const defaultCooldownDuration = 5;
      const cooldownAmount =
        (command.cooldown ?? defaultCooldownDuration) * 1_000;

      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      const timestamps = cooldowns.get(command.data.name);

      if (timestamps.has(interaction.user.id)) {
        const expirationTime =
          timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1_000);
          return interaction.reply({
            content: `Tranqui, crack 😎. Ese comando está descansando y vuelve <t:${expiredTimestamp}:R>.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
    }

    // --- 5. EJECUCIÓN DEL COMANDO ---
    try {
      if (command) {
        await command.execute(interaction);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = "Ay no, este comando tropezó 😵. Intenta otra vez.";
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: errorMessage,
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};
