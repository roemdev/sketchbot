const { EmbedBuilder } = require('discord.js');
const assets = require('../../assets.json');

async function getNoblezaData(interaction, connection) {
  if (!connection || !connection.query) {
    throw new Error("Conexión a la base de datos no válida.");
  }

  const [rows] = await connection.query(
    "SELECT user_id, amount FROM noble_donations ORDER BY amount DESC"
  );

  return Promise.all(
    rows.map(async (row) => {
      let username = 'desconocido';
      try {
        const member = await interaction.guild.members.fetch(row.user_id).catch(() => null);
        if (member) {
          username = member.user.username;
        } else {
          const user = await interaction.client.users.fetch(row.user_id).catch(() => null);
          if (user) {
            username = user.username;
          }
        }
      } catch (error) {
        console.error(`Error al obtener el usuario ${row.user_id}:`, error);
      }
      return { user_id: row.user_id, username, amount: row.amount };
    })
  );
}

async function createNoblezaEmbed(interaction, connection) {
  if (!connection || !connection.query) {
    throw new Error("Conexión a la base de datos no válida.");
  }

  const noblezaData = await getNoblezaData(interaction, connection);
  const [roles] = await connection.query("SELECT id, emoji, title, min_donation, `limit` FROM noble_roles ORDER BY id ASC");

  const sortedUsers = noblezaData.sort((a, b) => b.amount - a.amount);
  const assignedUsers = new Set();

  const fields = roles.map(role => {
    let usersInRole = sortedUsers.filter(user => user.amount >= role.min_donation && !assignedUsers.has(user.user_id));
    usersInRole = usersInRole.slice(0, role.limit);
    usersInRole.forEach(user => assignedUsers.add(user.user_id));
    return {
      name: `${role.emoji} ${role.title}`,
      value: usersInRole.length ? usersInRole.map(user => `<@${user.user_id}> - ${user.amount.toLocaleString()}`).join("\n") : 'Vacío',
      inline: false
    };
  });

  return new EmbedBuilder()
    .setColor(assets.color.base)
    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
    .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
    .setTitle(`🏰 Nobleza de Arkania`)
    .setDescription('El Sistema de Nobleza en Arkania otorga títulos especiales a los jugadores que invierten monedas en el servidor. Cuanto más donas, más alto puedes ascender en la jerarquía nobiliaria.')
    .addFields(
      { name: 'Funcionamiento de los botones', value: '`🔃` - Actualiza la tabla de nobleza.\n`💰` - Revisa la cantidad que has donado.' }
    )
    .addFields(fields);
}

module.exports = {
  getNoblezaData,
  createNoblezaEmbed
};