const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const assets = require('../../../assets.json')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Muestra tu balance actual de créditos. 💰')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Opcional: Ver el balance de otro usuario.')
        .setRequired(false)
    ),

  async execute(interaction) {
    const connection = interaction.client.dbConnection; // Conexión a la base de datos
    const targetUser = interaction.options.getUser('usuario') || interaction.user; // Usuario objetivo o el que usa el comando
    const userId = targetUser.id;

    try {
      // Consultar el balance en la base de datos
      const [rows] = await connection.query('SELECT balance FROM currency WHERE user_id = ?', [userId]);

      if (rows.length === 0) {
        // Si el usuario no tiene un registro en la base de datos
        const embedNoData = new EmbedBuilder()
          .setColor(0xff0000) // Rojo
          .setDescription(`💸 ${targetUser} aún no tiene un balance registrado. Usa comandos como \`/trabajar\` o \`/pescar\` para ganar créditos.`);

        return interaction.reply({ embeds: [embedNoData] });
      }

      // Si el usuario tiene balance
      const balance = rows[0].balance;

      const embed = new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(`${targetUser} tiene un total de\n\n🔸**${balance.toLocaleString()}** créditos.`)
        .addFields(
          { name: 'Efectivo', value: '000', inline: true },
          { name: 'Banco', value: '000', inline: true },
        )
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error al consultar el balance:', error);
      return interaction.reply({
        content: 'Hubo un error al consultar el balance. Por favor, intenta más tarde.',
        ephemeral: true,
      });
    }
  },
};
