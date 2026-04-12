const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const config = require("../../core.json");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;
const COIN = config.emojis.coin;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  cooldown: GAME_COOLDOWN,
  data: new SlashCommandBuilder()
      .setName("cara-cruz")
      .setDescription("Cara o cruz con apuesta.")
      .addIntegerOption(option =>
          option.setName("cantidad").setDescription("Cantidad de créditos a apostar").setRequired(true)
      )
      .addStringOption(option =>
          option.setName("eleccion").setDescription("Cara o cruz").setRequired(true)
              .addChoices({ name: "Cara", value: "heads" }, { name: "Cruz", value: "tails" })
      ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("cantidad");

    if (bet <= 0) {
      return interaction.reply({
        content: "La cantidad debe ser mayor que cero.",
        flags: MessageFlags.Ephemeral
      });
    }

    await userService.createUser(userId, interaction.user.username);

    try {
      await userService.addBalance(userId, -bet, false);
    } catch {
      interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
      return interaction.reply({ content: "No tienes suficientes créditos.", flags: MessageFlags.Ephemeral });
    }

    const choice = interaction.options.getString("eleccion");
    const choiceText = choice === "heads" ? "CARA" : "CRUZ";

    const pendingContainer = new ContainerBuilder()
        .setAccentColor(0xf0c040)
        .addTextDisplayComponents(t =>
            t.setContent(`### 🪙 Cara o Cruz\nApostaste ${COIN}**${bet.toLocaleString()}** a **${choiceText}**.\nLanzando moneda...`)
        );

    await interaction.reply({ components: [pendingContainer], flags: MessageFlags.IsComponentsV2 });
    await sleep(3000);

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const resultText = result === "heads" ? "CARA" : "CRUZ";
    const won = result === choice;

    if (won) {
      const reward = bet * 2;
      await userService.addBalance(userId, reward, false);
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: reward });

      const winContainer = new ContainerBuilder()
          .setAccentColor(0x32cd32)
          .addTextDisplayComponents(t =>
              t.setContent(`### 🎉 ¡Ganaste!\nApostaste ${COIN}**${bet.toLocaleString()}** a **${choiceText}** — salió **${resultText}**.\nGanaste ${COIN}**${reward.toLocaleString()}**.`)
          );

      await interaction.editReply({ components: [winContainer], flags: MessageFlags.IsComponentsV2 });
    } else {
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });

      const loseContainer = new ContainerBuilder()
          .setAccentColor(0xff4500)
          .addTextDisplayComponents(t =>
              t.setContent(`### 💸 Perdiste\nApostaste ${COIN}**${bet.toLocaleString()}** a **${choiceText}** — salió **${resultText}**.\nMás suerte la próxima vez.`)
          );

      await interaction.editReply({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
    }
  }
};