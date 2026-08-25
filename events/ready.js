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

      // 1. Restaurar desde Supabase
      if (rows && rows.length > 0) {
        for (const row of rows) {
          const channel = client.channels.cache.get(row.channel_id) || await client.channels.fetch(row.channel_id).catch(() => null);

          if (!channel) {
            await supabase.from("temp_channels").delete().eq("channel_id", row.channel_id);
            continue;
          }

          if (channel.members.size === 0) {
            await channel.delete().catch(console.error);
            await supabase.from("temp_channels").delete().eq("channel_id", row.channel_id);
            eliminados++;
          } else {
            client.tempVCs.set(row.channel_id, {
              ownerId: row.owner_id
            });
            restaurados++;
          }
        }
      }

      // 2. Escanear canales huérfanos directamente en los servidores
      const config = require("../utils/config");
      const joinChannelId = config.voice.vcJoinChannel;
      
      for (const guild of client.guilds.cache.values()) {
          const joinChannel = guild.channels.cache.get(joinChannelId) || await guild.channels.fetch(joinChannelId).catch(() => null);
          if (joinChannel && joinChannel.parentId) {
              const category = guild.channels.cache.get(joinChannel.parentId) || await guild.channels.fetch(joinChannel.parentId).catch(() => null);
              if (category) {
                  // Obtener canales de voz en esa categoría que no sean el canal de unirse
                  const voiceChannels = category.children.cache.filter(c => c.isVoiceBased() && c.id !== joinChannelId);
                  for (const [id, channel] of voiceChannels) {
                      // Si no fue procesado por Supabase
                      if (!client.tempVCs.has(id)) {
                          if (channel.members.size === 0) {
                              await channel.delete().catch(console.error);
                              eliminados++;
                          } else {
                              const owner = channel.members.first();
                              client.tempVCs.set(id, { ownerId: owner.id });
                              // Lo guardamos en Supabase para que no siga huérfano
                              const { error: insertErr } = await supabase.from("temp_channels").insert({ channel_id: id, owner_id: owner.id });
                              if (insertErr) console.error("Error guardando canal temporal en DB:", insertErr);
                              restaurados++;
                          }
                      }
                  }
              }
          }
      }

      if (restaurados > 0 || eliminados > 0) {
        tempVCsStatus = chalk.green(`Restored: ${restaurados} | Cleaned: ${eliminados}`);
      }
      // Actualizar el estado visual si hay canales activos pero no se restauraron ni eliminaron esta vez
      else if (client.tempVCs.size > 0) {
        tempVCsStatus = chalk.green(`${client.tempVCs.size} active`);
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
    let giveawaysStatus = chalk.gray('None active');
    try {
      const activeCount = await giveawayService.resumeActiveGiveaways(client, giveawayService.resolveGiveaway);
      if (activeCount > 0) {
        giveawaysStatus = chalk.green(`Resumed: ${activeCount} active`);
      }
    } catch (gwError) {
      giveawaysStatus = chalk.red('FAILED');
      console.error(chalk.red("[SORTEOS] Error al reanudar los sorteos activos:"), gwError);
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
    console.log(`🎁 ${chalk.bold('GIVEAWAYS')}  ::  ${giveawaysStatus}`);
    console.log(`🟢 ${chalk.bold('STATUS')}     ::  ${chalk.green('ALL SYSTEMS NOMINAL & OPERATIONAL')}`);
    console.log(separator + '\n');
  },
};