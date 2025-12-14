const { SlashCommandBuilder, MessageFlags } = require("discord.js");

const config = require("../../core.json");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  // Cooldown simple para que lo maneje interactionCreate.js
  cooldown: GAME_COOLDOWN,
  data: new SlashCommandBuilder()
    .setName("cara-cruz")
    .setDescription("Cara o cruz con apuesta.")
    .addIntegerOption(option =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de créditos a apostar")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("eleccion")
        .setDescription("Cara o cruz")
        .setRequired(true)
        .addChoices(
          { name: "Cara", value: "heads" },
          { name: "Cruz", value: "tails" }
        )
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
    } catch {
      // Si falla por balance, eliminamos el cooldown que se aplicó en interactionCreate.js
      interaction.client.cooldowns.get(module.exports.data.name).delete(userId);
      return interaction.reply({
        content: "No tienes suficientes créditos.",
        flags: MessageFlags.Ephemeral
      });
    }

    const choice = interaction.options.getString("eleccion");
    const choiceText = choice === "heads" ? "`CARA`" : "`CRUZ`";

    // Mensaje inicial
    const msg = await interaction.reply({
      content: `Apostaste ${config.emojis.coin}${bet.toLocaleString("es-DO")} a **${choiceText}**. Lanzando moneda...`
    });

    await sleep(3000);

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const resultText = result === "heads" ? "`CARA`" : "`CRUZ`";

    if (result === choice) {
      const reward = bet * 2;
      await userService.addBalance(userId, reward);

      await transactionService.logTransaction({
        discordId: userId,
        type: "game",
        amount: reward
      });

      await interaction.editReply({
        content: `Apostaste ${config.emojis.coin}${bet.toLocaleString("es-DO")} a **${choiceText}**. Lanzando moneda... **${resultText}** ¡ganaste **${config.emojis.coin}${reward.toLocaleString("es-DO")}**!`
      });

    } else {
      await transactionService.logTransaction({
        discordId: userId,
        type: "game",
        amount: 0
      });

      await interaction.editReply({
        content: `Apostaste ${config.emojis.coin}${bet.toLocaleString("es-DO")} a **${choiceText}**. Lanzando moneda... **${resultText}** no tuviste suerte.`
      });
    }
  }
};