const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const userService = require("../../services/userService");
const { sendCommand } = require("../../services/minecraftService");
const transactionService = require("../../services/transactionService");
const { makeContainer, CV2, CV2_EPHEMERAL } = require("../../utils/ui");
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
        components: [makeContainer("error", null, "El nickname de Minecraft proporcionado no es válido.")],
        flags: CV2_EPHEMERAL,
      });
    }

    if (monedas <= 0) {
      return interaction.reply({
        components: [makeContainer("error", null, "La cantidad debe ser mayor a 0.")],
        flags: CV2_EPHEMERAL,
      });
    }

    const user = await userService.getUser(interaction.user.id);
    if (!user) {
      return interaction.reply({
        components: [makeContainer("error", null, "No tienes un perfil creado.")],
        flags: CV2_EPHEMERAL,
      });
    }

    if (user.balance < monedas) {
      return interaction.reply({
        components: [makeContainer("error", null, "No tienes suficientes monedas para realizar este swap.")],
        flags: CV2_EPHEMERAL,
      });
    }

    const cobble = Math.floor(monedas / RATE);
    if (cobble <= 0) {
      return interaction.reply({
        components: [makeContainer("error", null, "Debes ingresar una cantidad mayor para generar al menos 1 C$.")],
        flags: CV2_EPHEMERAL,
      });
    }

    const container = makeContainer(
      "info",
      "Confirmar conversión",
      `Monedas a convertir: **${COIN}${monedas.toLocaleString()}**\nCobbledollars a recibir: **C$${cobble.toLocaleString()}**\nJugador que recibe: **${mcNick}**`
    )
      .addSeparatorComponents((s) => s)
      .addActionRowComponents((row) =>
        row.setComponents(
          new ButtonBuilder()
            .setCustomId(`swap_confirm_${monedas}_${mcNick}`)
            .setLabel("Confirmar")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`swap_cancel_${monedas}_${mcNick}`)
            .setLabel("Cancelar")
            .setStyle(ButtonStyle.Danger)
        )
      );

    return interaction.reply({ components: [container], flags: CV2_EPHEMERAL });
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
        components: [makeContainer("info", "Cancelado", "No se procesó ninguna transacción.")],
        flags: CV2,
      });
    }

    if (action === "confirm") {
      if (!isValidMinecraftNick(mcNick)) {
        return interaction.update({
          components: [makeContainer("error", null, "El nickname de Minecraft no es válido.")],
          flags: CV2,
        });
      }

      const user = await userService.getUser(interaction.user.id);
      if (!user) {
        return interaction.update({
          components: [makeContainer("error", null, "No tienes un perfil creado.")],
          flags: CV2,
        });
      }

      if (user.balance < monedas) {
        return interaction.update({
          components: [makeContainer("error", null, "Ya no tienes suficientes monedas para completar esta transacción.")],
          flags: CV2,
        });
      }

      await userService.removeBalance(interaction.user.id, monedas, false);

      try {
        await sendCommand(`cobbledollars give ${mcNick} ${cobble}`);
      } catch {
        return interaction.update({
          components: [makeContainer("error", null, "Error enviando los C$ a Minecraft. Contacta a un administrador.")],
          flags: CV2,
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
        components: [makeContainer("success", "Transacción completada", `Se convirtieron **${COIN}${monedas.toLocaleString()}** → **C$${cobble.toLocaleString()}** para **${mcNick}**.`)],
        flags: CV2,
      });
    }

    return false;
  },
};
