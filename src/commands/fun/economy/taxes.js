const { SlashCommandBuilder, MessageFlags, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const assets = require('../../../../config/assets.json')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('taxes')
    .setDescription('Cobra impuestos a los usuarios según su balance.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const connection = interaction.client.dbConnection;

    try {
      // Obtener todos los impuestos configurados
      const [taxes] = await connection.execute('SELECT * FROM curr_taxes ORDER BY min_balance ASC');
      if (!taxes.length) return interaction.editReply('No hay impuestos configurados.');

      // Obtener todos los usuarios con balance
      const [users] = await connection.execute('SELECT id, balance FROM curr_users WHERE balance > 0');
      if (!users.length) return interaction.editReply('No hay usuarios con balance para cobrar impuestos.');

      let totalTaxesCollected = 0;
      let taxDetails = [];

      for (const taxBracket of taxes) {
        const [usersInBracket] = await connection.execute(
          'SELECT id, balance FROM curr_users WHERE balance BETWEEN ? AND ?',
          [taxBracket.min_balance, taxBracket.max_balance]
        );

        for (const user of usersInBracket) {
          const taxAmount = Math.floor(user.balance * (taxBracket.tax_rate / 100));
          if (taxAmount <= 0) continue;

          // Restar el impuesto del balance del usuario
          await connection.execute('UPDATE curr_users SET balance = balance - ? WHERE id = ?', [taxAmount, user.id]);
          totalTaxesCollected += taxAmount;
          taxDetails.push(`* <@${user.id}> **-${taxAmount.toLocaleString()}**`);
        }
      }

      if (!taxDetails.length) return interaction.editReply('No se han cobrado impuestos a ningún usuario.');

      // Enviar respuesta
      await interaction.channel.send({
        embeds:
          [new EmbedBuilder()
            .setColor(assets.color.base)
            .setTitle('🏦 Cobro de impuestos')
            .setDescription(taxDetails.join('\n'))
            .setFooter({ text: `Total cobrado: ${totalTaxesCollected.toLocaleString()} monedas` })]
      })
      await interaction.deleteReply();
    } catch (error) {
      console.error('Error al cobrar impuestos:', error);
      return interaction.editReply('Hubo un error al procesar el cobro de impuestos.');
    }
  }
};
