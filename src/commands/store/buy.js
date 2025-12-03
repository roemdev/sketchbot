const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../../core.json");
const storeService = require("../../services/storeService");
const userService = require("../../services/userService");

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
        .setDescription("Nick de Minecraft donde se entregará")
        .setRequired(true)
    ),

  async execute(interaction) {
    const itemName = interaction.options.getString("item");
    const mcNick = interaction.options.getString("nick");

    // Buscar item
    const item = await storeService.getItemByName(itemName);
    if (!item || item.status !== "available") {
      return interaction.reply({
        embeds: [makeEmbed("error", "Item no disponible", "El artículo solicitado no está disponible.")],
        flags: MessageFlags.Ephemeral
      });
    }

    const userRecord = await userService.createUser(interaction.user.id, interaction.user.username);

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
  const itemId = parseInt(parts[2], 10);
  const quantity = parseInt(parts[3], 10);
  const mcNick = parts.slice(4).join("_");

  if (action === "cancel") {
    await interaction.update({
      embeds: [
        makeEmbed("info", "Compra cancelada", "No se ha procesado ninguna transacción.")
      ],
      components: []
    });
    return true;
  }

  if (action === "confirm") {
    try {
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
            "Compra realizada",
            `Has comprado **${quantity}x ${result.item.name}** por **${config.emojis.coin}${result.totalPrice.toLocaleString()}**.\n` +
            `Entregado a: **${mcNick}**`
          )
        ],
        components: []
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