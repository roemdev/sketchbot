const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, EmbedBuilder } = require("discord.js");
const userService = require("../../services/userService");
const { sendCommand } = require("../../services/minecraftService");
const transactionService = require("../../services/transactionService");
const config = require("../../../core.json");

const RATE = config.economy.exchangeRate;
const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("swap")
    .setDescription("Convierte tus monedas a CobbleDollars en Minecraft")
    .addIntegerOption(option =>
      option.setName("monedas")
        .setDescription("Cantidad de monedas a convertir")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("nick")
        .setDescription("Tu nick exacto en Minecraft")
        .setRequired(true)
    ),

  async execute(interaction) {
    const monedas = interaction.options.getInteger("monedas");
    const mcNick = interaction.options.getString("nick").trim();

    if (monedas <= 0) {
      return interaction.reply({
        content: "La cantidad debe ser mayor a 0.",
        flags: MessageFlags.Ephemeral
      });
    }

    const user = await userService.getUser(interaction.user.id);
    if (!user) {
      return interaction.reply({
        content: "No tienes un perfil creado.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (user.balance < monedas) {
      return interaction.reply({
        content: "No tienes suficientes monedas para realizar este swap.",
        flags: MessageFlags.Ephemeral
      });
    }

    const cobble = Math.floor(monedas / RATE);
    if (cobble <= 0) {
      return interaction.reply({
        content: "Debes ingresar una cantidad mayor para generar al menos 1 C$.",
        flags: MessageFlags.Ephemeral
      });
    }

    // Botones
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`swap_confirm_${monedas}_${mcNick}`)
        .setLabel("Confirmar")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`swap_cancel_${monedas}_${mcNick}`)
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle("Confirma la conversión")
      .setColor("Yellow")
      .setDescription(
        `Monedas a convertir: **${COIN}${monedas.toLocaleString()}**\n` +
        `Cobbledollars a recibir: **C$${cobble.toLocaleString()}**\n` +
        `Jugador que recibe: **${mcNick}**\n\n` +
        `¿Deseas continuar?`
      );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  }
};

// ------------------------------------------------------------
// BUTTON HANDLER (EDICIÓN DEL MISMO MENSAJE)
// ------------------------------------------------------------
module.exports.buttonHandler = async (interaction) => {
  if (!interaction.isButton()) return;

  const [prefix, action, monedasStr, ...nickParts] = interaction.customId.split("_");

  if (prefix !== "swap") return;

  const monedas = parseInt(monedasStr, 10);
  const mcNick = nickParts.join("_");
  const cobble = Math.floor(monedas / RATE);

  // Acción CANCELAR
  if (action === "cancel") {
    const cancelEmbed = new EmbedBuilder().setTitle("Transacción cancelada").setColor("Red")
    return interaction.update({ embeds: [cancelEmbed], components: [] });
  }

  // Acción CONFIRMAR
  if (action === "confirm") {
    const user = await userService.getUser(interaction.user.id);
    if (!user) {
      return interaction.update({
        embeds: [new EmbedBuilder()
          .setColor("Red")
          .setDescription("No tienes un perfil creado.")
        ],
        components: []
      });
    }

    if (user.balance < monedas) {
      return interaction.update({
        embeds: [new EmbedBuilder()
          .setColor("Red")
          .setDescription("Ya no tienes suficientes monedas para completar esta transacción.")
        ],
        components: []
      });
    }

    await userService.removeBalance(interaction.user.id, monedas);

    try {
      await sendCommand(`cobbledollars give ${mcNick} ${cobble}`);
    } catch (err) {
      return interaction.update({
        embeds: [new EmbedBuilder()
          .setColor("Red")
          .setDescription("Error enviando los C$ a Minecraft. Contacta a un administrador.")
        ],
        components: []
      });
    }

    await transactionService.logTransaction({
      discordId: interaction.user.id,
      type: "swap",
      mcNick,
      amount: monedas,
      totalPrice: cobble // aquí totalPrice son los C$ generados
    });

    const successEmbed = new EmbedBuilder().setTitle("Transacción completada").setColor("Green")
    return interaction.update({ embeds: [successEmbed], components: [] });
  }
};