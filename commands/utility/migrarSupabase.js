const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { migrate } = require("../../scripts/migrate-from-supabase");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("migrar-supabase")
    .setDescription("Sincroniza y vuelca todos los datos de Supabase a la base de datos local SQLite (Solo Admins)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await migrate();
      return interaction.editReply({
        content: "✅ Migración completada con éxito. Todos los datos de Supabase han sido sincronizados en SQLite."
      });
    } catch (error) {
      console.error("[MIGRAR-SUPABASE] Error:", error);
      return interaction.editReply({
        content: `❌ Ocurrió un error durante la migración: ${error.message}`
      });
    }
  }
};
