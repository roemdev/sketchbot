const { SlashCommandBuilder, ButtonStyle, MessageFlags, ContainerBuilder, ButtonBuilder } = require("discord.js");
const storeService = require("../../services/storeService");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const config = require("../../core.json");
const { isValidMinecraftNick } = require("../../utils/validation");

const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("tienda")
      .setDescription("Muestra y permite comprar items de la tienda")
      .addStringOption(o =>
          o.setName("nick").setDescription("Tu nick exacto de Minecraft para recibir el item").setRequired(true)
      ),

  async execute(interaction) {
    await userService.createUser(interaction.user.id, interaction.user.username);
    const mcNick = (interaction.options.getString("nick") || "").trim();

    if (!isValidMinecraftNick(mcNick)) {
      return interaction.reply({
        components: [
          new ContainerBuilder().setAccentColor(0xC0392B)
              .addTextDisplayComponents(t => t.setContent("### ❌ Nickname inválido\nEl nickname de Minecraft proporcionado no es válido."))
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }

    await interaction.deferReply();

    const items = await storeService.getItems("available");
    if (!items || items.length === 0) {
      return interaction.editReply({
        components: [
          new ContainerBuilder().setAccentColor(0x1E8449)
              .addTextDisplayComponents(t => t.setContent("### 🛒 Tienda vacía\nNo hay items disponibles actualmente."))
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const storeContainer = new ContainerBuilder()
        .setAccentColor(0x1E8449)
        .addTextDisplayComponents(t => t.setContent(`### 🛒 Tienda | Nick: \`${mcNick}\`\nSelecciona el artículo que deseas comprar.`))
        .addSeparatorComponents(s => s);

    for (const item of items) {
      storeContainer.addSectionComponents(section =>
          section
              .addTextDisplayComponents(t => t.setContent(`${item.icon_id} **${item.name}**\n${item.description || "Sin descripción"}`))
              .setButtonAccessory(button =>
                  button
                      .setCustomId(`tienda_buy_${item.id}_${mcNick}_${interaction.user.id}`)
                      .setLabel(`${COIN}${item.price.toLocaleString()}`)
                      .setStyle(ButtonStyle.Success)
              )
      );
      storeContainer.addSeparatorComponents(s => s);
    }

    return interaction.editReply({ components: [storeContainer], flags: MessageFlags.IsComponentsV2 });
  },

  async buttonHandler(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith("tienda_buy_")) return false;

    const parts = interaction.customId.split("_");
    const authorId = parts[parts.length - 1];

    if (interaction.user.id !== authorId) {
      return interaction.reply({
        content: "⚠️ Solo quien inició el comando puede interactuar con estos botones.",
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const itemId = parseInt(parts[2], 10);
    const mcNick = parts.slice(3, parts.length - 1).join("_");

    try {
      const item = await storeService.getItem(itemId);
      if (!item || item.status !== "available") {
        return interaction.editReply({
          components: [
            new ContainerBuilder().setAccentColor(0xC0392B)
                .addTextDisplayComponents(t => t.setContent("### ❌ No disponible\nEl artículo ya no está disponible."))
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const result = await storeService.buyItem(interaction.user.id, item, mcNick);

      await transactionService.logTransaction({
        discordId: interaction.user.id,
        type: "buy",
        itemName: result.item.name,
        mcNick,
        totalPrice: result.totalPrice
      });

      return interaction.editReply({
        components: [
          new ContainerBuilder().setAccentColor(0xF4C542)
              .addTextDisplayComponents(t => t.setContent(
                  `### ✅ ¡Compra realizada!\nHas comprado **${result.item.icon_id} ${result.item.name}** para **${mcNick}** por ${COIN}${result.totalPrice.toLocaleString()}.`
              ))
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err) {
      return interaction.editReply({
        components: [
          new ContainerBuilder().setAccentColor(0xC0392B)
              .addTextDisplayComponents(t => t.setContent(`### ❌ Error en la compra\n${err.message}`))
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  }
};
