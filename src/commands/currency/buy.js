const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("comprar")
    .setDescription("Compra un ítem o un rol de la tienda.")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("El nombre del ítem o rol que deseas comprar.")
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;

    const connection = interaction.client.dbConnection;
    const author = {
      name: interaction.user.displayName,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    };

    try {
      // Consulta los ítems disponibles en la tienda
      const [rows] = await connection.query(
        "SELECT name FROM currency_store WHERE (stock > 0 OR stock IS NULL) ORDER BY name LIMIT 5"
      );

      // Mapear los resultados para el autocompletado
      const choices = rows.map((row) => ({ name: row.name, value: row.name }));

      // Responder con las opciones
      await interaction.respond(choices);
    } catch (error) {
      console.error(
        "Error al cargar las opciones de autocomplete para /comprar:",
        error
      );
      await interaction.respond([]); // Responder con un arreglo vacío en caso de error
    }
  },

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const guild = interaction.guild;
    const itemName = interaction.options.getString("item");

    try {
      const [items] = await connection.query(
        "SELECT * FROM currency_store WHERE name = ? AND (stock > 0 OR stock IS NULL)",
        [itemName]
      );

      if (items.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} No se encontró el ítem o rol "${itemName}" en la tienda o está fuera de stock.`
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const item = items[0];
      const price = item.price;

      const [userRows] = await connection.query(
        "SELECT balance FROM currency_users WHERE user_id = ?",
        [userId]
      );
      if (userRows.length === 0 || userRows[0].balance < price) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(
                `${assets.emoji.deny} No tienes suficientes créditos para comprar "${itemName}".`
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Comprar ítem (objeto)
      if (item.type === "object") {
        await connection.query(
          "UPDATE currency_users SET balance = balance - ? WHERE user_id = ?",
          [price, userId]
        );

        await connection.query(
          "INSERT INTO currency_user_inventory (user_id, store_item_id, quantity) " +
            "VALUES (?, ?, 1) " +
            "ON DUPLICATE KEY UPDATE quantity = quantity + 1",
          [userId, item.store_item_id]
        );
      }
      // Comprar rol
      // Reemplazar el bloque donde se asigna el rol con esta lógica
      else if (item.type === "role") {
        const roleId = item.role_id;
        const duration = item.duration; // Duración en milisegundos (asegúrate de tener esto en la tabla)

        if (!roleId || !duration) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setDescription(
                  `${assets.emoji.deny} El ítem no tiene un rol o duración asignado en la tienda.`
                ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setDescription(
                  `${assets.emoji.deny} No se encontró el rol asociado en este servidor.`
                ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        const member = await guild.members.fetch(userId);
        if (member.roles.cache.has(role.id)) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setDescription(
                  `${assets.emoji.deny} Ya tienes el rol "${itemName}".`
                ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        // Asignar el rol
        await member.roles.add(role);
        await connection.query(
          "UPDATE currency_users SET balance = balance - ? WHERE user_id = ?",
          [price, userId]
        );

        // Calcular la hora de expiración
        const expirationTime = new Date(Date.now() + duration);
        const expirationTimestamp = Math.floor(expirationTime.getTime() / 1000);

        await connection.query(
          "INSERT INTO currency_user_temporary_roles (user_id, role_id, guild_id, expiration_time) VALUES (?, ?, ?, ?)",
          [userId, role.id, guild.id, expirationTime]
        );

        // Programar la eliminación del rol
        setTimeout(async () => {
          try {
            const member = await guild.members.fetch(userId);
            if (member.roles.cache.has(role.id)) {
              await member.roles.remove(role);
              await connection.query(
                "DELETE FROM currency_user_temporary_roles WHERE user_id = ? AND role_id = ? AND guild_id = ?",
                [userId, role.id, guild.id]
              );
            }
          } catch (err) {
            console.error(
              `Error al remover el rol temporal para el usuario ${userId}:`,
              err
            );
          }
        }, duration);

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setAuthor(author)
              .setColor(assets.color.green)
              .setDescription(
                `${assets.emoji.check} Has comprado el rol **${item.name}**. Expira: <t:${expirationTimestamp}:R>`
              ),
          ],
        });
      } else {
        return interaction.reply({
          content: "Categoría de ítem desconocida. Contacta al administrador.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Reducir stock si aplica
      if (item.stock !== null) {
        await connection.query(
          "UPDATE currency_store SET stock = stock - 1 WHERE store_item_id = ?",
          [item.store_item_id]
        );
      }

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(author)
            .setColor(assets.color.green)
            .setDescription(
              `${assets.emoji.check} Has comprado **${item.name}**.`
            ),
        ],
      });
    } catch (error) {
      console.error("Error al procesar el comando comprar:", error);
      return interaction.reply({
        content:
          "Hubo un problema al procesar tu compra. Por favor, intenta de nuevo más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
