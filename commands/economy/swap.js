const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ContainerBuilder
} = require("discord.js");
const userService = require("../../services/userService");
const { sendCommand } = require("../../services/minecraftService");
const transactionService = require("../../services/transactionService");
const { isValidMinecraftNick } = require("../../utils/validation");
const config = require("../../core.json");

const RATE = config.economy.exchangeRate;
const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("swap")
    .setDescription("Convierte tus monedas a CobbleDollars en Minecraft")
    .addIntegerOption((opt) =>
      opt.setName("monedas").setDescription("Cantidad de monedas a convertir").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("nick").setDescription("Tu nick exacto en Minecraft").setRequired(true)
    ),

  async execute(interaction) {
    const monedas = interaction.options.getInteger("monedas");
    const mcNick = (interaction.options.getString("nick") || "").trim();

    if (!isValidMinecraftNick(mcNick)) {
      return interaction.reply({
        content: "❌ Hmm, ese nick no parece de Minecraft. Escríbelo bien y vuelve a intentarlo.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (monedas <= 0) {
      return interaction.reply({
        content: "❌ Ups... ¡Necesitas ingresar más de cero monedas para hacer magia!",
        flags: MessageFlags.Ephemeral,
      });
    }

    const user = await userService.getUser(interaction.user.id);
    if (!user) {
      return interaction.reply({
        content: "❌ ¡No tienes perfil! Escribe algún otro comando primero o algo.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (user.balance < monedas) {
      return interaction.reply({
        content: `❌ Uy, andas corto. No tienes **${monedas.toLocaleString()}** ${COIN} monedas.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const cobble = Math.floor(monedas / RATE);
    if (cobble <= 0) {
      return interaction.reply({
        content: `❌ Para conseguir al menos 1 C$, necesitas subir la cantidad de monedas. La tasa es ${RATE.toLocaleString()} ${COIN}.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const container = new ContainerBuilder()
      .setAccentColor(0x5B7FA6)
      .addTextDisplayComponents(t =>
        t.setContent(`### 🔄 ¿Listo para el canje?\nEstás a punto de enviar:\n\n**${monedas.toLocaleString()}** ${COIN} ➡️ **${cobble.toLocaleString()}** C$\nPara la cuenta de: **${mcNick}**`)
      )
      .addSeparatorComponents((s) => s)
      .addActionRowComponents((row) =>
        row.setComponents(
          new ButtonBuilder()
            .setCustomId(`swap_confirm_${monedas}_${mcNick}`)
            .setLabel("¡Dale, confirmo!")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`swap_cancel_${monedas}_${mcNick}`)
            .setLabel("Me arrepentí")
            .setStyle(ButtonStyle.Danger)
        )
      );

    return interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("swap_")) return false;

    const [, action, monedasStr, ...nickParts] = interaction.customId.split("_");
    const monedas = parseInt(monedasStr, 10);
    const mcNick = nickParts.join("_");
    const cobble = Math.floor(monedas / RATE);

    if (action === "cancel") {
      return interaction.update({
        content: "ℹ️ Conversión cancelada. Tus monedas están a salvo... por ahora.",
        components: [],
      });
    }

    if (action === "confirm") {
      if (!isValidMinecraftNick(mcNick)) {
        return interaction.update({
          content: "❌ Hmm, ese nick no parece de Minecraft.",
          components: [],
        });
      }

      const user = await userService.getUser(interaction.user.id);
      if (!user) {
        return interaction.update({
          content: "❌ ¡No tienes perfil!",
          components: [],
        });
      }

      if (user.balance < monedas) {
        return interaction.update({
          content: "❌ ¿Eh? Parece que se te acabaron las monedas entre que abriste el menú y ahora.",
          components: [],
        });
      }

      await userService.removeBalance(interaction.user.id, monedas, false);

      try {
        await sendCommand(`cobbledollars give ${mcNick} ${cobble}`);
      } catch {
        return interaction.update({
          content: "❌ ¡Algo explotó conectando con Minecraft! Habla con los admins de inmediato.",
          components: [],
        });
      }

      await transactionService.logTransaction({
        discordId: interaction.user.id,
        type: "swap",
        mcNick,
        amount: monedas,
        totalPrice: cobble,
      });

      return interaction.update({
        content: `✅ ¡Mágico! Cambiaste **${monedas.toLocaleString()}** ${COIN} por **${cobble.toLocaleString()}** C$ para la cuenta de **${mcNick}**. A disfrutar.`,
        components: [],
      });
    }

    return false;
  },
};
