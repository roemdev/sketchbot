const { MessageFlags, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { toggleChannelLock, toggleChannelVisibility, handleMemberKick, handleInfoButton } = require('../utilities/channelUtils');
const { voiceChannelsMap } = require('../events/joinToCreate');
const assets = require('../../assets.json')

async function checkPermissions(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ content: 'No tienes permisos para usar este comando.', flags: MessageFlags.Ephemeral });
  }
  return null;
}

async function handleVoiceMasterCommand(interaction) {
  try {
    const permissionError = await checkPermissions(interaction);
    if (permissionError) return permissionError;

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) => ['vmLock', 'vmHide', 'vmKick', 'vmInfo', 'vmClaim'].includes(i.customId),
    });

    collector.on('collect', async (i) => {
      try {
        const voiceChannel = i.member.voice.channel;
        if (!voiceChannel) {
          return i.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setTitle(`${assets.emoji.deny} No estás en un canal de voz`)
            ],
            flags: MessageFlags.Ephemeral
          });
        }

        const owner = voiceChannelsMap.get(voiceChannel.id)

        if (i.customId === 'vmInfo') {
          return await handleInfoButton(i, voiceChannel, owner);
        }

        if (i.customId === 'vmClaim') {
          return i.reply({ content: 'Función en construcción', flags: MessageFlags.Ephemeral });
        }

        const isOwner = owner === i.user.id;
        if (!isOwner) {
          return i.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setTitle(`${assets.emoji.deny} Sin permisos`)
                .setDescription('Solo el propietario de este canal de voz puede realizar esta acción')
            ],
            flags: MessageFlags.Ephemeral
          });
        }

        switch (i.customId) {
          case 'vmLock': await toggleChannelLock(i, voiceChannel); break;
          case 'vmHide': await toggleChannelVisibility(i, voiceChannel); break;
          case 'vmKick': await handleMemberKick(i, voiceChannel); break;
        }
      } catch (error) {
        console.error(error);
        i.reply({ content: 'Ocurrió un error al procesar tu solicitud.', flags: MessageFlags.Ephemeral });
      }
    });
  } catch (error) {
    console.error(error);
  }
}

module.exports = { handleVoiceMasterCommand };
