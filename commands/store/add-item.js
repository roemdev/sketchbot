const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const storeService = require("../../services/storeService"); // Ajusta la ruta si es necesario
const { makeEmbed } = require("../../utils/embedFactory"); // Ajusta la ruta si es necesario

module.exports = {
  data: new SlashCommandBuilder()
    .setName("añadir_item")
    .setDescription("Añade un nuevo artículo a la tienda (Solo Admins)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Bloquea el uso a usuarios sin permisos de admin
    .addStringOption((option) =>
      option
        .setName("nombre")
        .setDescription("Nombre visible del artículo")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("precio")
        .setDescription("Precio del artículo en créditos/monedas")
        .setRequired(true)
        .setMinValue(0),
    )
    .addStringOption((option) =>
      option
        .setName("mc_item")
        .setDescription("ID técnico del item en Minecraft (ej: diamond_sword)")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("descripcion")
        .setDescription("Descripción del artículo para la tienda")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("icono")
        .setDescription("Emoji o ícono para mostrar junto al nombre")
        .setRequired(false),
    ),

  async execute(interaction) {
    const nombre = interaction.options.getString("nombre");
    const precio = interaction.options.getInteger("precio");
    const mcItem = interaction.options.getString("mc_item");
    const descripcion =
      interaction.options.getString("descripcion") || "Sin descripción";
    const icono = interaction.options.getString("icono") || "📦";

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await storeService.addItem({
        name: nombre,
        description: descripcion,
        price: precio,
        iconId: icono,
        minecraftItem: mcItem,
      });

      await interaction.editReply({
        embeds: [
          makeEmbed(
            "success",
            "Artículo añadido",
            `El artículo **${icono} ${nombre}** ha sido agregado a la tienda por **${precio}** monedas.\nComando MC asociado: \`give <jugador> ${mcItem}\``,
          ),
        ],
      });
    } catch (error) {
      console.error("Error al añadir item:", error);
      await interaction.editReply({
        embeds: [
          makeEmbed(
            "error",
            "Error al guardar",
            "Ocurrió un problema al intentar guardar el artículo en la base de datos.",
          ),
        ],
      });
    }
  },
};
