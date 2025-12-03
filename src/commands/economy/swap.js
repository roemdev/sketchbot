const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

const userService = require("../../services/userService");
const { sendCommand } = require("../../services/minecraftService");

const RATE = 15; // 1 C$ = 15 monedas

module.exports = {
  data: new SlashCommandBuilder()
    .setName("swap")
    .setDescription("Convierte tus monedas a CobbleDollars en Minecraft")
    .addIntegerOption(option =>
      option
        .setName("monedas")
        .setDescription("Cantidad de monedas a convertir")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("nick")
        .setDescription("Tu nick en Minecraft")
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

    // Enviar CONFIRMACIÓN con botones (efímero)
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`swap_confirm_${monedas}_${mcNick}`)
        .setLabel("Confirmar transacción")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`swap_cancel_${monedas}_${mcNick}`)
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      content:
        `Vas a convertir **${monedas.toLocaleString()} monedas** a **${cobble.toLocaleString()} C$**.\n` +
        `Destino en Minecraft: **${mcNick}**\n\n` +
        `¿Deseas continuar?`,
      components: [row],
      flags: MessageFlags.Ephemeral
    });
  }
};

// ----------------------------------------
// BUTTON HANDLER
// ----------------------------------------
module.exports.buttonHandler = async (interaction) => {
  if (!interaction.isButton()) return;

  const parts = interaction.customId.split("_");
  const action = parts[1];
  const monedas = parseInt(parts[2], 10);
  const mcNick = parts.slice(3).join("_"); // por si el nick tiene guiones

  if (action === "cancel") {
    return interaction.reply({
      content: "La transacción ha sido cancelada.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (action !== "confirm") return;

  const cobble = Math.floor(monedas / RATE);

  // Verificar usuario
  const user = await userService.getUser(interaction.user.id);
  if (!user) {
    return interaction.reply({
      content: "No tienes un perfil creado.",
      flags: MessageFlags.Ephemeral
    });
  }

  if (user.balance < monedas) {
    return interaction.reply({
      content: "Ya no tienes suficientes monedas para completar esta transacción.",
      flags: MessageFlags.Ephemeral
    });
  }

  // Restar monedas
  await userService.removeBalance(interaction.user.id, monedas);

  // Ejecutar comando en Minecraft
  try {
    await sendCommand(`cobbledollars give ${mcNick} ${cobble}`);
  } catch (err) {
    return interaction.reply({
      content: "Error enviando los C$ a Minecraft. Contacta a un administrador.",
      flags: MessageFlags.Ephemeral
    });
  }

  // Mensaje final NO efímero
  return interaction.reply({
    content:
      `Transacción completada.\n` +
      `**${interaction.user.username}** convirtió **${monedas.toLocaleString()} monedas** en **${cobble.toLocaleString()} C$**.\n` +
      `Se enviaron a **${mcNick}** en Minecraft.`,
    ephemeral: false
  });
};
