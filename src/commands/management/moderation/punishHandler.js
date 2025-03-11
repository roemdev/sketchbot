const { EmbedBuilder, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const ms = require('ms'); // Importamos la dependencia ms
const assets = require('../../../../config/assets.json');

async function punish(interaction, action, duration = null) {
  const user = interaction.options.getUser('usuario');
  const reason = interaction.options.getString('razón') || 'No especificada';
  const proof1 = interaction.options.getAttachment('prueba1');
  const proof2 = interaction.options.getAttachment('prueba2');
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!member) return sendError(interaction, `Usuario \`${user}\` no encontrado.`);
  if (user.id === interaction.user.id) return sendError(interaction, 'No puedes castigarte a ti mismo.');
  if (user.id === interaction.client.user.id) return sendError(interaction, 'No puedo realizar esta acción sobre mí mismo.');

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Convertir la duración con ms()
    let muteTimeMs = null;
    if (action === 'muteado' && duration) {
      muteTimeMs = ms(duration);
      if (!muteTimeMs) return sendError(interaction, 'Formato de duración inválido. Usa: `10m`, `1h`, `1d`, etc.');
      if (muteTimeMs < ms('1m') || muteTimeMs > ms('28d')) return sendError(interaction, 'El tiempo debe estar entre 1 minuto y 28 días.');
    }

    // Embed para el usuario castigado
    const actionEmbed = new EmbedBuilder()
      .setColor(assets.color.red)
      .setDescription(`**Has sido ${action}**\n**Moderador**: ${interaction.user.username}\n> **Razón**: ${reason}`);

    if (muteTimeMs) {
      actionEmbed.addFields({ name: ' ', value: `> Duración ${duration}` });
    }

    const sentFrom = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setLabel(`Enviado desde ${interaction.guild.name}`)
      .setURL('https://discord.com/channels/815280751586050098/1173781298721063014');

    const row = new ActionRowBuilder().addComponents(sentFrom);

    const dmOptions = { embeds: [actionEmbed], components: [row], files: [] };
    if (proof1) dmOptions.files.push(proof1.url);
    if (proof2) dmOptions.files.push(proof2.url);

    await user.send(dmOptions).catch(() => { });

    // Aplicar castigo
    if (action === 'expulsado') await member.kick(reason);
    else if (action === 'baneado') await member.ban({ reason });
    else if (action === 'muteado' && muteTimeMs) await member.timeout(muteTimeMs, reason);

    // Embed de éxito
    const successEmbed = new EmbedBuilder()
      .setColor(assets.color.green)
      .setDescription(`${assets.emoji.check} **${user.username}** ha sido ${action}`);

    if (muteTimeMs) {
      successEmbed.addFields({ name: ' ', value: `> Duración: ${duration}` });
    }

    return interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    console.error(error);
    return interaction.reply({ content: '❌ Hubo un error al intentar realizar la acción.', flags: MessageFlags.Ephemeral });
  }
}

// Función para errores
function sendError(interaction, message) {
  const errorEmbed = new EmbedBuilder()
    .setColor(assets.color.red)
    .setTitle(`${assets.emoji.deny} Castigo no ejecutado`)
    .setDescription(message);

  return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
}

module.exports = { punish };
