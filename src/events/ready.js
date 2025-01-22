const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // Configurar presencia del bot
    client.user.setPresence({
      activities: [{ name: '/ayuda', type: ActivityType.Listening }],
      status: "online",
    });

    // Gestionar roles temporales
    const connection = client.dbConnection;

    try {
      const [rows] = await connection.query('SELECT * FROM currency_user_temporary_roles');
      const now = Date.now();

      for (const row of rows) {
        const timeRemaining = new Date(row.expiration_time).getTime() - now;

        if (timeRemaining <= 0) {
          // Rol ya expirado, eliminarlo inmediatamente
          const guild = client.guilds.cache.get(row.guild_id);
          if (guild) {
            const member = await guild.members.fetch(row.user_id).catch(() => null);
            if (member && member.roles.cache.has(row.role_id)) {
              await member.roles.remove(row.role_id);
            }
          }
          await connection.query(
            'DELETE FROM currency_user_temporary_roles WHERE user_id = ? AND role_id = ? AND guild_id = ?',
            [row.user_id, row.role_id, row.guild_id]
          );
        } else {
          // Programar la eliminación
          setTimeout(async () => {
            try {
              const guild = client.guilds.cache.get(row.guild_id);
              if (guild) {
                const member = await guild.members.fetch(row.user_id).catch(() => null);
                if (member && member.roles.cache.has(row.role_id)) {
                  await member.roles.remove(row.role_id);
                }
              }
              await connection.query(
                'DELETE FROM currency_user_temporary_roles WHERE user_id = ? AND role_id = ? AND guild_id = ?',
                [row.user_id, row.role_id, row.guild_id]
              );
            } catch (err) {
              console.error(`Error al remover el rol temporal para el usuario ${row.user_id}:`, err);
            }
          }, timeRemaining);
        }
      }
    } catch (error) {
      console.error('Error al procesar roles temporales al iniciar:', error);
    }
  },
};
