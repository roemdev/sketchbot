const { EmbedBuilder, MessageFlags } = require('discord.js');
const { toggleChannelLock, toggleChannelVisibility, handleMemberKick, handleInfoButton } = require('../utilities/channelUtils');
const { voiceChannelsMap } = require('../events/joinToCreate');
const assets = require('../../assets.json');

async function handleVoiceMasterCommand(interaction) {
  try {
    const filter = (i) => ['vmLock', 'vmHide', 'vmKick', 'vmInfo', 'vmClaim'].includes(i.customId);

    const collector = interaction.channel.createMessageComponentCollector({ filter });

    collector.on('collect', async (i) => {
      try {
        if (!i.isButton()) return;

        collector.stop();

        if (!i.deferred && !i.replied) {
          await i.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        const voiceChannel = i.member.voice.channel;
        if (!voiceChannel) {
          return await i.followUp({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setTitle(`${assets.emoji.deny} No estás en un canal de voz`)
            ],
            flags: MessageFlags.Ephemeral
          }).catch(() => { });
        }

        const owner = voiceChannelsMap.get(voiceChannel.id);

        if (i.customId === 'vmInfo') {
          return await handleInfoButton(i, voiceChannel, owner);
        }

        if (i.customId === 'vmClaim') {
          return await i.followUp({ content: 'Función en construcción', flags: MessageFlags.Ephemeral }).catch(() => { });
        }

        const isOwner = owner === i.user.id;
        if (!isOwner) {
          return await i.followUp({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setTitle(`${assets.emoji.deny} Sin permisos`)
                .setDescription('Solo el propietario de este canal de voz puede realizar esta acción')
            ],
            flags: MessageFlags.Ephemeral
          }).catch(() => { });
        }

        switch (i.customId) {
          case 'vmLock':
            await toggleChannelLock(i, voiceChannel);
            break;
          case 'vmHide':
            await toggleChannelVisibility(i, voiceChannel);
            break;
          case 'vmKick':
            await handleMemberKick(i, voiceChannel);
            break;
        }

      } catch (error) {
        console.error("Error en el evento de botón:", error);
        if (!i.replied && !i.deferred) {
          await i.followUp({ content: 'Ocurrió un error al procesar tu solicitud.', flags: MessageFlags.Ephemeral }).catch(() => { });
        }
      }
    });

    collector.on('end', () => { });

  } catch (error) {
    console.error("Error en handleVoiceMasterCommand:", error);
  }
}

module.exports = { handleVoiceMasterCommand };
