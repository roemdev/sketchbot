const { SlashCommandBuilder, MessageFlags, ContainerBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const userService = require("../../services/userService");
const { sendCommand } = require("../../services/minecraftService");
const transactionService = require("../../services/transactionService");
const config = require("../../core.json");
const { isValidMinecraftNick } = require("../../utils/validation");

const RATE = config.economy.exchangeRate;
const COIN = config.emojis.coin;

module.exports = {
  data: new SlashCommandBuilder()
      .setName("swap")
      .setDescription("Convierte tus monedas a CobbleDollars en Minecraft")
      .addIntegerOption(o => o.setName("monedas").setDescription("Cantidad de monedas a convertir").setRequired(true))
      .addStringOption(o => o.setName("nick").setDescription("Tu nick exacto en Minecraft").setRequired(true)),

  async execute(interaction) {
    const monedas = interaction.options.getInteger("monedas");
    const mcNick = (interaction.options.getString("nick") || "").trim();

    if (!isValidMinecraftNick(mcNick)) {
      return interaction.reply({ content: "Ese nick de Minecraft no es válido.", flags: MessageFlags.Ephemeral });
    }

    if (monedas <= 0) {
      return interaction.reply({ content: "La cantidad tiene que ser mayor a 0.", flags: MessageFlags.Ephemeral });
    }

    const user = await userService.getUser(interaction.user.id);
    if (!user) {
      return interaction.reply({ content: "No tienes un perfil creado todavía.", flags: MessageFlags.Ephemeral });
    }

    if (user.balance < monedas) {
      return interaction.reply({ content: `No te alcanzan las monedas para ese swap. Tienes **${COIN}${user.balance.toLocaleString()}**.`, flags: MessageFlags.Ephemeral });
    }

    const cobble = Math.floor(monedas / RATE);
    if (cobble <= 0) {
      return interaction.reply({ content: "Necesitas más monedas para generar al menos 1 C$.", flags: MessageFlags.Ephemeral });
    }

    const container = new ContainerBuilder()
        .setAccentColor(0x5B7FA6)
        .addTextDisplayComponents(t =>
            t.setContent(
                `### 🔄 Confirmar conversión\n` +
                `Monedas a convertir: **${COIN}${monedas.toLocaleString()}**\n` +
                `CobbleDollars a recibir: **C$${cobble.toLocaleString()}**\n` +
                `Jugador: **${mcNick}**\n\n¿Continuamos?`
            )
        )
        .addSeparatorComponents(s => s)
        .addActionRowComponents(row =>
            row.setComponents(
                new ButtonBuilder().setCustomId(`swap_confirm_${monedas}_${mcNick}`).setLabel("Confirmar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`swap_cancel_${monedas}_${mcNick}`).setLabel("Cancelar").setStyle(ButtonStyle.Danger)
            )
        );

    return interaction.reply({ components: [container], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
  }
};

module.exports.buttonHandler = async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith("swap_")) return false;

  const [prefix, action, monedasStr, ...nickParts] = interaction.customId.split("_");
  if (prefix !== "swap") return;

  const monedas = parseInt(monedasStr, 10);
  const mcNick = nickParts.join("_");
  const cobble = Math.floor(monedas / RATE);

  if (action === "cancel") {
    const cancelContainer = new ContainerBuilder()
        .setAccentColor(0x5B7FA6)
        .addTextDisplayComponents(t => t.setContent("### Swap cancelado\nNo se procesó ninguna transacción."));
    return interaction.update({ components: [cancelContainer], flags: MessageFlags.IsComponentsV2 });
  }

  if (action === "confirm") {
    if (!isValidMinecraftNick(mcNick)) {
      const errContainer = new ContainerBuilder()
          .setAccentColor(0xC0392B)
          .addTextDisplayComponents(t => t.setContent("### ❌ Nick inválido\nEse nick de Minecraft no es válido."));
      return interaction.update({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
    }

    const user = await userService.getUser(interaction.user.id);
    if (!user) {
      const errContainer = new ContainerBuilder()
          .setAccentColor(0xC0392B)
          .addTextDisplayComponents(t => t.setContent("### ❌ Sin perfil\nNo tienes un perfil creado todavía."));
      return interaction.update({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
    }

    if (user.balance < monedas) {
      const errContainer = new ContainerBuilder()
          .setAccentColor(0xC0392B)
          .addTextDisplayComponents(t => t.setContent("### ❌ Sin monedas\nYa no tienes suficientes monedas para completar este swap."));
      return interaction.update({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
    }

    await userService.removeBalance(interaction.user.id, monedas, false);

    try {
      await sendCommand(`cobbledollars give ${mcNick} ${cobble}`);
    } catch {
      const errContainer = new ContainerBuilder()
          .setAccentColor(0xC0392B)
          .addTextDisplayComponents(t => t.setContent("### ❌ Error en Minecraft\nNo se pudieron entregar los C$. Contacta a un administrador."));
      return interaction.update({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
    }

    await transactionService.logTransaction({ discordId: interaction.user.id, type: "swap", mcNick, amount: monedas, totalPrice: cobble });

    const successContainer = new ContainerBuilder()
        .setAccentColor(0xF4C542)
        .addTextDisplayComponents(t => t.setContent(`### ✅ ¡Swap completado!\n**C$${cobble.toLocaleString()}** enviados a **${mcNick}**.`));
    return interaction.update({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
  }
};