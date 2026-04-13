const { SlashCommandBuilder, MessageFlags } = require("discord.js");
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
      .setDescription("Cara o cruz. El clásico.")
      .addIntegerOption(o => o.setName("cantidad").setDescription("Monedas a apostar").setRequired(true))
      .addStringOption(o =>
          o.setName("eleccion").setDescription("Cara o cruz").setRequired(true)
              .addChoices({ name: "Cara", value: "heads" }, { name: "Cruz", value: "tails" })
      ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("cantidad");

    if (bet <= 0) {
      return interaction.reply({ content: "La apuesta tiene que ser mayor a 0.", flags: MessageFlags.Ephemeral });
    }

    await userService.createUser(userId, interaction.user.username);

    try {
      await userService.addBalance(userId, -bet, false);
    } catch {
      interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
      return interaction.reply({ content: "No tienes suficientes monedas para esa apuesta.", flags: MessageFlags.Ephemeral });
    }

    const choice = interaction.options.getString("eleccion");
    const choiceText = choice === "heads" ? "CARA" : "CRUZ";

    const { resource } = await interaction.reply({
      content: `Apostaste ${COIN}${bet.toLocaleString()} a **${choiceText}**... girando...`,
      withResponse: true,
    });

    const msg = resource.message;
    await sleep(3000);

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const resultText = result === "heads" ? "CARA" : "CRUZ";
    const won = result === choice;

    if (won) {
      const reward = bet * 2;
      await userService.addBalance(userId, reward, false);
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: reward });
      await msg.edit(`Apostaste ${COIN}${bet.toLocaleString()} a **${choiceText}**... **${resultText}** — ganaste ${COIN}${reward.toLocaleString()}. Nada mal.`);
    } else {
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });
      await msg.edit(`Apostaste ${COIN}${bet.toLocaleString()} a **${choiceText}**... **${resultText}** — perdiste. Eso dolió.`);
    }
  }
};