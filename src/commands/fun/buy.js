const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Compra un ítem o un rol de la tienda.')
    .addStringOption(option =>
      option
        .setName('item')
        .setDescription('El nombre del ítem o rol que deseas comprar.')
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    const connection = interaction.client.dbConnection;

    try {
      const [rows] = await connection.query(
        'SELECT name FROM currency_store WHERE (stock > 0 OR stock IS NULL) ORDER BY name LIMIT 5'
      );

      const choices = rows.map(row => ({ name: row.name, value: row.name }));
      await interaction.respond(choices);
    } catch (error) {
      console.error('Error al cargar las opciones de autocomplete para /comprar:', error);
    }
  },

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const guild = interaction.guild;
    const itemName = interaction.options.getString('item');

    try {
      const [items] = await connection.query(
        'SELECT * FROM currency_store WHERE name = ? AND (stock > 0 OR stock IS NULL)',
        [itemName]
      );

      if (items.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(`${assets.emoji.deny} No se encontró el ítem o rol "${itemName}" en la tienda o está fuera de stock.`)
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const item = items[0];
      const price = item.price;

      const [userRows] = await connection.query('SELECT balance FROM currency_users WHERE user_id = ?', [userId]);
      if (userRows.length === 0 || userRows[0].balance < price) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(`${assets.emoji.deny} No tienes suficientes créditos para comprar "${itemName}".`)
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      // Comprar ítem (objeto)
      if (item.type === 'object') {
        await connection.query('UPDATE currency_users SET balance = balance - ? WHERE user_id = ?', [price, userId]);

        await connection.query(
          'INSERT INTO currency_user_inventory (user_id, store_item_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + 1',
          [userId, item.store_item_id] 
        );
      } 
      // Comprar rol
      else if (item.type === 'role') {
        const roleId = item.role_id;
        if (!roleId) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setDescription(`${assets.emoji.deny} No se encontró un rol asignado en la tienda para "${itemName}".`)
            ],
            flags: MessageFlags.Ephemeral
          });
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setDescription(`${assets.emoji.deny} No se encontró el rol asociado en este servidor.`)
            ],
            flags: MessageFlags.Ephemeral
          });
        }

        const member = await guild.members.fetch(userId);
        if (member.roles.cache.has(role.id)) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setDescription(`${assets.emoji.deny} Ya tienes el rol "${itemName}".`)
            ],
            flags: MessageFlags.Ephemeral
          });
        }

        await member.roles.add(role);
        await connection.query('UPDATE currency_users SET balance = balance - ? WHERE user_id = ?', [price, userId]);
      } else {
        return interaction.reply({
          content: 'Categoría de ítem desconocida. Contacta al administrador.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Reducir stock si aplica
      if (item.stock !== null) {
        await connection.query('UPDATE currency_store SET stock = stock - 1 WHERE store_item_id = ?', [item.store_item_id]);
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setDescription(`${assets.emoji.check} Has comprado **${item.name}** por **🔸${price}** créditos.`)
        ]
      });
    } catch (error) {
      console.error('Error al procesar el comando comprar:', error);
      return interaction.reply({
        content: 'Hubo un problema al procesar tu compra. Por favor, intenta de nuevo más tarde.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
