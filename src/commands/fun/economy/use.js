const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const assets = require("../../../../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("usar")
    .setDescription("Usa un ítem de tu inventario.")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("El nombre del ítem que deseas usar.")
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;
    const connection = interaction.client.dbConnection;

    try {
      const [rows] = await connection.query(
        "SELECT cui.item_id, ci.name " +
        "FROM curr_user_inventory cui " +
        "JOIN curr_items ci ON cui.item_id = ci.id " +
        "WHERE cui.user_id = ? AND category = 'potion';",
        [interaction.user.id]
      );

      const choices = rows.map((row) => ({ name: row.name, value: row.name }));
      await interaction.respond(choices);
    } catch (error) {
      console.error("Error en el autocompletado de /use:", error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const guild = interaction.guild;
    const itemName = interaction.options.getString("item");

    try {
      const [items] = await connection.query(
        "SELECT id, name, emoji FROM curr_items WHERE BINARY name = ?",
        [itemName.trim()]
      );

      if (items.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(`${assets.emoji.deny} No se encontró el ítem \"${itemName}\".`),
          ],
        });
      }

      const item = items[0];
      const itemEmoji = item.emoji || "";

      const [inventory] = await connection.query(
        "SELECT quantity FROM curr_user_inventory WHERE user_id = ? AND item_id = ?",
        [userId, item.id]
      );

      if (inventory.length === 0 || inventory[0].quantity < 1) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(`${assets.emoji.deny} No tienes ${itemName} en tu inventario.`),
          ],
        });
      }

      const [roleData] = await connection.query(
        "SELECT role_id, duration FROM curr_items_roles WHERE item_id = ?",
        [item.id]
      );

      if (roleData.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(`${assets.emoji.deny} Este ítem no se puede usar.`),
          ],
        });
      }

      const { role_id, duration } = roleData[0];
      const role = guild.roles.cache.get(role_id);
      if (!role) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription(`${assets.emoji.deny} El rol asignado a este ítem no existe en el servidor.`),
          ],
        });
      }

      await interaction.member.roles.add(role);

      const currentTimeUTC = new Date();
      const expiresAt = new Date(currentTimeUTC.getTime() + duration * 1000);
      const expiresAtUTC = new Date(expiresAt.getTime() - expiresAt.getTimezoneOffset() * 60000).toISOString().slice(0, 19).replace("T", " ");
      const discordTimestamp = Math.floor(expiresAt.getTime() / 1000);

      await connection.query(
        "INSERT INTO curr_user_active_roles (user_id, role_id, expires_at) VALUES (?, ?, ?) " +
        "ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at)",
        [userId, role_id, expiresAtUTC]
      );

      await connection.query(
        "UPDATE curr_user_inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?",
        [userId, item.id]
      );

      await connection.query(
        "DELETE FROM curr_user_inventory WHERE user_id = ? AND item_id = ? AND quantity <= 0",
        [userId, item.id]
      );

      setTimeout(async () => {
        try {
          await interaction.member.roles.remove(role);
          await connection.query(
            "DELETE FROM curr_user_active_roles WHERE user_id = ? AND role_id = ?",
            [userId, role_id]
          );
        } catch (error) {
          console.error(`Error al eliminar el rol ${role.name}:`, error);
        }
      }, duration * 1000);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle(`${assets.emoji.check} Has consumido un ítem`)
            .setDescription(`\`🆔\` \`${item.id}\` | ${itemEmoji} ${item.name} | \`⏳\` <t:${discordTimestamp}:R>`),
        ],
      });
    } catch (error) {
      console.error("Error al usar el ítem:", error);
      return interaction.reply({
        content: "Hubo un problema al usar el ítem. Intenta de nuevo más tarde.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
