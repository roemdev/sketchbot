const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../core.json");
const storeService = require("../../services/storeService");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("comprar")
    .setDescription("Compra un artículo de la tienda")
    .addStringOption(option =>
      option.setName("item")
        .setDescription("Nombre del artículo que deseas comprar")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("nick")
        .setDescription("Tu nick exacto de Minecraft")
        .setRequired(true)
    ),

  async execute(interaction) {
    const itemName = interaction.options.getString("item");
    const mcNick = interaction.options.getString("nick");

    // Buscar item
    const item = await storeService.getItemByName(itemName);
    if (!item || item.status !== "available") {
      return interaction.reply({
        embeds: [
          makeEmbed(
            "error",
            "Item no disponible",
            "El artículo solicitado no está disponible."
          )
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    // Verificar que el usuario exista; si no, crearlo
    await userService.createUser(interaction.user.id, interaction.user.username);

    // Embed de confirmación
    const preview = makeEmbed(
      "info",
      "Confirmar compra",
      [
        `Artículo: **${item.icon_id} ${item.name}**`,
        `Precio: **${config.emojis.coin}${item.price.toLocaleString()}**`,
        `Destino: **${mcNick}**`,
        "",
        "¿Deseas continuar?"
      ].join("\n")
    );

    // Solo enviamos itemId y mcNick
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`buy_confirm_${item.id}_${mcNick}`)
        .setLabel("Confirmar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`buy_cancel_${item.id}`)
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      embeds: [preview],
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  }
};

// ---------------------
// Button Handler
// ---------------------
module.exports.buttonHandler = async interaction => {
  if (!interaction.isButton()) return false;

  const parts = interaction.customId.split("_");

  const action = parts[1];

  // itemId siempre es el tercer elemento
  const itemId = parseInt(parts[2], 10);

  // Si es confirm, mcNick viene después del ID
  const mcNick = action === "confirm" ? parts.slice(3).join("_") : null;

  // -------- CANCELAR --------
  if (action === "cancel") {
    await interaction.update({
      embeds: [
        makeEmbed("info", "Compra cancelada", "No se ha procesado ninguna transacción.")
      ],
      components: []
    });
    return true;
  }

  // -------- CONFIRMAR --------
  if (action === "confirm") {
    try {
      // quantity = 1 (no existe en la tienda)
      const quantity = 1;

      const result = await storeService.buyItem(
        interaction.user.id,
        itemId,
        quantity,
        mcNick
      );

      await interaction.update({
        embeds: [
          makeEmbed(
            "success",
            "Compra realizada con éxito"
          )
        ],
        components: []
      });

      await storeService.buyItem(interaction.user.id, itemId, quantity, mcNick);

      await transactionService.logTransaction({
        discordId: interaction.user.id,
        type: "buy",
        itemName: result.item.name,
        mcNick,
        amount: quantity,
        totalPrice: result.totalPrice
      });

      return true;

    } catch (err) {
      await interaction.update({
        embeds: [
          makeEmbed("error", "Error en la compra", err.message)
        ],
        components: []
      });
      return true;
    }
  }

  return false;
};
