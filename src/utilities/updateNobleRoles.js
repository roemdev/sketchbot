async function updateNobleRoles(interaction, guild) {
  const connection = interaction.client.dbConnection;
  const nobleRoles = await connection.query('SELECT * FROM noble_roles ORDER BY min_donation DESC');
  const donations = await connection.query('SELECT * FROM noble_donations ORDER BY amount DESC');

  const roleAssignments = {};
  for (const role of nobleRoles) {
    roleAssignments[role.title] = [];
  }

  for (const donor of donations) {
    for (const role of nobleRoles) {
      if (donor.amount >= role.min_donation && roleAssignments[role.title].length < role.limit) {
        roleAssignments[role.title].push(donor.user_id);
        break;
      }
    }
  }

  for (const role of nobleRoles) {
    const discordRole = guild.roles.cache.get(role.role_id);
    if (!discordRole) continue;

    for (const member of guild.members.cache.values()) {
      if (roleAssignments[role.title].includes(member.id)) {
        if (!member.roles.cache.has(discordRole.id)) {
          await member.roles.add(discordRole);
        }
      } else {
        if (member.roles.cache.has(discordRole.id)) {
          await member.roles.remove(discordRole);
        }
      }
    }
  }
}

module.exports = updateNobleRoles;