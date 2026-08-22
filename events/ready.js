const { Events, ActivityType } = require('discord.js');
const chalk = require('chalk');
const supabase = require("../services/dbService"); // Importamos la conexión de Supabase
const voiceXpService = require("../services/voiceXpService");
const giveawayService = require("../services/giveawayService");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    client.user.setPresence({
      activities: [{ type: ActivityType.Custom, name: 'ARKANIA ⚔️' }],
      status: 'online',
    });

    let dbStatus = chalk.green('CONNECTED');
    let tempVCsStatus = chalk.gray('None active/empty');
    let voiceXpStatus = chalk.green('ACTIVE');

    // --- LIMPIEZA Y RESTAURACIÓN DE CANALES TEMPORALES ---
    if (!client.tempVCs) {
      client.tempVCs = new Map();
    }

    let eliminados = 0;
    let restaurados = 0;

    try {
      // Migración a Supabase: Obtener todos los canales temporales
      const { data: rows, error: selectError } = await supabase
          .from("temp_channels")
          .select("*");

      if (selectError) throw selectError;

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

      if (restaurados > 0 || eliminados > 0) {
        tempVCsStatus = chalk.green(`Restored: ${restaurados} | Cleaned: ${eliminados}`);
      }

    } catch (error) {
      dbStatus = chalk.red('ERROR');
      tempVCsStatus = chalk.red('FAILED');
      console.error(chalk.red("Error al limpiar los canales temporales en el arranque (Supabase):"), error);
    }

    // --- INICIALIZAR SISTEMA DE EXPERIENCIA POR VOZ ---
    try {
      voiceXpService.init(client);
    } catch (xpError) {
      voiceXpStatus = chalk.red('FAILED');
      console.error(chalk.red("Error al inicializar el sistema de experiencia por voz:"), xpError);
    }

    // --- REANUDAR SORTEOS ACTIVOS ---
    try {
      giveawayService.resumeActiveGiveaways(client, giveawayService.resolveGiveaway);
    } catch (gwError) {
      console.error("[SORTEOS] Error al reanudar los sorteos activos:", gwError);
    }

    // --- MOSTRAR BANNER Y DIAGNÓSTICO ESTÉTICO ---
    const banner = chalk.cyan.bold(
`   __ _        _   _     _           _   
  / _\\ | _____| |_| |__ | |__   ___ | |_ 
  \\ \\| |/ / _ \\ __| '_ \\| '_ \\ / _ \\| __|
  _\\ \\   <  __/ |_| | | | |_) | (_) | |_ 
  \\__/_|\\_\\___|\\__|_| |_|_.__/ \\___/ \\__|`
    );

    const separator = chalk.gray('═══════════════════════════════════════════════════');

    console.log('\n' + banner);
    console.log(separator);
    console.log(`🤖 ${chalk.bold('IDENTITY')}   ::  ${chalk.yellow(client.user.tag)}`);
    console.log(`🌐 ${chalk.bold('GUILDS')}     ::  ${chalk.magenta(`${client.guilds.cache.size} server(s)`)}`);
    console.log(`🔌 ${chalk.bold('DATABASE')}   ::  ${dbStatus}`);
    console.log(`🎙️  ${chalk.bold('TEMP VCs')}   ::  ${tempVCsStatus}`);
    console.log(`🔊 ${chalk.bold('VOICE XP')}   ::  ${voiceXpStatus}`);
    console.log(`🟢 ${chalk.bold('STATUS')}     ::  ${chalk.green('ALL SYSTEMS NOMINAL & OPERATIONAL')}`);
    console.log(separator + '\n');
  },
};