const { SlashCommandBuilder, ButtonStyle, MessageFlags, ContainerBuilder, ButtonBuilder } = require("discord.js");
const config = require("../../core.json");
const userService = require("../../services/userService");
const cooldownService = require("../../services/memoryCooldownService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;

module.exports = {
  // 1. COOLDOWN: Ahora manejado por interactionCreate.js
  cooldown: GAME_COOLDOWN,
  data: new SlashCommandBuilder()
    .setName("giftbox")
    .setDescription("Triplica tu apuesta eligiendo la caja sorpresa correcta")
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
      return interaction.reply({
        content: "No tienes suficientes créditos.",
        flags: MessageFlags.Ephemeral
      });
    }

    const giftBoxContainer = new ContainerBuilder()
      .setAccentColor(2895667)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `### 🎁 ¡Prueba tu suerte!\n` +
          `Apostaste: **${config.emojis.coin}${bet.toLocaleString("es-DO")}**. Si eliges la caja correcta te ganas el triple. ¡Buena suerte!`
        )
      )
      .addSeparatorComponents((separator) => separator)

      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId(`giftbox_chest_1_${userId}_${bet}`)
            .setEmoji("🎁")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`giftbox_chest_2_${userId}_${bet}`)
            .setEmoji("🎁")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`giftbox_chest_3_${userId}_${bet}`)
            .setEmoji("🎁")
            .setStyle(ButtonStyle.Secondary)
        )
      );

    await interaction.reply({
      components: [giftBoxContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  }
};

module.exports.buttonHandler = async (interaction) => {
  if (!interaction.isButton()) return false;
  const parts = interaction.customId.split("_");
  const type = parts[1];
  const choice = parts[2];
  const userId = parts[3];
  const bet = parseInt(parts[4], 10);

  if (type === "chest") {
    const winningChest = Math.floor(Math.random() * 3) + 1;

    if (parseInt(choice, 10) === winningChest) {
      const reward = bet * 3;
      const formatted = reward.toLocaleString("es-DO");

      const winContainer = new ContainerBuilder()
        .setAccentColor(0x32cd32) // Verde
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `### 🎉 ¡Ganaste!\n` +
            `¡Muy bien! Elegiste la caja correcta y has ganado **${config.emojis.coin}${formatted}**. ¡Sigue jugando!`
          )
        )

      await interaction.update({
        components: [winContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      const loseContainer = new ContainerBuilder()
        .setAccentColor(0xff4500) // Rojo
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `### ❌ ¡Perdiste!\n` +
            `El premio estaba en la caja **${winningChest}**. Has perdido **${config.emojis.coin}${bet.toLocaleString("es-DO")}**. ¡Vuelve a intentarlo!`
          )
        );

      await interaction.update({
        components: [loseContainer],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    return true;
  }

  return false;
};