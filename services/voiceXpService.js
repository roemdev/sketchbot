const { ContainerBuilder, MessageFlags } = require("discord.js");
const config = require("../utils/config");
const userService = require("./userService");
const transactionService = require("./transactionService");
const roleRewardService = require("./roleRewardService");
const chalk = require("chalk");

let isRunning = false;
let xpInterval = null;

function init(client) {
  if (isRunning) return;
  isRunning = true;

  const intervalMs = config.voiceXp.intervalSeconds * 1000;
  console.log(chalk.green(`🎙️ [VOICE-XP] Iniciando sistema de experiencia por voz (Escaneo cada ${config.voiceXp.intervalSeconds} segundos).`));

  xpInterval = setInterval(() => {
    scanVoiceChannels(client);
  }, intervalMs);
}

async function scanVoiceChannels(client) {
  try {
    const guilds = client.guilds.cache;
    
    for (const [guildId, guild] of guilds) {
      // 1. Obtener la lista de usuarios en canales de voz
      const voiceStates = guild.voiceStates.cache;
      if (voiceStates.size === 0) continue;

      const afkChannelId = config.voiceXp.afkChannelId;
      const officialAfkChannelId = guild.afkChannelId;

      for (const [memberId, voiceState] of voiceStates) {
        const member = voiceState.member;
        
        // 2. Filtros de validación para farmear XP
        if (!member || member.user.bot) continue; // No bots
        if (!voiceState.channelId) continue; // No desconectados
        if (voiceState.channelId === officialAfkChannelId) continue; // No canal AFK oficial de Discord
        if (afkChannelId && voiceState.channelId === afkChannelId) continue; // No canal AFK personalizado

        // 3. Generar XP aleatoria
        const minXp = config.levels.minXpEarn;
        const maxXp = config.levels.maxXpEarn;
        const xpEarned = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;

        try {
          // 4. Agregar experiencia al usuario
          const xpInfo = await userService.addXp(member.id, xpEarned, member.user.username);
          
          if (xpInfo && xpInfo.leveledUp) {
            // 5. Entregar premio en monedas
            const baseCoin = config.levels.baseCoinReward;
            const coinReward = xpInfo.level * baseCoin;
            await userService.addBalance("server_bank", -coinReward, false);
            await transactionService.logTransaction({ discordId: "server_bank", type: "bank_withdrawal", amount: -coinReward, itemName: `Premio de nivel (Voz) a <@${member.id}>` });
            await userService.addBalance(member.id, coinReward, false);

            // 6. Sincronizar roles de nivel según la tabla de supabase (sin acumulación)
            let roleAwardedText = "";
            try {
              const syncResult = await roleRewardService.syncMemberRoles(member, xpInfo.level);
              if (syncResult.added.length > 0) {
                const addedRoleNames = syncResult.added
                  .map(id => guild.roles.cache.get(id)?.name)
                  .filter(Boolean);
                if (addedRoleNames.length > 0) {
                  roleAwardedText = `\n🎖️ ¡Has recibido el rol **${addedRoleNames[0]}**!`;
                }
              }
            } catch (roleError) {
              console.error(chalk.red(`[VOICE-XP] Error al sincronizar roles de nivel para ${member.user.username}:`), roleError);
            }

            // 7. Enviar mensaje de subida de nivel
            const targetChannelId = config.voiceXp.levelUpChannelId;
            let targetChannel = null;

            if (targetChannelId) {
              targetChannel = guild.channels.cache.get(targetChannelId) || 
                              await guild.channels.fetch(targetChannelId).catch(() => null);
            }

            // Crear un panel elegante usando Componentes V2
            const COIN = config.emojis.coin;
            const XP = config.emojis.xp;
            const levelUpContainer = new ContainerBuilder()
              .setAccentColor(0x27AE60) // Verde éxito tenue
              .addTextDisplayComponents(t =>
                t.setContent(
                  `### 🌟 ¡Subida de Nivel! 🌟\n` +
                  `¡Felicidades <@${member.id}>! Has subido al **nivel ${xpInfo.level}** **${XP}**\n\n` +
                  `💰 **Premio:** **${COIN}${coinReward.toLocaleString("es-DO")}** monedas` +
                  `${roleAwardedText}`
                )
              );

            if (targetChannel && targetChannel.isTextBased()) {
              await targetChannel.send({ 
                components: [levelUpContainer], 
                flags: MessageFlags.IsComponentsV2 
              }).catch(err => {
                console.error(chalk.red(`[VOICE-XP] No se pudo enviar el anuncio al canal configurado: ${err.message}`));
              });
            } else {
              console.log(chalk.yellow(`[VOICE-XP] No se pudo enviar mensaje público de subida de nivel de ${member.user.username} porque el canal no es válido o no está configurado.`));
            }
          }
        } catch (dbError) {
          console.error(chalk.red(`[VOICE-XP] Error al actualizar XP del usuario ${member.user.username}:`), dbError);
        }
      }
    }
  } catch (error) {
    console.error(chalk.red("[VOICE-XP] Error en el ciclo de escaneo de canales de voz:"), error);
  }
}

module.exports = {
  init
};
