const { PermissionsBitField, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const assets = require('../../../../assets.json');

async function modifyChannelPermission(channel, permission, value) {
  await channel.permissionOverwrites.edit(channel.guild.id, { [permission]: value });
}

async function toggleChannelLock(interaction, channel) {
  const isLocked = channel.permissionOverwrites.cache.get(channel.guild.id)?.deny.has(PermissionsBitField.Flags.Connect);
  // Si está bloqueado, se elimina la restricción; si no, se deniega el permiso de conexión.
  const action = isLocked ? null : false;

  await modifyChannelPermission(channel, PermissionsBitField.Flags.Connect, action);

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(assets.color.green)
        .setTitle(`${assets.emoji.check} Canal ${isLocked ? 'desbloqueado' : 'bloqueado'}`)
    ],
    flags: MessageFlags.Ephemeral
  });
}

async function toggleChannelVisibility(interaction, channel) {
  const isHidden = channel.permissionOverwrites.cache.get(channel.guild.id)?.deny.has(PermissionsBitField.Flags.ViewChannel);
  // Si está oculto, se elimina la restricción; si no, se deniega el permiso de ver el canal.
  const action = isHidden ? null : false;

  await modifyChannelPermission(channel, PermissionsBitField.Flags.ViewChannel, action);

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(assets.color.green)
        .setTitle(`${assets.emoji.check} Canal ${isHidden ? 'visible' : 'oculto'}`)
    ],
    flags: MessageFlags.Ephemeral
  });
}

async function handleMemberKick(interaction, channel) {
  const members = [...channel.members.values()];
  if (members.length === 0) {
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} No hay miembros para expulsar`)
      ],
      flags: MessageFlags.Ephemeral
    });
  }

  const options = members.map((member) =>
    new StringSelectMenuOptionBuilder()
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
    flags: MessageFlags.Ephemeral
  });

  const collector = interaction.channel.createMessageComponentCollector({ filter: (i) => i.customId === 'selectKick', time: 15000 });

  collector.on('collect', async (selectInteraction) => {
    const memberId = selectInteraction.values[0];
    const member = channel.members.get(memberId);

    if (!member) {
      return await selectInteraction.reply({
        content: 'No se encontró al miembro seleccionado.',
        flags: MessageFlags.Ephemeral
      });
    }

    await member.voice.disconnect();
    await selectInteraction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(assets.color.green)
          .setTitle(`${assets.emoji.check} Usuario expulsado`)
          .setDescription(`El usuario **${member.user.username}** fue expulsado.`)
      ],
      flags: MessageFlags.Ephemeral
    });
  });
}

async function handleInfoButton(interaction, channel, owner) {
  const isLocked = channel.permissionOverwrites.cache.get(channel.guild.id)?.deny.has(PermissionsBitField.Flags.Connect);
  const isHidden = channel.permissionOverwrites.cache.get(channel.guild.id)?.deny.has(PermissionsBitField.Flags.ViewChannel);

  const infoEmbed = new EmbedBuilder()
    .setColor(assets.color.base)
    .setTitle('Información del Canal')
    .setDescription(
      `**Nombre:** ${channel.name}\n` +
      `**Propietario:** ${owner ? `<@${owner}>` : 'Desconocido'}\n` +
      `**Creación:** <t:${Math.floor(channel.createdAt.getTime() / 1000)}:R>\n` +
      `**Bloqueado:** ${isLocked ? assets.emoji.check : assets.emoji.deny}\n` +
      `**Invisible:** ${isHidden ? assets.emoji.check : assets.emoji.deny}\n` +
      `**Online:** ${channel.members.size}\n`
    );

  return interaction.followUp({ embeds: [infoEmbed], flags: MessageFlags.Ephemeral });
}

module.exports = { toggleChannelLock, toggleChannelVisibility, handleMemberKick, handleInfoButton };
