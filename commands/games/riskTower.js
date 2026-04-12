const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../core.json");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;
const COIN = config.emojis.coin;

module.exports = {
  cooldown: GAME_COOLDOWN,
  data: new SlashCommandBuilder()
      .setName("torre")
      .setDescription("Juego de torre con riesgo progresivo.")
      .addIntegerOption(option =>
          option.setName("cantidad").setDescription("Cantidad de créditos a apostar").setRequired(true)
      ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const bet = interaction.options.getInteger("cantidad");

    if (bet <= 0) {
      return interaction.reply({ content: "La cantidad debe ser mayor que cero.", flags: MessageFlags.Ephemeral });
    }

    await userService.createUser(userId, interaction.user.username);

    const currentBalance = await userService.getBalance(userId);
    if (currentBalance < bet) {
      interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
      return interaction.reply({ content: "❌ No tienes suficientes créditos.", flags: MessageFlags.Ephemeral });
    }

    await userService.addBalance(userId, -bet, false);

    await interaction.reply({
      components: [buildTowerPanel(userId, bet, bet)],
      flags: MessageFlags.IsComponentsV2,
    });
  }
};

function buildTowerPanel(userId, bet, current) {
  return new ContainerBuilder()
      .setAccentColor(0x9b59b6)
      .addTextDisplayComponents(t =>
          t.setContent(
              `### 🗼 Torre de Riesgo\n` +
              `Apuesta inicial: ${COIN}**${bet.toLocaleString()}**\n` +
              `Saldo en juego: ${COIN}**${current.toLocaleString()}**`
          )
      )
      .addSeparatorComponents(s => s)
      .addActionRowComponents(row =>
          row.setComponents(
              new ButtonBuilder()
                  .setCustomId(`torre_risk_${userId}_${bet}_${current}`)
                  .setLabel("⚡ Arriesgar")
                  .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                  .setCustomId(`torre_cashout_${userId}_${bet}_${current}`)
                  .setLabel("💰 Cobrar")
                  .setStyle(ButtonStyle.Success)
          )
      );
}

module.exports.buttonHandler = async (interaction) => {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("torre_")) return false;

  const parts = interaction.customId.split("_");
  const action = parts[1];
  const userId = parts[2];
  const bet = parseInt(parts[3], 10);
  const current = parseFloat(parts[4]);

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: "Esto no es tu juego.", flags: MessageFlags.Ephemeral });
  }

  if (action === "risk") {
    if (Math.random() < 0.4) {
      const next = current * 1.25;

      const winContainer = new ContainerBuilder()
          .setAccentColor(0x32cd32)
          .addTextDisplayComponents(t =>
              t.setContent(
                  `### 🚀 ¡Subiste un nivel!\n` +
                  `Tu saldo se ha multiplicado. Total actual: ${COIN}**${next.toLocaleString()}**`
              )
          )
          .addSeparatorComponents(s => s)
          .addActionRowComponents(row =>
              row.setComponents(
                  new ButtonBuilder().setCustomId(`torre_risk_${userId}_${bet}_${next}`).setLabel("⚡ Arriesgar").setStyle(ButtonStyle.Danger),
                  new ButtonBuilder().setCustomId(`torre_cashout_${userId}_${bet}_${next}`).setLabel("💰 Cobrar").setStyle(ButtonStyle.Success)
              )
          );

      return interaction.update({ components: [winContainer], flags: MessageFlags.IsComponentsV2 });
    } else {
      await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });

      const loseContainer = new ContainerBuilder()
          .setAccentColor(0xff4500)
          .addTextDisplayComponents(t =>
              t.setContent(`### 💥 Todo perdido\nLa torre colapsó. Perdiste ${COIN}**${current.toLocaleString()}** créditos.`)
          );

      return interaction.update({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
    }
  }

  if (action === "cashout") {
    await userService.addBalance(userId, current, false);
    await transactionService.logTransaction({ discordId: userId, type: "game", amount: current });

    const cashoutContainer = new ContainerBuilder()
        .setAccentColor(0x32cd32)
        .addTextDisplayComponents(t =>
            t.setContent(`### 💰 Cobro realizado\nTe retiraste a tiempo. Conservaste ${COIN}**${current.toLocaleString()}** créditos.`)
        );

    return interaction.update({ components: [cashoutContainer], flags: MessageFlags.IsComponentsV2 });
  }

  return false;
};