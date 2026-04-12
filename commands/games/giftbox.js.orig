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
      .setDescription("Triplica tu apuesta eligiendo la caja sorpresa correcta.")
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

    try {
      await userService.addBalance(userId, -bet, false);
    } catch {
      return interaction.reply({ content: "No tienes suficientes créditos.", flags: MessageFlags.Ephemeral });
    }

    const container = new ContainerBuilder()
        .setAccentColor(0x9b59b6)
        .addTextDisplayComponents(t =>
            t.setContent(
                `### 🎁 ¡Prueba tu suerte!\n` +
                `Pusiste en juego ${COIN}**${bet.toLocaleString()}**.\n` +
                `Una de estas cajas esconde el **triple** de tu apuesta. Escoge con sabiduría...`
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

    await interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
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
        .setAccentColor(0x32cd32)
        .addTextDisplayComponents(t =>
            t.setContent(`### 🎉 ¡Ganaste!\nElegiste la caja correcta y ganaste ${COIN}**${reward.toLocaleString()}**. ¡Sigue jugando!`)
        );

    return interaction.update({ components: [winContainer], flags: MessageFlags.IsComponentsV2 });
  } else {
    await transactionService.logTransaction({ discordId: userId, type: "game", amount: 0 });

    const loseContainer = new ContainerBuilder()
        .setAccentColor(0xff4500)
        .addTextDisplayComponents(t =>
            t.setContent(`### ❌ ¡Perdiste!\nEl premio estaba en la caja **${winningChest}**. Perdiste ${COIN}**${bet.toLocaleString()}**. ¡Vuelve a intentarlo!`)
        );

    return interaction.update({ components: [loseContainer], flags: MessageFlags.IsComponentsV2 });
  }
};