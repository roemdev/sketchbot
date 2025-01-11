const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  PermissionsBitField,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const assets = require('../../assets.json');

const { voiceChannelsMap } = require('../events/joinToCreate');

module.exports = {
  name: "vm",
  description: "Controla los permisos de un canal de voz con botones interactivos.",

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      const deny = new EmbedBuilder()
        .setColor(assets.color.base)
        .setDescription(`${assets.emoji.deny} No puedes ejecutar este comando.`)
      return message.reply({ embeds: [deny], allowedMentions: { repliedUser: false } });
    }

    // Botones de control
    const buttons = [
      new ButtonBuilder()
        .setCustomId('lock')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('hide')
        .setEmoji('👁️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('kick')
        .setEmoji('🔫')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('info')
        .setEmoji('📑')
        .setStyle(ButtonStyle.Secondary)
    ];

    const buttonRow = new ActionRowBuilder().addComponents(buttons);

    // Embed inicial
    const embed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
      .setTitle('Interfaz del VoiceMaster')
      .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 1024 }))
      .setDescription('Haz clic en los botones de abajo para controlar tu canal de voz.')
      .addFields({ name: "Uso de los botones", value: "🔒 — **Bloquear** el canal de voz.\n👁️ — **Ocultar** el canal de voz.\n🔫 — **Expulsar** a alguien del canal de voz.\n📑 — **Mostrar** la información del canal de voz." });

    // Enviar el mensaje con los controles
    const sentMessage = await message.channel.send({ embeds: [embed], components: [buttonRow] });

    // Crear colector de interacciones
    const filter = (i) => buttons.some(button => button.data.custom_id === i.customId);
    const collector = sentMessage.createMessageComponentCollector({ filter });

    collector.on('collect', async (i) => {
      const userId = i.user.id;
      const voiceChannel = i.member.voice.channel;

      if (!voiceChannel) {
        const warningEmbed = new EmbedBuilder()
          .setColor(assets.color.yellow)
          .setDescription(`${assets.emoji.warn} <@${i.user.id}>: No estás **conectado** a un canal de voz.`);
        return i.reply({ embeds: [warningEmbed], flags: MessageFlags.Ephemeral });
      }

      if (i.customId === 'info') {
        await handleInfoButton(i, voiceChannel);
        return;
      }

      const isOwner = voiceChannelsMap.get(voiceChannel.id) === i.user.id;
      if (!isOwner) {
        const warningEmbed = new EmbedBuilder()
          .setColor(assets.color.yellow)
          .setDescription(`${assets.emoji.warn} <@${i.user.id}>: No eres el **propietario** de este canal de voz.`);
        return i.reply({ embeds: [warningEmbed], flags: MessageFlags.Ephemeral });
      }

      switch (i.customId) {
        case 'lock':
          await toggleChannelLock(i, voiceChannel);
          break;

        case 'hide':
          await toggleChannelVisibility(i, voiceChannel);
          break;

        case 'kick':
          await handleMemberKick(i, voiceChannel);
          break;

        default:
          break;
      }
    });

    // Eliminar el mensaje que contiene el comentario
    await message.delete();
  },
};

// Funciones de utilidad
async function toggleChannelLock(interaction, channel) {
  const isLocked = channel.permissionOverwrites.cache
    .get(channel.guild.id)
    ?.deny.has(PermissionsBitField.Flags.Connect);

  await channel.permissionOverwrites.edit(channel.guild.id, {
    [PermissionsBitField.Flags.Connect]: isLocked ? null : false,
  });

  const newState = !isLocked;
  const responseEmbed = new EmbedBuilder()
    .setColor(newState ? assets.color.yellow : assets.color.green)
    .setDescription(`${newState ? assets.emoji.warn : assets.emoji.check} <@${interaction.user.id}>: Tu canal de voz fue ${newState ? '**bloqueado**' : '**desbloqueado**'}.`);
  await interaction.reply({ embeds: [responseEmbed], flags: MessageFlags.Ephemeral });
}

async function toggleChannelVisibility(interaction, channel) {
  const isHidden = channel.permissionOverwrites.cache
    .get(channel.guild.id)
    ?.deny.has(PermissionsBitField.Flags.ViewChannel);

  await channel.permissionOverwrites.edit(channel.guild.id, {
    [PermissionsBitField.Flags.ViewChannel]: isHidden ? null : false,
  });

  const newState = !isHidden;
  const responseEmbed = new EmbedBuilder()
    .setColor(newState ? assets.color.yellow : assets.color.green)
    .setDescription(`${newState ? assets.emoji.warn : assets.emoji.check} <@${interaction.user.id}>: Tu canal de voz se ${newState ? 'se ha **ocultado**' : 'ahora es **visible**'}.`);
  await interaction.reply({ embeds: [responseEmbed], flags: MessageFlags.Ephemeral });
}

async function handleMemberKick(interaction, channel) {
  const members = [...channel.members.values()];

  if (members.length === 0) {
    const responseEmbed = new EmbedBuilder()
      .setColor(assets.color.yellow)
      .setDescription(`${assets.emoji.warn} <@${interaction.user.id}>: No hay miembros para **expulsar**.`);
    return interaction.reply({ embeds: [responseEmbed], flags: MessageFlags.Ephemeral });
  }

  const options = members.map(member => new StringSelectMenuOptionBuilder()
    .setLabel(member.user.username)
    .setValue(member.id)
  );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('selectKick')
    .setPlaceholder('Selecciona un miembro para expulsar')
    .addOptions(options);

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    content: 'Selecciona un miembro para expulsar:',
    components: [selectRow],
    flags: MessageFlags.Ephemeral,
  });

  const filter = (i) => i.customId === 'selectKick';
  const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

  collector.on('collect', async (selectInteraction) => {
    const memberId = selectInteraction.values[0];
    const member = channel.members.get(memberId);

    if (!member) {
      const responseEmbed = new EmbedBuilder()
        .setColor(assets.color.yellow)
        .setDescription(`${assets.emoji.warn} <@${interaction.user.id}>: No se pudo encontrar al miembro seleccionado.`);
      return selectInteraction.reply({ embeds: [responseEmbed], flags: MessageFlags.Ephemeral });
    }

    if (memberId === interaction.user.id) {
      const responseEmbed = new EmbedBuilder()
        .setColor(assets.color.yellow)
        .setDescription(`${assets.emoji.warn} <@${interaction.user.id}>: No puedes **expulsarte** de tu propio canal.`);
      return selectInteraction.reply({ embeds: [responseEmbed], flags: MessageFlags.Ephemeral });
    }

    await member.voice.disconnect();
    const responseEmbed = new EmbedBuilder()
      .setColor(assets.color.green)
      .setDescription(`${assets.emoji.check} <@${interaction.user.id}>: El usuario **${member.user.username}** ha sido **expulsado** de tu canal de voz.`);
    await selectInteraction.reply({ embeds: [responseEmbed], flags: MessageFlags.Ephemeral });
  });
}

async function handleInfoButton(interaction, channel) {
  if (!channel) {
    const responseEmbed = new EmbedBuilder()
      .setColor(assets.color.yellow)
      .setDescription(`${assets.emoji.warn} <@${interaction.user.id}>: No estás en un **canal de voz**.`);
    return interaction.reply({ embeds: [responseEmbed], flags: MessageFlags.Ephemeral });
  }

  const isLocked = channel.permissionOverwrites.cache
    .get(channel.guild.id)
    ?.deny.has(PermissionsBitField.Flags.Connect) || false;

  const isHidden = channel.permissionOverwrites.cache
    .get(channel.guild.id)
    ?.deny.has(PermissionsBitField.Flags.ViewChannel) || false;

  const owner = voiceChannelsMap?.get(channel.id) || 'Desconocido';
  const membersCount = channel.members.filter(member => !member.user.bot).size;
  const creationDate = `<t:${Math.floor(channel.createdAt.getTime() / 1000)}:R>`;

  const infoEmbed = new EmbedBuilder()
    .setColor(assets.color.yellow)
    .setTitle(`Nombre: ${channel.name}`)
    .setAuthor({ name: 'Información del canal de voz', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setDescription(`
      **Propietario:** <@${owner}>
      **Creado:** ${creationDate}
      **Bloqueado:** ${isLocked ? assets.emoji.check : assets.emoji.deny}
      **Invisible:** ${isHidden ? assets.emoji.check : assets.emoji.deny}
      **Online:** \`${membersCount}\`
    `);

  return interaction.reply({
    embeds: [infoEmbed],
    flags: MessageFlags.Ephemeral,
  });
}
