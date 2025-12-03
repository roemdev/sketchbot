const {
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags
} = require("discord.js");

const storeService = require("../../services/storeService");

const COIN = "⏣";

module.exports = {
  // --------------------
  // Constructor del comando
  // --------------------
  data: new SlashCommandBuilder()
    .setName("tienda")
    .setDescription("Interactúa con la tienda")
    .addSubcommand(sub =>
      sub.setName("ver")
        .setDescription("Muestra los items disponibles")
    )
    .addSubcommand(sub =>
      sub.setName("comprar")
        .setDescription("Compra un item de la tienda")
        // Opción item dinámica: choices se agregan en deploy
        .addStringOption(option =>
          option.setName("item")
            .setDescription("Selecciona el item que quieres comprar")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName("cantidad")
            .setDescription("Cantidad a comprar")
            .setRequired(false)
        )
    ),

  // --------------------
  // Handler del comando
  // --------------------
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // ---------- VER ----------
    if (subcommand === "ver") {
      const items = await storeService.getItems("available");
      if (!items.length) return interaction.reply("No hay items disponibles.");

      const embed = new EmbedBuilder()
        .setTitle("🛒 Tienda")
        .setDescription("Items disponibles para comprar:");

      items.forEach(item => {
        const line =
          `${item.icon_id} ${item.name} | **${COIN}${item.price.toLocaleString()}**\n` +
          `> ${item.description || "Sin descripción"}`;

        embed.addFields({ name: "\u200B", value: line });
      });

      return interaction.reply({ embeds: [embed] });
    }

    // ---------- COMPRAR ----------
    if (subcommand === "comprar") {
      const itemId = parseInt(interaction.options.getString("item"), 10);
      const quantity = interaction.options.getInteger("cantidad") || 1;

      const item = await storeService.getItem(itemId);
      if (!item) return interaction.reply({ content: "Item no disponible.", flags: MessageFlags.Ephemeral });

      // Si es tipo Minecraft, mostrar modal para nick
      if (item.type === "minecraft") {
        const modal = new ModalBuilder()
          .setCustomId(`nick_minecraft_${itemId}_${quantity}`)
          .setTitle("Ingresa tu nick de Minecraft");

        const input = new TextInputBuilder()
          .setCustomId("mc_nick")
          .setLabel("Tu nick en Minecraft")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(input);
        modal.addComponents(actionRow);

        return interaction.showModal(modal);
      }

      // Si no es Minecraft, procesar compra directamente
      const result = await storeService.buyItem(interaction.user.id, itemId, quantity);
      return interaction.reply(`✅ Compraste ${quantity}x ${result.item.name}. Nuevo balance: ${result.user.balance}`);
    }
  }
};

// --------------------
// Manejo de modal
// --------------------
module.exports.modalHandler = async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId.startsWith("nick_minecraft_")) {
    const parts = interaction.customId.split("_");
    const itemId = parseInt(parts[2], 10);
    const quantity = parseInt(parts[3], 10);

    const mcNick = interaction.fields.getTextInputValue("mc_nick");

    try {
      const result = await storeService.buyItemWithMCNick(interaction.user.id, itemId, quantity, mcNick);
      await interaction.reply(`✅ Compraste ${quantity}x ${result.item.name} y se enviaron a ${mcNick} en Minecraft.\nNuevo balance: ${result.user.balance}`);
    } catch (err) {
      await interaction.reply({ content: `❌ ${err.message}`, flags: MessageFlags.Ephemeral });
    }
  }
};
