const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const assets = require('../../../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leñador")
    .setDescription("Realiza un trabajo y recibe ítems y monedas")
    .addStringOption((option) =>
      option
        .setName("mapa")
        .setDescription("El mapa donde deseas trabajar.")
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;

    const connection = interaction.client.dbConnection;

    try {
      const [rows] = await connection.query("SELECT id, name FROM curr_maps;");

      const choices = rows.map((row) => ({
        name: row.name,
        value: row.name,
      }));

      await interaction.respond(choices);
    } catch (error) {
      console.error("Error en autocomplete para /leñador:", error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const userId = interaction.user.id;
    const mapa = interaction.options.getString("mapa");
    const connection = interaction.client.dbConnection;

    try {
      // 1️⃣ Obtener los datos del trabajo "Leñador" (incluyendo cooldown)
      const [jobRows] = await connection.query(
        "SELECT id, min_coins, max_coins, cooldown FROM curr_jobs WHERE name = 'Leñador';"
      );
      const jobData = jobRows[0];

      if (!jobData) {
        return interaction.reply({
          content: "Error: No se encontró el trabajo 'Leñador'.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const { id: jobId, min_coins, max_coins, cooldown } = jobData;

      // 2️⃣ Verificar cooldown del usuario
      const [cooldownRows] = await connection.query(
        "SELECT last_used FROM curr_cooldowns WHERE user_id = ? AND action_id = ? AND action_type = 'job';",
        [userId, jobId]
      );

      if (cooldownRows.length > 0) {
        const lastUsed = new Date(cooldownRows[0].last_used).getTime();
        const cooldownDuration = jobData.cooldown * 1000; // en milisegundos
        const remainingTime = cooldownDuration - (Date.now() - lastUsed);

        // Ajustar el tiempo restante si es mayor que el cooldown (para evitar valores de 4 horas u otros excesos)
        const adjustedRemainingTime = remainingTime > cooldownDuration ? 0 : remainingTime;

        console.log("Último uso (UTC):", new Date(lastUsed).toLocaleString('en-US', { timeZone: 'UTC' }));
        console.log("Duración del cooldown (milisegundos):", cooldownDuration);
        console.log("Tiempo restante ajustado (milisegundos):", adjustedRemainingTime);

        // Si el tiempo restante ajustado es mayor que 0, muestra el cooldown
        if (adjustedRemainingTime > 0) {
          const timestamp = Math.floor((Date.now() + adjustedRemainingTime) / 1000); // Convertir a segundos UNIX
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setTitle(`${assets.emoji.deny} Cooldown activo`)
                .setDescription(`Debes esperar ⏳<t:${timestamp}:R> antes de volver realizar este trabajo.`)
            ],
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      // 3️⃣ Obtener el ítem requerido para el mapa
      const [mapRows] = await connection.query(
        `SELECT cm.id AS map_id, ci.id AS required_item_id, ci.name AS required_item_name, ci.emoji AS required_item_emoji
         FROM curr_maps cm
         LEFT JOIN curr_map_requirements cmr ON cm.id = cmr.map_id
         LEFT JOIN curr_items ci ON cmr.item_id = ci.id
         WHERE cm.name = ? AND cmr.job_id = ?;`,
        [mapa, jobId]
      );

      if (mapRows.length === 0) {
        return interaction.reply({
          content: "Este mapa no requiere ningún ítem o no existe.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const { required_item_id, required_item_name, required_item_emoji } = mapRows[0];

      // 4️⃣ Verificar si el usuario tiene el ítem requerido
      const [invRows] = await connection.query(
        "SELECT quantity FROM curr_user_inventory WHERE user_id = ? AND item_id = ?;",
        [userId, required_item_id]
      );

      if (invRows.length === 0 || invRows[0].quantity < 1) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setTitle(`${assets.emoji.deny} No puedes realizar este trabajo`)
              .setDescription(`Para realizar este trabajo necesitas el ítem **${required_item_emoji} ${required_item_name}**`)
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // 5️⃣ Restar 1 unidad del ítem requerido
      await connection.query(
        "UPDATE curr_user_inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?;",
        [userId, required_item_id]
      );

      // 6️⃣ Determinar las recompensas
      const madera = Math.floor(Math.random() * 3) + 1;
      const hojas = Math.floor(Math.random() * 3) + 1;
      const basura = Math.min(5 - (madera + hojas), Math.floor(Math.random() * 4));

      // 7️⃣ Obtener nombres y emojis de los ítems desde la BD
      const itemIds = [1, 2, 3]; // IDs de Madera, Hojas y Basura
      const [itemData] = await connection.query(
        `SELECT id, name, emoji FROM curr_items WHERE id IN (?, ?, ?);`,
        itemIds
      );

      const itemMap = itemData.reduce((map, item) => {
        map[item.id] = { name: item.name, emoji: item.emoji };
        return map;
      }, {});

      // 8️⃣ Agregar los ítems obtenidos al inventario
      const itemsObtenidos = [
        { item_id: 1, cantidad: madera },
        { item_id: 2, cantidad: hojas },
        ...(basura > 0 ? [{ item_id: 3, cantidad: basura }] : []),
      ];

      for (const item of itemsObtenidos) {
        await connection.query(
          `INSERT INTO curr_user_inventory (user_id, item_id, quantity) 
           VALUES (?, ?, ?) 
           ON DUPLICATE KEY UPDATE quantity = quantity + ?;`,
          [userId, item.item_id, item.cantidad, item.cantidad]
        );
      }

      // 9️⃣ Determinar la cantidad de monedas ganadas
      const monedasGanadas = Math.floor(Math.random() * (max_coins - min_coins + 1)) + min_coins;

      // 🔟 Actualizar balance del usuario
      await connection.query(
        "UPDATE curr_users SET balance = balance + ? WHERE id = ?;",
        [monedasGanadas, userId]
      );

      // 🔟 Registrar cooldown
      await connection.query(
        `INSERT INTO curr_cooldowns (user_id, action_id, action_type, last_used)
        VALUES (?, ?, 'job', CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE last_used = CURRENT_TIMESTAMP;`,
        [userId, jobId]
      );

      // 🔟 Enviar mensaje con recompensas
      const recompensaTexto = itemsObtenidos.map(item =>
        `${itemMap[item.item_id].emoji} **${itemMap[item.item_id].name}** x${item.cantidad}`
      ).join("\n");

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle(`🌳 Trabajaste en ${mapa}`)
            .setDescription(`${recompensaTexto}\n💰 **${monedasGanadas}** monedas\n\n> *Consumiste **${required_item_emoji} ${required_item_name}** x1*`)
        ],
      });

    } catch (error) {
      console.error("Error en /leñador:", error);
      return interaction.reply({
        content: "❌ Hubo un error al ejecutar el comando. Inténtalo más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
