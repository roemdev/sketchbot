const { SlashCommandBuilder, ButtonStyle, MessageFlags, ContainerBuilder, ButtonBuilder } = require("discord.js");
const config = require("../../core.json");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");

const GAME_COOLDOWN = config.game.cooldown || 20;
const COIN = config.emojis.coin;

module.exports = {
  cooldown: GAME_COOLDOWN,
  data: new SlashCommandBuilder()
      .setName("giftbox")
      .setDescription("Una de tres cajas tiene el triple de tu apuesta. ¿Cuál es?")
      .addIntegerOption(o => o.setName("cantidad").setDescription("Monedas a apostar").setRequired(true)),

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
      return interaction.reply({ content: "No tienes suficientes monedas para esa apuesta.", flags: MessageFlags.Ephemeral });
    }

    const container = new ContainerBuilder()
        .setAccentColor(0x6C3483)
        .addTextDisplayComponents(t =>
            t.setContent(
                `### 🎁 ¡Elige tu caja!\n` +
                `Pusiste en juego **${COIN}${bet.toLocaleString()}**.\n` +
                `Una de estas tres cajas tiene el **triple**. Las otras dos... no tanto. Elige bien.`
            )
        )
        .addSeparatorComponents(s => s)
        .addActionRowComponents(row =>
            row.setComponents(
                new ButtonBuilder().setCustomId(`giftbox_chest_1_${userId}_${bet}`).setEmoji("🎁").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`giftbox_chest_2_${userId}_${bet}`).setEmoji("🎁").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`giftbox_chest_3_${userId}_${bet}`).setEmoji("🎁").setStyle(ButtonStyle.Secondary),
            )
        );

    return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};

module.exports.buttonHandler = async (interaction) => {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("giftbox_chest_")) return false;

  const parts = interaction.customId.split("_");
  const choice = parseInt(parts[2], 10);
  const userId = parts[3];
  const bet = parseInt(parts[4], 10);
  const winningChest = Math.floor(Math.random() * 3) + 1;

  if (choice === winningChest) {
    const reward = bet * 3;
    await userService.addBalance(userId, reward, false);
    await transactionService.logTransaction({ discordId: userId, type: "game", amount: reward });

    const winContainer = new ContainerBuilder()
        .setAccentColor(0xF4C542)
        .addTextDisplayComponents(t =>
            t.setContent(`### 🎉 ¡Era esa!\nElegiste la caja correcta y te llevas **${COIN}${reward.toLocaleString()}**. Buen olfato.`)
        );

    return interaction.update({ components: [winContainer], flags: MessageFlags.IsComponentsV2 });
  } else {
    await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });

    const loseContainer = new ContainerBuilder()
        .setAccentColor(0xC0392B)
        .addTextDisplayComponents(t =>
            t.setContent(`### ❌ Mala suerte\nEl premio estaba en la caja **${winningChest}**. Se fueron **${COIN}${bet.toLocaleString()}**. La próxima confías más en tu instinto.`)
        );

    return interaction.update({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
  }
};