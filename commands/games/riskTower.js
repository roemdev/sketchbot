const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ContainerBuilder
} = require("discord.js");

const config = require("../../core.json");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;

module.exports = {
  // Cooldown simple para que lo maneje interactionCreate.js
  cooldown: GAME_COOLDOWN,
  data: new SlashCommandBuilder()
    .setName("torre")
    .setDescription("Juego de torre con riesgo progresivo.")
    .addIntegerOption(option =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de créditos a apostar")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const bet = interaction.options.getInteger("cantidad");

    if (bet <= 0) {
      return interaction.reply({
        content: "La cantidad debe ser mayor que cero.",
        flags: MessageFlags.Ephemeral
      });
    }

    await userService.createUser(userId, username);

    try {
      await userService.addBalance(userId, -bet);
    } catch (err) {
      // Si falla por balance, eliminamos el cooldown que se aplicó en interactionCreate.js
      interaction.client.cooldowns.get(module.exports.data.name).delete(userId);
      return interaction.reply({
        content: "No tienes suficientes créditos.",
        flags: MessageFlags.Ephemeral
      });
    }

    const towerContainer = new ContainerBuilder()
      .setAccentColor(2895667)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `### 🗼 Torre de riesgo\n` +
          `Apuesta inicial: **${config.emojis.coin}${bet.toLocaleString("es-DO")}**\nSaldo en juego: **${config.emojis.coin}${bet.toLocaleString("es-DO")}**`
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId(`torre_risk_${userId}_${bet}_${bet}`)
            .setLabel("⚡ Arriesgar")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`torre_cashout_${userId}_${bet}_${bet}`)
            .setLabel("💰 Cobrar")
            .setStyle(ButtonStyle.Success)
        )
      );

    await interaction.reply({
      components: [towerContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
};

module.exports.buttonHandler = async (interaction) => {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("torre_")) return false;

  const parts = interaction.customId.split("_");
  const action = parts[1];
  const userId = parts[2];
  const bet = parseInt(parts[3], 10);
  let current = parseInt(parts[4], 10);

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "Esto no es tu juego.", flags: MessageFlags.Ephemeral });
  }

  if (action === "risk") {
    const win = Math.random() < 0.8;

    if (win) {
      current = current * 2;

      const winContainer = new ContainerBuilder()
        .setAccentColor(0x32cd32)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `### 🚀 ¡Subiste un nivel!\n` +
            `Tu saldo en juego se ha duplicado. Total actual: **${config.emojis.coin}${current.toLocaleString("es-DO")}**`
          )
        )
        .addSeparatorComponents((separator) => separator)
        .addActionRowComponents((actionRow) =>
          actionRow.setComponents(
            new ButtonBuilder()
              .setCustomId(`torre_risk_${userId}_${bet}_${current}`)
              .setLabel("⚡ Arriesgar")
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId(`torre_cashout_${userId}_${bet}_${current}`)
              .setLabel("💰 Cobrar")
              .setStyle(ButtonStyle.Success)
          )
        );

      await interaction.update({
        components: [winContainer],
        flags: MessageFlags.IsComponentsV2,
      });

    } else {
      await transactionService.logTransaction({
        discordId: userId,
        type: "game",
        amount: 0
      });

      // El cooldown se aplicó al inicio en interactionCreate.js

      const loseContainer = new ContainerBuilder()
        .setAccentColor(0xff4500)
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `### 💥 Todo perdido\n` +
            `La torre colapsó. Perdiste **${config.emojis.coin}${current.toLocaleString("es-DO")}** créditos.`
          )
        );

      await interaction.update({
        components: [loseContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }
    return true;
  }

  if (action === "cashout") {
    await userService.addBalance(userId, current);

    await transactionService.logTransaction({
      discordId: userId,
      type: "game",
      amount: current
    });

    // El cooldown se aplicó al inicio en interactionCreate.js

    const cashoutContainer = new ContainerBuilder()
      .setAccentColor(0x32cd32)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `### 💰 Cobro realizado\n` +
          `Decidiste retirarte a tiempo.\nHas conservado **${config.emojis.coin}${current.toLocaleString("es-DO")}** créditos.`
        )
      );

    await interaction.update({
      components: [cashoutContainer],
      flags: MessageFlags.IsComponentsV2,
    });

    return true;
  }

  return false;
};