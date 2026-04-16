const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const config = require("../../core.json");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;
const COIN = config.emojis.coin;
const MAX_BET = 100_000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  cooldown: GAME_COOLDOWN,
  data: new SlashCommandBuilder()
      .setName("cara-cruz")
      .setDescription("Cara o cruz. El clásico.")
      .addIntegerOption(o =>
          o.setName("amount")
              .setDescription(`Monedas a apostar (máx ${MAX_BET.toLocaleString()})`)
              .setRequired(true)
              .setMinValue(1)
              .setMaxValue(MAX_BET)
      )
      .addStringOption(o =>
          o.setName("choice")
              .setDescription("Cara o cruz")
              .setRequired(true)
              .addChoices(
                  { name: "Cara", value: "heads" },
                  { name: "Cruz", value: "tails" }
              )
      ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("amount");
    const choice = interaction.options.getString("choice");
    const choiceLabel = choice === "heads" ? "CARA" : "CRUZ";

    await userService.createUser(userId, interaction.user.username);

    try {
      await userService.addBalance(userId, -bet, false);
    } catch {
      interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
      return interaction.reply({ content: "No tienes suficientes monedas para esa apuesta.", flags: MessageFlags.Ephemeral });
    }

    const { resource } = await interaction.reply({
      content: `Apostaste ${COIN}${bet.toLocaleString()} a **${choiceLabel}**... lanzando moneda...`,
      withResponse: true,
    });

    await sleep(3000);

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const resultLabel = result === "heads" ? "CARA" : "CRUZ";
    const won = result === choice;

    if (won) {
      const reward = bet * 2;
      await userService.addBalance(userId, reward, false);
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: reward });
      await resource.message.edit(`Apostaste ${COIN}${bet.toLocaleString()} a **${choiceLabel}**... salió **${resultLabel}**. Ganaste ${COIN}${reward.toLocaleString()}. Nada mal.`);
    } else {
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });
      await resource.message.edit(`Apostaste ${COIN}${bet.toLocaleString()} a **${choiceLabel}**... salió **${resultLabel}**. Perdiste. Duele.`);
    }
  }
};