const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventario')
    .setDescription('Muestra los ítems en tu inventario y los disponibles en la tienda.'),

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

      // Consultar los ítems de la tienda que el usuario posee
      const [storeItems] = await connection.query(
        'SELECT cs.store_item_id, cs.name, cs.price, cs.stock ' +
        'FROM currency_store cs ' +
        'JOIN currency_user_inventory ui ' +
        'ON (cs.store_item_id = ui.item_id OR cs.store_item_id = ui.store_item_id) ' +
        'WHERE ui.user_id = ? AND (cs.stock > 0 OR cs.stock IS NULL)',
        [userId]
      );
 
      // Crear la descripción del inventario del usuario
      let inventoryDescription = 'Items dropeables:\n\n';
      if (userItems.length === 0) {
        inventoryDescription += `${assets.emoji.deny} No tienes ítems dropeables.\n\n`;
      } else {
        userItems.forEach(item => {
          inventoryDescription += `${item.name} - **${item.quantity}** - 🔸${item.value}\n`;
        });
      }

      // Crear la descripción de los ítems en la tienda que el usuario posee
      let storeDescription = '\nItems de la tienda:\n\n';
      if (storeItems.length === 0) {
        storeDescription += `${assets.emoji.deny} No tienes ítems de la tienda.\n`;
      } else {
        storeItems.forEach(item => {
          storeDescription += `${item.name} - **${item.stock || '1'}** - 🔸${item.price}\n`;
        });
      }

      // Crear el embed con el inventario y la tienda
      const inventoryEmbed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle('📦 Inventario de economía')
        .setDescription(inventoryDescription + storeDescription);

      // Responder al usuario con su inventario y los ítems de la tienda (efímero)
      return interaction.reply({
        embeds: [inventoryEmbed],
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error('Error al procesar el comando inventario:', error);
      return interaction.reply({
        content: 'Hubo un problema al obtener tu inventario y la tienda. Por favor, intenta de nuevo más tarde.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
