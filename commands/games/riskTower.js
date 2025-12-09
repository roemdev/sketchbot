const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../core.json");
const userService = require("../../services/userService");
const cooldownService = require("../../services/memoryCooldownService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;

module.exports = {
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
    const now = Math.floor(Date.now() / 1000);

    const cd = await cooldownService.checkCooldown(userId, "tower");
    if (cd) {
      const resetTimestamp = now + cd;
      return interaction.reply({
        embeds: [
          makeEmbed(
            "info",
            "Cooldown activo",
            `⏱ Debes esperar <t:${resetTimestamp}:R> para volver a jugar.`
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

    try {
      await userService.addBalance(userId, -bet);
    } catch {
      return interaction.reply({
        embeds: [makeEmbed("error", "Créditos insuficientes", "No tienes suficientes créditos.")],
        flags: MessageFlags.Ephemeral
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tower_risk_${userId}_${bet}_${bet}`)
        .setLabel("⚡ Arriesgar")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`tower_cashout_${userId}_${bet}_${bet}`)
        .setLabel("💰 Cobrar")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      embeds: [
        makeEmbed(
          "base",
          "Torre de riesgo",
          `Apuesta inicial: **${config.emojis.coin}${bet.toLocaleString("es-DO")}**\nSaldo en juego: **${config.emojis.coin}${bet.toLocaleString("es-DO")}**`
        )
      ],
      components: [row]
    });
  }
};

module.exports.buttonHandler = async (interaction) => {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("tower_")) return false;

  const parts = interaction.customId.split("_");
  const action = parts[1];
  const userId = parts[2];
  const bet = parseInt(parts[3], 10);
  let current = parseInt(parts[4], 10);

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "Esto no es tu juego.", flags: MessageFlags.Ephemeral });
  }

  if (action === "risk") {
    const win = Math.random() < 0.7;

    if (win) {
      current = current * 2;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`tower_risk_${userId}_${bet}_${current}`)
          .setLabel("⚡ Arriesgar")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`tower_cashout_${userId}_${bet}_${current}`)
          .setLabel("💰 Cobrar")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.update({
        embeds: [
          makeEmbed(
            "success",
            "¡Subiste un nivel! 🗼",
            `Tu saldo en juego se ha duplicado. Total actual: **${config.emojis.coin}${current.toLocaleString("es-DO")}**`
          )
        ],
        components: [row]
      });

    } else {
      await transactionService.logTransaction({
        discordId: userId,
        type: "game",
        amount: 0
      });

      await cooldownService.setCooldown(userId, "tower", GAME_COOLDOWN);

      await interaction.update({
        embeds: [
          makeEmbed(
            "error",
            "Todo perdido 💥",
            `La torre colapsó. Perdiste **${config.emojis.coin}${current.toLocaleString("es-DO")}** créditos.`
          )
        ],
        components: []
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

    await cooldownService.setCooldown(userId, "tower", GAME_COOLDOWN);

    await interaction.update({
      embeds: [
        makeEmbed(
          "success",
          "Cobro realizado 💰",
          `Decidiste retirarte a tiempo.\nHas conservado **${config.emojis.coin}${current.toLocaleString("es-DO")}** créditos.`
        )
      ],
      components: []
    });

    return true;
  }

  return false;
};