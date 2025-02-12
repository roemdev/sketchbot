const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leñador')
    .setDescription('Realiza un trabajo y recibe ítems')
    .addStringOption((option) =>
      option
        .setName("mapa")
        .setDescription("El trabajo que deseas realizar.")
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;

    const connection = interaction.client.dbConnection;

    try {
      const [rows] = await connection.query(
        "SELECT DISTINCT map_name FROM map_items;"
      );

      const choices = rows.map((row) => ({
        name: row.map_name,
        value: row.map_name,
      }));

      await interaction.respond(choices);
    } catch (error) {
      console.error("Error al cargar las opciones de autocomplete para /leñador:", error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const opcion = interaction.options.getString('mapa');
    const userId = interaction.user.id;  // Obtiene el ID del usuario

    // Conectar a la base de datos
    const connection = interaction.client.dbConnection;

    // Verificar si el usuario tiene el ítem requerido
    let requiredItem;
    const [rows] = await connection.query(
      "SELECT tool_required FROM map_items WHERE map_name = ? LIMIT 1;",
      [opcion]
    );

    if (rows.length === 0) {
      return interaction.reply({
        content: "Este mapa no existe o no está disponible.",
        flags: MessageFlags.Ephemeral
      });
    }

    requiredItem = rows[0].tool_required;

    // Verificar si el usuario tiene el ítem necesario en su inventario
    const [items] = await connection.query(
      "SELECT " +
      " CASE WHEN cui.item_id IS NOT NULL THEN LPAD(cui.item_id, 4, '0') ELSE NULL END AS formatted_item_id, " +
      " CASE WHEN cui.store_item_id IS NOT NULL THEN CONCAT('S', LPAD(cui.store_item_id, 3, '0')) ELSE NULL END AS formatted_store_item_id, " +
      " COALESCE(ci.name, cs.name) AS item_name, " +
      " COALESCE(ci.value, cs.price) AS item_value, " +
      " cui.quantity " +
      " FROM currency_user_inventory cui " +
      " LEFT JOIN currency_items ci ON cui.item_id = ci.item_id " +
      " LEFT JOIN currency_store cs ON cui.store_item_id = cs.store_item_id " +
      " WHERE cui.user_id = ? " +
      " AND cui.quantity > 0;",
      [userId]
    );

    // Verificar si el usuario tiene el ítem requerido
    const hasRequiredItem = items.some(item => item.item_name === requiredItem);

    if (!hasRequiredItem) {
      return interaction.reply({
        content: `No tienes el ítem requerido: ${requiredItem}. Necesitas tenerlo en tu inventario para realizar el trabajo.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Obtener las recompensas de la base de datos
    const [rewards] = await connection.query(
      "SELECT item_name, item_type, quantity FROM map_items WHERE map_name = ? AND (item_type = 'madera' OR item_type = 'hojas' OR item_type = 'savia' OR item_type = 'basura');",
      [opcion]
    );

    // Filtrar las recompensas por categoría
    const categorizedRewards = {
      madera: [],
      hojas: [],
      savia: [],
      basura: []
    };

    rewards.forEach(reward => {
      categorizedRewards[reward.item_type].push({ item_name: reward.item_name, quantity: reward.quantity });
    });

    // Asegúrate de que las recompensas se muestren correctamente
    let allRewards = [];

    // Añadir los ítems de madera
    categorizedRewards.madera.forEach(item => {
      allRewards.push(`${item.item_name}: ${item.quantity}`);
    });

    // Añadir los ítems de hojas
    categorizedRewards.hojas.forEach(item => {
      allRewards.push(`${item.item_name}: ${item.quantity}`);
    });

    // Añadir los ítems de savia
    categorizedRewards.savia.forEach(item => {
      allRewards.push(`${item.item_name}: ${item.quantity}`);
    });

    // Añadir los ítems de basura
    categorizedRewards.basura.forEach(item => {
      allRewards.push(`${item.item_name}: ${item.quantity}`);
    });

    // Agregar las recompensas al inventario del usuario
    for (const reward of allRewards) {
      const [itemName, quantity] = reward.split(': ');
      await connection.query(
        "INSERT INTO currency_user_inventory (user_id, item_name, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?;",
        [userId, itemName, quantity, quantity]
      );
    }

    return interaction.reply({
      content: `¡Trabajo realizado! Has recibido los siguientes ítems: ${allRewards.join(', ')}.`,
      flags: MessageFlags.Ephemeral
    });
  },
};
