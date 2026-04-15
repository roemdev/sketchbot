const { Events, ActivityType } = require('discord.js');
const chalk = require('chalk');
const supabase = require("../services/dbService"); // Importamos la conexión de Supabase

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    client.user.setPresence({
      activities: [{ type: ActivityType.Custom, name: 'ARKANIA ⚔️' }],
      status: 'online',
    });

    console.log(chalk.green(`🟢 [ONLINE] Bot conectado como ${chalk.bold(client.user.tag)}`));

    // --- LIMPIEZA Y RESTAURACIÓN DE CANALES TEMPORALES ---
    if (!client.tempVCs) {
      client.tempVCs = new Map();
    }

    try {
      // Migración a Supabase: Obtener todos los canales temporales
      const { data: rows, error: selectError } = await supabase
          .from("temp_channels")
          .select("*");

      if (selectError) throw selectError;

      let eliminados = 0;
      let restaurados = 0;

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const channel = client.channels.cache.get(row.channel_id) || await client.channels.fetch(row.channel_id).catch(() => null);

          if (!channel) {
            // El canal ya no existe en Discord, lo borramos de la BD
            await supabase.from("temp_channels").delete().eq("channel_id", row.channel_id);
            continue;
          }

          if (channel.members.size === 0) {
            // El canal existe pero está vacío, lo eliminamos de Discord y de la BD
            await channel.delete().catch(console.error);
            await supabase.from("temp_channels").delete().eq("channel_id", row.channel_id);
            eliminados++;
          } else {
            // El canal tiene gente, lo restauramos a la memoria
            client.tempVCs.set(row.channel_id, {
              ownerId: row.owner_id
            });
            restaurados++;
          }
        }
      }

      if (eliminados > 0 || restaurados > 0) {
        console.log(chalk.blue(`[TEMP-VC] Se restauraron ${restaurados} canales y se limpiaron ${eliminados} canales vacíos.`));
      }

    } catch (error) {
      console.error(chalk.red("Error al limpiar los canales temporales en el arranque (Supabase):"), error);
    }
  },
};