const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../core.json");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;
const COIN = config.emojis.coin;
const MULTIPLIER = 1.25;
const MAX_BET = 100_000;

function nextValue(current) {
  return Math.floor(current * MULTIPLIER);
}

function buildTowerPanel(userId, bet, current) {
  return new ContainerBuilder()
      .setAccentColor(0x6C3483)
      .addTextDisplayComponents(t =>
          t.setContent(
              `### 🗼 Risk Tower\n` +
              `Initial bet: **${COIN}${bet.toLocaleString()}**\n` +
              `Currently at stake: **${COIN}${current.toLocaleString()}**\n\n` +
              `Each level multiplies by ${MULTIPLIER}x. Fall and you lose everything.`
          )
      )
      .addSeparatorComponents(s => s)
      .addActionRowComponents(row =>
          row.setComponents(
              new ButtonBuilder().setCustomId(`torre_risk_${userId}_${bet}_${current}`).setLabel("⚡ Risk it").setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId(`torre_cashout_${userId}_${bet}_${current}`).setLabel("💰 Cash out").setStyle(ButtonStyle.Success)
          )
      );
}

module.exports = {
  cooldown: GAME_COOLDOWN,
  data: new SlashCommandBuilder()
      .setName("torre")
      .setDescription("Climb the tower. Each level multiplies your bet, but one wrong step and you lose everything.")
      .addIntegerOption(o =>
          o.setName("amount")
              .setDescription(`Coins to bet (max ${MAX_BET.toLocaleString()})`)
              .setRequired(true)
              .setMinValue(1)
              .setMaxValue(MAX_BET)
      ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("amount");

    await userService.createUser(userId, interaction.user.username);

    const currentBalance = await userService.getBalance(userId);
    if (currentBalance < bet) {
      interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
      return interaction.reply({ content: "You don't have enough coins for that bet.", flags: MessageFlags.Ephemeral });
    }

    await userService.addBalance(userId, -bet, false);

    return interaction.reply({ components: [buildTowerPanel(userId, bet, bet)], flags: MessageFlags.IsComponentsV2 });
  }
};

module.exports.buttonHandler = async (interaction) => {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("torre_")) return false;

  const parts = interaction.customId.split("_");
  const action = parts[1];
  const userId = parts[2];
  const bet = parseInt(parts[3], 10);
  const current = parseInt(parts[4], 10);

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "That's not your tower.", flags: MessageFlags.Ephemeral });
  }

  if (action === "risk") {
    if (Math.random() < 0.9) {
      const next = nextValue(current);

      const winContainer = new ContainerBuilder()
          .setAccentColor(0xF4C542)
          .addTextDisplayComponents(t =>
              t.setContent(
                  `### 🚀 Level up!\n` +
                  `The tower holds. You now have **${COIN}${next.toLocaleString()}** at stake.\n` +
                  `Keep climbing or cash out?`
              )
          )
          .addSeparatorComponents(s => s)
          .addActionRowComponents(row =>
              row.setComponents(
                  new ButtonBuilder().setCustomId(`torre_risk_${userId}_${bet}_${next}`).setLabel("⚡ Risk it").setStyle(ButtonStyle.Danger),
                  new ButtonBuilder().setCustomId(`torre_cashout_${userId}_${bet}_${next}`).setLabel("💰 Cash out").setStyle(ButtonStyle.Success)
              )
          );

      return interaction.update({ components: [winContainer], flags: MessageFlags.IsComponentsV2 });
    } else {
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });

      const loseContainer = new ContainerBuilder()
          .setAccentColor(0xC0392B)
          .addTextDisplayComponents(t =>
              t.setContent(`### 💥 The tower collapsed\nOne step too many. You lost **${COIN}${current.toLocaleString()}**. That's life at height.`)
          );

      return interaction.update({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
    }
  }

  if (action === "cashout") {
    await userService.addBalance(userId, current, false);
    await transactionService.logTransaction({ discordId: userId, type: "game", amount: current });

    const cashoutContainer = new ContainerBuilder()
        .setAccentColor(0xF4C542)
        .addTextDisplayComponents(t =>
            t.setContent(`### 💰 Cashed out!\nYou knew when to step down. Taking **${COIN}${current.toLocaleString()}**. Smart move.`)
        );

    return interaction.update({ components: [cashoutContainer], flags: MessageFlags.IsComponentsV2 });
  }

  return false;
};