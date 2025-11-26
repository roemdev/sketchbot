const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Muestra tu balance o el de otro usuario.")
    .addUserOption(opt =>
      opt.setName("usuario")
        .setDescription("Usuario a consultar")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("usuario") || interaction.user;

    const conn = await interaction.client.dbConnection.getConnection();

    try {
      const [rows] = await conn.query(
        "SELECT balance FROM user_stats WHERE user_id = ?",
        [target.id]
      );

      const balance = rows.length > 0 ? rows[0].balance : 0;

      await interaction.reply({
        content: `💰 Balance de **${target.username}**: **${balance} créditos**`
      });
    } catch (err) {
      console.error("Error en balance:", err);
      await interaction.reply({
        content: "Ocurrió un error al consultar el balance.",
        ephemeral: true
      });
    } finally {
      if (conn) conn.release();
    }
  }
};
