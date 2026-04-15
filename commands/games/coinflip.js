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
      .setDescription("Heads or tails. The classic.")
      .addIntegerOption(o =>
          o.setName("amount")
              .setDescription(`Coins to bet (max ${MAX_BET.toLocaleString()})`)
              .setRequired(true)
              .setMinValue(1)
              .setMaxValue(MAX_BET)
      )
      .addStringOption(o =>
          o.setName("choice")
              .setDescription("Heads or tails")
              .setRequired(true)
              .addChoices(
                  { name: "Heads", value: "heads" },
                  { name: "Tails", value: "tails" }
              )
      ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("amount");
    const choice = interaction.options.getString("choice");
    const choiceLabel = choice === "heads" ? "HEADS" : "TAILS";

    await userService.createUser(userId, interaction.user.username);

    try {
      await userService.addBalance(userId, -bet, false);
    } catch {
      interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
      return interaction.reply({ content: "You don't have enough coins for that bet.", flags: MessageFlags.Ephemeral });
    }

    const { resource } = await interaction.reply({
      content: `You bet ${COIN}${bet.toLocaleString()} on **${choiceLabel}**... flipping...`,
      withResponse: true,
    });

    await sleep(3000);

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const resultLabel = result === "heads" ? "HEADS" : "TAILS";
    const won = result === choice;

    if (won) {
      const reward = bet * 2;
      await userService.addBalance(userId, reward, false);
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: reward });
      await resource.message.edit(`You bet ${COIN}${bet.toLocaleString()} on **${choiceLabel}**... **${resultLabel}** — you won ${COIN}${reward.toLocaleString()}. Not bad.`);
    } else {
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });
      await resource.message.edit(`You bet ${COIN}${bet.toLocaleString()} on **${choiceLabel}**... **${resultLabel}** — you lost. That stings.`);
    }
  }
};