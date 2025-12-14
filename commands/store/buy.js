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
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option.setName("nick")
        .setDescription("Tu nick exacto de Minecraft")
        .setRequired(true)
    ),

  async execute(interaction) {
    const itemName = interaction.options.getString("item");
    const mcNick = interaction.options.getString("nick");

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

    await userService.createUser(interaction.user.id, interaction.user.username);

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
        .setCustomId(`comprar_confirm_${item.id}_${mcNick}`)
        .setLabel("Confirmar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`comprar_cancel_${item.id}`)
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      embeds: [preview],
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  },

  async autocompleteHandler(interaction) {
    if (!interaction.isAutocomplete()) return false;

    const focusedValue = interaction.options.getFocused();
    const allItems = await storeService.getItems("available");

    const filtered = allItems
      .filter(item => item.name.toLowerCase().includes(focusedValue.toLowerCase()))
      .slice(0, 25);

    const choices = filtered.map(item => ({
      name: `${item.name} - ${config.emojis.coin}${item.price.toLocaleString()}`,
      value: item.name
    }));

    await interaction.respond(choices);
    return true;
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("comprar_")) return false;

    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });

    const parts = interaction.customId.split("_");
    const action = parts[1];
    const itemId = parseInt(parts[2], 10);

    const mcNick = action === "confirm"
      ? parts.slice(3).join("_")
      : null;

    if (action === "cancel") {
      await interaction.editReply({
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
          mcNick
        );

        await interaction.editReply({
          embeds: [
            makeEmbed("success", "Compra realizada con éxito")
          ],
          components: []
        });

        await transactionService.logTransaction({
          discordId: interaction.user.id,
          type: "buy",
          itemName: result.item.name,
          mcNick,
          totalPrice: result.totalPrice
        });

        return true;

      } catch (err) {
        await interaction.editReply({
          embeds: [
            makeEmbed("error", "Error en la compra", err.message)
          ],
          components: []
        });
        return true;
      }
    }

    return false;
  }
};
