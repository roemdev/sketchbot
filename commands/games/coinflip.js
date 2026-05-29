const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const config = require("../../utils/config");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown;
const COIN = config.emojis.coin;
const MAX_BET = config.games.maxBet;

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
      await userService.addBalance("server_casino", bet, false);
      await transactionService.logTransaction({ discordId: "server_casino", type: "bank_deposit", amount: bet, itemName: `Apuesta Cara/Cruz de <@${userId}>` });
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
      const profit = reward - bet;
      const taxAmount = Math.floor(profit * config.games.winTaxRate);
      const finalReward = reward - taxAmount;

      await userService.addBalance(userId, finalReward, false);
      await userService.addBalance("server_casino", -finalReward, false);
      await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -finalReward, itemName: `Pago Cara/Cruz a <@${userId}>` });
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: finalReward });

      if (taxAmount > 0) {
        await userService.addBalance("server_casino", -taxAmount, false);
        await userService.addBalance("server_bank", taxAmount, false);
        await transactionService.logTransaction({
          discordId: "server_casino",
          type: "bank_withdrawal",
          amount: -taxAmount,
          itemName: `Impuesto del ${(config.games.winTaxRate * 100).toFixed(0)}% pagado al Banco`
        });
        await transactionService.logTransaction({
          discordId: "server_bank",
          type: "bank_tax",
          amount: taxAmount,
          itemName: `Impuesto sobre apuesta de <@${userId}>`
        });
      }

      await resource.message.edit(
        `Apostaste ${COIN}${bet.toLocaleString()} a **${choiceLabel}**... salió **${resultLabel}**. ` +
        `Ganaste ${COIN}${finalReward.toLocaleString()}` +
        (taxAmount > 0 ? ` (Impuesto de ${(config.games.winTaxRate * 100).toFixed(0)}%: -${COIN}${taxAmount.toLocaleString()})` : "") +
        `. Nada mal.`
      );
    } else {
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });

      // Impuesto de pérdida (20%) pagado al banco central
      const casinoTax = Math.floor(bet * config.games.loseTaxRate);
      if (casinoTax > 0) {
        await userService.addBalance("server_casino", -casinoTax, false);
        await userService.addBalance("server_bank", casinoTax, false);
        await transactionService.logTransaction({ discordId: "server_bank", type: "bank_tax", amount: casinoTax, itemName: `Impuesto ${(config.games.loseTaxRate * 100).toFixed(0)}% pérdida Cara/Cruz de <@${userId}>` });
        await transactionService.logTransaction({ discordId: "server_casino", type: "bank_withdrawal", amount: -casinoTax, itemName: `Impuesto del ${(config.games.loseTaxRate * 100).toFixed(0)}% pagado al Banco` });
      }

      await resource.message.edit(`Apostaste ${COIN}${bet.toLocaleString()} a **${choiceLabel}**... salió **${resultLabel}**. Perdiste. Duele.`);
    }
  }
};