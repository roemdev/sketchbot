const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventario')
    .setDescription('Muestra los ítems en tu inventario.'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    try {
      // Consultar el inventario del usuario
      const [userItems] = await connection.query(
        'SELECT ui.item_id, ui.quantity, ci.name, ci.value ' +
        'FROM currency_user_inventory ui ' +
        'JOIN currency_items ci ON ui.item_id = ci.item_id ' +
        'WHERE ui.user_id = ?',
        [userId]
      );

      if (userItems.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(`${assets.emoji.deny} No tienes ítems en tu inventario.`)
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      // Crear la descripción del inventario
      let inventoryDescription = 'Aquí están los ítems que tienes en tu inventario:\n\n';

      userItems.forEach(item => {
        inventoryDescription += `${item.name} - **${item.quantity}** -🔸${item.value}\n`;
      });

      // Crear el embed con la descripción
      const inventoryEmbed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle('Tu Inventario')
        .setDescription(inventoryDescription);

      // Responder al usuario con su inventario (efímero)
      return interaction.reply({
        embeds: [inventoryEmbed],
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('Error al procesar el comando inventario:', error);
      return interaction.reply({
        content: 'Hubo un problema al obtener tu inventario. Por favor, intenta de nuevo más tarde.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
