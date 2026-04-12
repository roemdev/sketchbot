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
      return interaction.reply({ content: "❌ ¡Casi! Pero no puedes apostar menos de una moneda.", flags: MessageFlags.Ephemeral });
    }

    await userService.createUser(userId, interaction.user.username);

    const currentBalance = await userService.getBalance(userId);
    if (currentBalance < bet) {
      interaction.client.cooldowns.get(module.exports.data.name)?.delete(userId);
      return interaction.reply({ content: "❌ ¡Ey! Estás intentando apostar dinero que no tienes. Ve a trabajar un rato.", flags: MessageFlags.Ephemeral });
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
      .setAccentColor(0x6C3483)
      .addTextDisplayComponents(t =>
          t.setContent(
              `### 🗼 Escalando la Torre del Peligro\n` +
              `Pusiste en la mesa: **${bet.toLocaleString()}** ${COIN}\n` +
              `Saldo en juego ahora: **${current.toLocaleString()}** ${COIN}`
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
    return interaction.reply({ content: "👀 Shh, no toques botones en la torre de otra persona.", flags: MessageFlags.Ephemeral });
  }

  if (action === "risk") {
    if (Math.random() < 0.4) {
      const next = current * 1.25;

      const winContainer = new ContainerBuilder()
          .setAccentColor(0xF4C542)
          .addTextDisplayComponents(t =>
              t.setContent(
                  `### 🚀 ¡Nivel superado, sigues vivo!\n` +
                  `La adrenalina sube, tu dinero también. Llevas **${next.toLocaleString()}** ${COIN}. ¿Te arriesgas otra vez o te rajas?`
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
          .setAccentColor(0xC0392B)
          .addTextDisplayComponents(t =>
              t.setContent(`### 💥 ¡Booooom! Caída libre\nLa torre no aguantó y colapsó frente a ti. Acabas de perder **${current.toLocaleString()}** ${COIN}. Suerte a la próxima, si te atreves.`)
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
            t.setContent(`### 💰 ¡Retirada estratégica!\nCobraste antes de que todo se viniera abajo. Te llevas a casa **${current.toLocaleString()}** ${COIN} enteritos.`)
        );

    return interaction.update({ components: [cashoutContainer], flags: MessageFlags.IsComponentsV2 });
  }

  return false;
};
