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

      // Consultar los ítems disponibles en la tienda
      const [storeItems] = await connection.query(
        'SELECT store_item_id, name, price, stock FROM currency_store WHERE stock > 0 OR stock IS NULL'
      );

      // Crear la descripción del inventario del usuario
      let inventoryDescription = 'Aquí están los ítems que tienes en tu inventario:\n\n';
      if (userItems.length === 0) {
        inventoryDescription += `${assets.emoji.deny} No tienes ítems en tu inventario.\n\n`;
      } else {
        userItems.forEach(item => {
          inventoryDescription += `${item.name} - **${item.quantity}** - 🔸${item.value}\n`;
        });
      }

      // Crear la descripción de los ítems en la tienda
      let storeDescription = '\nAquí están los ítems disponibles en la tienda:\n\n';
      if (storeItems.length === 0) {
        storeDescription += `${assets.emoji.deny} No hay ítems disponibles en la tienda.\n`;
      } else {
        storeItems.forEach(item => {
          storeDescription += `${item.name} - 🔸${item.price} créditos - Stock: ${item.stock || 'Infinito'}\n`;
        });
      }

      // Crear el embed con el inventario y la tienda
      const inventoryEmbed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle('Tu Inventario y la Tienda')
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
