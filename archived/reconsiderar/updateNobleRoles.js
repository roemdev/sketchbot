async function updateNobleRoles(interaction) {
  const guild = interaction.guild;
  const connection = interaction.client.dbConnection;

  const [noblezaData] = await connection.query("SELECT user_id, amount FROM noble_donations ORDER BY amount DESC");
  const [roles] = await connection.query("SELECT id, role_id, min_donation, `limit` FROM noble_roles ORDER BY min_donation DESC");

  const sortedUsers = noblezaData.sort((a, b) => b.amount - a.amount);

  const assignedUsers = new Set();

  // Asignar roles a los usuarios
  for (const role of roles) {
    let usersInRole = sortedUsers.filter(user => user.amount >= role.min_donation && !assignedUsers.has(user.user_id));
    usersInRole = usersInRole.slice(0, role.limit);

    for (const user of usersInRole) {
      try {
        const member = await guild.members.fetch(user.user_id).catch(() => null);
        if (member) {
          const nobleRoles = roles.map(r => r.role_id);
          await member.roles.remove(nobleRoles);

          await member.roles.add(role.role_id);
        }
      } catch (error) {
        console.error(`Error al asignar el rol a ${user.user_id}:`, error);
      }

      assignedUsers.add(user.user_id);
    }
  }
}

module.exports = { updateNobleRoles };