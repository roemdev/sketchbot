const {
  SlashCommandBuilder,
  ButtonStyle,
  MessageFlags,
  ContainerBuilder,
  ButtonBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder
} = require("discord.js");

const storeService = require("../../services/storeService");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const { makeEmbed } = require("../../utils/embedFactory");
const config = require("../../core.json");
const { isValidMinecraftNick } = require("../../utils/validation");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tienda")
    .setDescription("Muestra y permite comprar items de la tienda")
    .addStringOption(option =>
      option.setName("nick")
        .setDescription("Tu nick exacto de Minecraft para recibir el item")
        .setRequired(true)
    ),

  async execute(interaction) {
    await userService.createUser(interaction.user.id, interaction.user.username, false);

    const mcNick = (interaction.options.getString("nick") || "").trim();

    if (!isValidMinecraftNick(mcNick)) {
      return interaction.reply({
        embeds: [
          makeEmbed(
            "error",
            "Nickname inválido",
            "El nickname de Minecraft proporcionado no es válido."
          )
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply();

    const items = await storeService.getItems("available");

    if (!items || items.length === 0) {
      return interaction.editReply({
        embeds: [makeEmbed("error", "Tienda vacía", "No hay items disponibles actualmente.")],
        flags: MessageFlags.Ephemeral
      });
    }

    const storeContainer = new ContainerBuilder()
      .setAccentColor(3447003)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(`### 🛒 Tienda | Nick: \`${mcNick}\``)
      );

    storeContainer.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`**Selecciona el artículo que deseas comprar para \`${mcNick}\`**`)
    );

    for (const item of items) {
      // MODIFICACIÓN 1: Añadir el ID del autor al customId
      const customId = `tienda_buy_${item.id}_${mcNick}_${interaction.user.id}`;

      storeContainer.addSectionComponents((section) =>
        section.addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `${item.icon_id} **${item.name}**\n` +
            `${item.description || "Sin descripción"}`
          )
        )
          .setButtonAccessory((button) =>
            button
              .setCustomId(customId)
              .setLabel(`🪙${item.price.toLocaleString()}`)
              .setStyle(ButtonStyle.Success)
          )
      );

      storeContainer.addSeparatorComponents((separator) => separator);
    }

    return interaction.editReply({
      components: [storeContainer],
      flags: MessageFlags.IsComponentsV2,
    });
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("tienda_buy_")) return false;

    const parts = interaction.customId.split("_");
    const authorId = parts[parts.length - 1]; // El ID del autor es el último elemento

    // MODIFICACIÓN 2: Validar que el usuario que hizo clic sea el autor
    if (interaction.user.id !== authorId) {
      // 🚀 Mensaje de texto simple y efímero para el acceso denegado
      return interaction.reply({
        content: "⚠️ Solo la persona que inició el comando puede interactuar con estos botones.",
        flags: MessageFlags.Ephemeral
      });
    }

    // A partir de aquí, solo el autor puede continuar
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const itemId = parseInt(parts[2], 10);
    // Ajustar el slice para excluir el authorId (el último elemento)
    const mcNick = parts.slice(3, parts.length - 1).join("_");

    try {
      const item = await storeService.getItem(itemId);
      if (!item || item.status !== "available") {
        return interaction.editReply({
          embeds: [
            makeEmbed("error", "Error", "El artículo ya no está disponible.")
          ],
        });
      }

      const result = await storeService.buyItem(
        interaction.user.id,
        item,
        mcNick
      );

      await transactionService.logTransaction({
        discordId: interaction.user.id,
        type: "buy",
        itemName: result.item.name,
        mcNick,
        totalPrice: result.totalPrice
      });

      await interaction.editReply({
        embeds: [
          makeEmbed(
            "success",
            "¡Compra realizada con éxito!",
            `Has comprado **${result.item.icon_id} ${result.item.name}** para **${mcNick}** por ${config.emojis.coin}${result.totalPrice.toLocaleString()}.`
          )
        ],
      });

      return true;

    } catch (err) {
      await interaction.editReply({
        embeds: [
          makeEmbed("error", "Error en la compra", err.message)
        ],
      });
      return true;
    }
  }
};