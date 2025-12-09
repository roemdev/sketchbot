const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../core.json");
const userService = require("../../services/userService");
const cooldownService = require("../../services/memoryCooldownService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;

module.exports = {
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
    const now = Math.floor(Date.now() / 1000);

    const cd = await cooldownService.checkCooldown(userId, "giftbox");
    if (cd) {
      const resetTimestamp = now + cd;
      return interaction.reply({
        embeds: [
          makeEmbed(
            "info",
            "Cooldown activo",
            `⏱ Debes esperar <t:${resetTimestamp}:R> para volver a usar /giftbox.`
          )
        ]
      });
    }

    if (bet <= 0) {
      return interaction.reply({
        embeds: [makeEmbed("error", "Apuesta inválida", "La cantidad debe ser mayor que cero.")],
        flags: MessageFlags.Ephemeral
      });
    }

    await userService.createUser(userId, username);

    // Intentar descontar la apuesta
    try {
      await userService.addBalance(userId, -bet);
    } catch (err) {
      return interaction.reply({
        embeds: [makeEmbed("error", "Créditos insuficientes", "No tienes suficientes créditos.")],
        flags: MessageFlags.Ephemeral
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giftbox_chest_1_${userId}_${bet}`)
        .setEmoji("🎁")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`giftbox_chest_2_${userId}_${bet}`)
        .setEmoji("🎁")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`giftbox_chest_3_${userId}_${bet}`)
        .setEmoji("🎁")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [
        makeEmbed(
          "base",
          "GiftBox",
          `Apuesta: **${config.emojis.coin}${bet.toLocaleString("es-DO")}** Te toca elegir una caja. ¡Buena suerte!`
        )
      ],
      components: [row]
    });
  }
};

module.exports.buttonHandler = async (interaction) => {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("giftbox_")) return false;

  const parts = interaction.customId.split("_");
  const type = parts[1];
  const choice = parts[2];
  const userId = parts[3];
  const bet = parseInt(parts[4], 10);

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "Esto no es tu juego.", flags: MessageFlags.Ephemeral });
  }

  if (type === "chest") {
    const winningChest = Math.floor(Math.random() * 3) + 1;

    if (parseInt(choice, 10) === winningChest) {
      const reward = bet * 3;
      const formatted = reward.toLocaleString("es-DO");

      await userService.addBalance(userId, reward);

      await transactionService.logTransaction({
        discordId: userId,
        type: "game",
        amount: reward
      });

      await cooldownService.setCooldown(userId, "giftbox", GAME_COOLDOWN);

      await interaction.update({
        embeds: [
          makeEmbed(
            "success",
            "¡Ganaste!",
            `Elegiste la caja correcta y duplicaste tu apuesta. Has ganado **${config.emojis.coin}${formatted}**`
          )
        ],
        components: []
      });
    } else {
      await transactionService.logTransaction({
        discordId: userId,
        type: "game",
        amount: 0
      });

      await interaction.update({
        embeds: [
          makeEmbed(
            "error",
            "¡Perdiste!",
            `Esta vez no fue la caja correcta. Has perdido **${config.emojis.coin}${bet.toLocaleString("es-DO")}**`
          )
        ],
        components: []
      });
    }

    return true;
  }

  return false;
};
