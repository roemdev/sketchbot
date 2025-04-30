const {
  SlashCommandSubcommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
  ComponentType,
  Collection
} = require('discord.js');
const assets = require('../../../../../config/assets.json');
const ms = require('ms');

function buildGiveawayEmbed({ title, endUnix, organizerId, entries, winnersCount, final = false, winnersList = '' }) {
  return new EmbedBuilder()
    .setColor(assets.color.base)
    .setTitle(title)
    .setDescription(
      `${final ? 'Finalizó' : 'Finaliza'}: <t:${endUnix}:R> | (<t:${endUnix}:f>)\n` +
      `Organizador: <@${organizerId}>\n` +
      `Entradas: **${entries}**\n` +
      `Ganadores: ${final ? winnersList || ' ' : `**${winnersCount}**`}`
    )
    .setTimestamp(new Date(endUnix * 1000));
}

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('crear')
    .setDescription('Inicia un sorteo')
    .addStringOption(option =>
      option.setName('duración')
        .setDescription('Duración del sorteo (ej: 10m, 1h, 2d)')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('ganadores')
        .setDescription('Número de ganadores')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('premio')
        .setDescription('Premio del sorteo')
        .setRequired(true)),

  async execute(interaction) {
    const durationRaw = interaction.options.getString('duración');
    const duration = ms(durationRaw);
    const winnersCount = interaction.options.getInteger('ganadores');
    const prize = interaction.options.getString('premio');

    if (!duration || isNaN(duration) || duration <= 0) {
      return interaction.reply({
        content: '⏱️ Formato de duración inválido. Usa valores como `10m`, `1h`, `2d`.',
        flags: MessageFlags.Ephemeral
      });
    }

    const endDate = new Date(Date.now() + duration);
    const endUnix = Math.floor(endDate.getTime() / 1000);

    const giveawayEmbed = buildGiveawayEmbed({
      title: prize,
      endUnix,
      organizerId: interaction.user.id,
      entries: 0,
      winnersCount
    });

    const activeButton = new ButtonBuilder()
      .setCustomId('gaButton')
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder().addComponents(activeButton);

    await interaction.reply({
      content: 'Sorteo enviado',
      flags: MessageFlags.Ephemeral
    });

    const sentMessage = await interaction.channel.send({
      embeds: [giveawayEmbed],
      components: [actionRow]
    });

    const participants = new Collection(); // userId => { id }

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: duration
    });

    collector.on('collect', async btn => {
      const userId = btn.user.id;

      if (participants.has(userId)) {
        return btn.reply({
          content: '❌ Ya estás participando en el sorteo.',
          flags: MessageFlags.Ephemeral
        });
      }

      participants.set(userId, { id: userId });

      const updatedEmbed = buildGiveawayEmbed({
        title: prize,
        endUnix,
        organizerId: interaction.user.id,
        entries: participants.size,
        winnersCount
      });

      await sentMessage.edit({ embeds: [updatedEmbed] });

      return btn.reply({
        content: '✅ ¡Estás participando en el sorteo!',
        flags: MessageFlags.Ephemeral
      });
    });

    collector.on('end', async () => {
      const pool = Array.from(participants.keys());
      const shuffled = pool.sort(() => Math.random() - 0.5);
      const winners = shuffled.slice(0, winnersCount);

      const finalEmbed = buildGiveawayEmbed({
        title: prize,
        endUnix,
        organizerId: interaction.user.id,
        entries: participants.size,
        winnersCount,
        final: true,
        winnersList: winners.length > 0 ? winners.map(w => `<@${w}>`).join(', ') : ''
      });

      const finalButton = new ButtonBuilder()
        .setLabel('Sorteo finalizado')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`);

      const finalRow = new ActionRowBuilder().addComponents(finalButton);

      await sentMessage.edit({
        embeds: [finalEmbed],
        components: [finalRow]
      });

      if (winners.length > 0) {
        await interaction.channel.send(
          `🎉 ¡Felicidades ${winners.map(w => `<@${w}>`).join(', ')}! Ganaron **${prize}**`
        );
      } else {
        await interaction.channel.send('Nadie participó en el sorteo.');
      }
    });
  }
};

module.exports.isSubcommand = true;