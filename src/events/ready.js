const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // Configurar presencia del bot
    client.user.setPresence({
      activities: [{ name: 'Arkania 💖', type: ActivityType.Custom }],
      status: "online",
    });

    // Gestionar roles temporales
    const connection = client.dbConnection;

    try {
      const [rows] = await connection.query('SELECT * FROM curr_user_active_roles');
      const now = Date.now();

      for (const row of rows) {
        const expirationTime = new Date(row.expires_at).getTime();
        const timeRemaining = expirationTime - now;

        if (timeRemaining <= 0) {
          await removeRole(client, row);
        } else {
          setTimeout(async () => {
            await removeRole(client, row);
          }, timeRemaining);
        }
      }
    } catch (error) {
      console.error('Error al procesar roles temporales al iniciar:', error);
    }
  },
};

// Función para eliminar el rol y limpiar la base de datos
async function removeRole(client, row) {
  try {
    const guilds = client.guilds.cache;

    for (const guild of guilds.values()) {
      const member = await guild.members.fetch(row.user_id).catch(() => null);
      if (member && member.roles.cache.has(row.role_id)) {
        await member.roles.remove(row.role_id);
      }
    }

    const connection = client.dbConnection;
    await connection.query(
      'DELETE FROM curr_user_active_roles WHERE user_id = ? AND role_id = ?',
      [row.user_id, row.role_id]
    );
  } catch (err) {
    console.error(`Error al remover el rol temporal para el usuario ${row.user_id}:`, err);
  }
}
