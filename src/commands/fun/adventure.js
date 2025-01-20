const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aventura')
    .setDescription('Este comando te permite embarcarte en una aventura y obtener un ítem.'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const cooldownDuration = 14400000; // 4 horas
    const currentTime = Date.now();

    try {
      // Verificar si el usuario tiene un cooldown activo en la base de datos
      const [cooldownRows] = await connection.query(
        'SELECT cooldown_end_time FROM currency_users_cooldowns WHERE user_id = ? AND command_name = "aventura"',
        [userId]
      );

      if (cooldownRows.length > 0) {
        const cooldownEndTime = new Date(cooldownRows[0].cooldown_end_time).getTime();
        if (currentTime < cooldownEndTime) {
          const nextAdventureTime = Math.floor(cooldownEndTime / 1000);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setDescription(`${assets.emoji.deny} Todavía no puedes embarcarte en una aventura. Podrás intentarlo de nuevo: <t:${nextAdventureTime}:R>.`)
            ],
            flags: MessageFlags.Ephemeral
          });
        }
      }

      // Verificar si el usuario existe en currency_users
      const [userRows] = await connection.query(
        'SELECT * FROM currency_users WHERE user_id = ?',
        [userId]
      );

      if (userRows.length === 0) {
        // Si no existe, crearlo
        await connection.query(
          'INSERT INTO currency_users (user_id) VALUES (?)',
          [userId]
        );
      }

      // Obtener ítems de la categoría "adventure" con peso
      const [itemRows] = await connection.query(
        'SELECT * FROM currency_items WHERE category = "adventure" AND weight IS NOT NULL'
      );

      if (itemRows.length === 0) {
        throw new Error('No se encontraron ítems en la categoría "adventure".');
      }

      // Calcular el peso total para la selección aleatoria
      const totalWeight = itemRows.reduce((sum, item) => sum + item.weight, 0);

      // Generar un número aleatorio basado en el peso total
      const randomWeight = Math.random() * totalWeight;

      // Determinar el ítem según el peso
      let accumulatedWeight = 0;
      let selectedItem = null;

      for (const item of itemRows) {
        accumulatedWeight += item.weight;
        if (randomWeight <= accumulatedWeight) {
          selectedItem = item;
          break;
        }
      }

      if (!selectedItem) {
        throw new Error('Error al seleccionar un ítem.');
      }

      // Actualizar el inventario del usuario
      const [userItemRows] = await connection.query(
        'SELECT * FROM currency_user_inventory WHERE user_id = ? AND item_id = ?',
        [userId, selectedItem.item_id]
      );

      if (userItemRows.length > 0) {
        // Si el usuario ya tiene el ítem, solo aumentar su cantidad
        const newQuantity = userItemRows[0].quantity + 1;
        const [updateResult] = await connection.query(
          'UPDATE currency_user_inventory SET quantity = ? WHERE user_id = ? AND item_id = ?',
          [newQuantity, userId, selectedItem.item_id]
        );

        if (updateResult.affectedRows === 0) {
          throw new Error('No se pudo actualizar el inventario del usuario.');
        }
      } else {
        // Si el usuario no tiene el ítem, insertarlo en su inventario
        const [insertResult] = await connection.query(
          'INSERT INTO currency_user_inventory (user_id, item_id, quantity) VALUES (?, ?, ?)',
          [userId, selectedItem.item_id, 1]
        );

        if (insertResult.affectedRows === 0) {
          throw new Error('No se pudo insertar el ítem en el inventario del usuario.');
        }
      }

      // Actualizar el cooldown en la base de datos
      const cooldownEndTime = new Date(currentTime + cooldownDuration);
      await connection.query(
        'INSERT INTO currency_users_cooldowns (user_id, command_name, cooldown_end_time) VALUES (?, "aventura", ?) ' +
        'ON DUPLICATE KEY UPDATE cooldown_end_time = ?',
        [userId, cooldownEndTime, cooldownEndTime]
      );

      // Responder al usuario con el ítem obtenido y su valor
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setDescription(`🗺️ ¡Te embarcaste en una aventura y obtuviste: **${selectedItem.name}**!\n-# Valor: 🔸**${selectedItem.value}**`)
        ]
      });
    } catch (error) {
      console.error('Error al procesar el comando aventura:', error);
      return interaction.reply({
        content: 'Hubo un problema. Por favor, intenta de nuevo más tarde.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
