const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addcredits")
    .setDescription("Añade créditos a un usuario.")
    .addUserOption(opt =>
      opt.setName("usuario")
        .setDescription("Usuario al que se le agregarán créditos")
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName("cantidad")
        .setDescription("Cantidad de créditos a añadir")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const user = interaction.options.getUser("usuario");
    const amount = interaction.options.getInteger("cantidad");

    const conn = await interaction.client.dbConnection.getConnection();

    try {
      await conn.beginTransaction();

      // Insertar o actualizar balance
      await conn.query(
        `INSERT INTO user_stats (user_id, username, balance)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance), username = VALUES(username);`,
        [user.id, user.username, amount]
      );

      await conn.commit();

      await interaction.reply({
        content: `Se añadieron **${amount}** créditos a **${user.username}**.`,
        ephemeral: true
      });
    } catch (err) {
      if (conn) await conn.rollback();
      console.error("Error en addCredits:", err);
      await interaction.reply({
        content: "Ocurrió un error al añadir los créditos.",
        ephemeral: true
      });
    } finally {
      if (conn) conn.release();
    }
  }
};
