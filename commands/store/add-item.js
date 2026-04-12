const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder } = require("discord.js");
const storeService = require("../../services/storeService");

module.exports = {
  data: new SlashCommandBuilder()
      .setName("añadir_item")
      .setDescription("Añade un nuevo artículo a la tienda (Solo Admins)")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
      .addStringOption(o => o.setName("nombre").setDescription("Nombre visible del artículo").setRequired(true))
      .addIntegerOption(o => o.setName("precio").setDescription("Precio en créditos/monedas").setRequired(true).setMinValue(0))
      .addStringOption(o => o.setName("mc_item").setDescription("ID técnico del item en Minecraft (ej: diamond_sword)").setRequired(true))
      .addStringOption(o => o.setName("descripcion").setDescription("Descripción del artículo").setRequired(false))
      .addStringOption(o => o.setName("icono").setDescription("Emoji o ícono").setRequired(false)),

  async execute(interaction) {
    const nombre = interaction.options.getString("nombre");
    const precio = interaction.options.getInteger("precio");
    const mcItem = interaction.options.getString("mc_item");
    const descripcion = interaction.options.getString("descripcion") || "Sin descripción";
    const icono = interaction.options.getString("icono") || "📦";

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await storeService.addItem({ name: nombre, description: descripcion, price: precio, iconId: icono, minecraftItem: mcItem });

      await interaction.editReply({
        components: [
          new ContainerBuilder().setAccentColor(0x32cd32)
              .addTextDisplayComponents(t => t.setContent(
                  `### ✅ Artículo añadido\n**${icono} ${nombre}** agregado a la tienda por **${precio}** monedas.\nComando MC: \`give <jugador> ${mcItem}\``
              ))
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("Error al añadir item:", error);
      await interaction.editReply({
        components: [
          new ContainerBuilder().setAccentColor(0xff4500)
              .addTextDisplayComponents(t => t.setContent("### ❌ Error al guardar\nOcurrió un problema al guardar el artículo en la base de datos."))
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};