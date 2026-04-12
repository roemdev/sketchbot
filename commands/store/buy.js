const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");
const config = require("../../core.json");
const storeService = require("../../services/storeService");
const userService = require("../../services/userService");
const transactionService = require("../../services/transactionService");
const { isValidMinecraftNick } = require("../../utils/validation");

const COIN = config.emojis.coin;
const CACHE_TTL = 5 * 60 * 1000;
let cachedItems = null;
let lastCacheUpdate = 0;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("comprar")
      .setDescription("Compra un artículo de la tienda")
      .addStringOption(o => o.setName("item").setDescription("Nombre del artículo").setRequired(true).setAutocomplete(true))
      .addStringOption(o => o.setName("nick").setDescription("Tu nick exacto de Minecraft").setRequired(true)),

  async execute(interaction) {
    const itemName = interaction.options.getString("item");
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

    const item = await storeService.getItemByName(itemName);
    if (!item || item.status !== "available") {
      return interaction.reply({
        components: [
          new ContainerBuilder().setAccentColor(0xC0392B)
              .addTextDisplayComponents(t => t.setContent("### ❌ No disponible\nEl artículo solicitado no está disponible."))
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }

    await userService.createUser(interaction.user.id, interaction.user.username);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`comprar_confirm_${item.id}_${mcNick}`).setLabel("Confirmar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`comprar_cancel_${item.id}`).setLabel("Cancelar").setStyle(ButtonStyle.Danger)
    );

    const preview = new ContainerBuilder()
        .setAccentColor(0x1E8449)
        .addTextDisplayComponents(t => t.setContent(
            `### 🛒 Confirmar compra\n` +
            `Artículo: **${item.icon_id} ${item.name}**\n` +
            `Precio: **${COIN}${item.price.toLocaleString()}**\n` +
            `Destino: **${mcNick}**\n\n` +
            `¿Deseas continuar?`
        ))
        .addSeparatorComponents(s => s)
        .addActionRowComponents(row.components[0] ? row : r => r);

    // ContainerBuilder doesn't take ActionRowBuilder directly in addActionRowComponents this way,
    // so we build a separate container + reply with both
    return interaction.reply({
      components: [
        new ContainerBuilder()
            .setAccentColor(0x1E8449)
            .addTextDisplayComponents(t => t.setContent(
                `### 🛒 Confirmar compra\n` +
                `Artículo: **${item.icon_id} ${item.name}**\n` +
                `Precio: **${COIN}${item.price.toLocaleString()}**\n` +
                `Destino: **${mcNick}**\n\n¿Deseas continuar?`
            ))
            .addSeparatorComponents(s => s)
            .addActionRowComponents(r =>
                r.setComponents(
                    new ButtonBuilder().setCustomId(`comprar_confirm_${item.id}_${mcNick}`).setLabel("Confirmar").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`comprar_cancel_${item.id}`).setLabel("Cancelar").setStyle(ButtonStyle.Danger)
                )
            )
      ],
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    });
  },

  async autocompleteHandler(interaction) {
    if (!interaction.isAutocomplete()) return false;

    const focusedValue = interaction.options.getFocused();
    const now = Date.now();

    if (!cachedItems || now - lastCacheUpdate > CACHE_TTL) {
      cachedItems = await storeService.getItems("available");
      lastCacheUpdate = now;
    }

    const choices = cachedItems
        .filter(item => item.name.toLowerCase().includes(focusedValue.toLowerCase()))
        .slice(0, 25)
        .map(item => ({ name: `${item.name} - ${COIN}${item.price.toLocaleString()}`, value: item.name }));

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

    if (action === "cancel") {
      return interaction.editReply({
        components: [
          new ContainerBuilder().setAccentColor(0x1E8449)
              .addTextDisplayComponents(t => t.setContent("### ℹ️ Compra cancelada\nNo se procesó ninguna transacción."))
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (action === "confirm") {
      const mcNick = parts.slice(3).join("_");
      try {
        const result = await storeService.buyItem(interaction.user.id, itemId, mcNick);

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
                .addTextDisplayComponents(t => t.setContent("### ✅ Compra realizada con éxito\nEl artículo ha sido entregado en Minecraft."))
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

    return false;
  }
};
