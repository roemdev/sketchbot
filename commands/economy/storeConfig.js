const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const storeService = require("../../services/storeService");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("config-store")
        .setDescription("Configuración técnica de la tienda")
        .setDefaultMemberPermissions(PermissionFlagsBits.CreateEvents)
        .addSubcommand(sub =>
            sub.setName("añadir")
                .setDescription("Añade un nuevo artículo")
                .addStringOption(o => o.setName("nombre").setRequired(true).setDescription("Nombre del item"))
                .addIntegerOption(o => o.setName("precio").setRequired(true).setMinValue(0).setDescription("Precio"))
                .addStringOption(o => o.setName("mc_item").setRequired(true).setDescription("ID de Minecraft"))
                .addStringOption(o => o.setName("icono").setDescription("Emoji o icono"))
        )
        .addSubcommand(sub =>
            sub.setName("editar")
                .setDescription("Edita un artículo existente")
                .addIntegerOption(o => o.setName("id").setRequired(true).setDescription("ID del artículo"))
                .addStringOption(o => o.setName("nombre").setDescription("Nuevo nombre"))
                .addIntegerOption(o => o.setName("precio").setMinValue(0).setDescription("Nuevo precio"))
                .addStringOption(o => o.setName("mc_item").setDescription("Nuevo ID de Minecraft"))
        )
        .addSubcommand(sub =>
            sub.setName("eliminar")
                .setDescription("Elimina un artículo de la tienda")
                .addIntegerOption(o => o.setName("id").setRequired(true).setDescription("ID del artículo"))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === "añadir") {
            const data = {
                name: interaction.options.getString("nombre"),
                price: interaction.options.getInteger("precio"),
                minecraftItem: interaction.options.getString("mc_item"),
                iconId: interaction.options.getString("icono") || "📦",
                description: "Añadido vía config-store"
            };
            await storeService.addItem(data);
            return interaction.reply({ content: `✅ **${data.name}** añadido correctamente.`, flags: MessageFlags.Ephemeral });
        }

        if (sub === "editar") {
            const id = interaction.options.getInteger("id");
            const item = await storeService.getItem(id);
            if (!item) return interaction.reply({ content: "No se encontró el artículo.", flags: MessageFlags.Ephemeral });

            const newData = {
                name: interaction.options.getString("nombre") || item.name,
                price: interaction.options.getInteger("precio") ?? item.price,
                minecraftItem: interaction.options.getString("mc_item") || item.minecraft_item,
                iconId: item.icon_id,
                description: item.description
            };

            await storeService.updateItem(id, newData);
            return interaction.reply({ content: `✅ Artículo **ID: ${id}** actualizado.`, flags: MessageFlags.Ephemeral });
        }

        if (sub === "eliminar") {
            const id = interaction.options.getInteger("id");
            await storeService.deleteItem(id);
            return interaction.reply({ content: `🗑️ Artículo **ID: ${id}** eliminado.`, flags: MessageFlags.Ephemeral });
        }
    }
};