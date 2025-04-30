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
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('rol-requerido')
        .setDescription('Rol necesario para participar')
        .setRequired(false))
    .addRoleOption(option =>
      option.setName('rol-doble-entrada')
        .setDescription('Rol con doble entrada')
        .setRequired(false)),

  async execute(interaction) {
    const duration = ms(interaction.options.getString('duración'));
    const winnersCount = interaction.options.getInteger('ganadores');
    const prize = interaction.options.getString('premio');
    const roleRequired = interaction.options.getRole('rol-requerido');
    const roleDoubleEntry = interaction.options.getRole('rol-doble-entrada');
    const endDate = Math.floor((Date.now() + duration) / 1000);

    if (!duration || duration <= 0) {
      return interaction.reply({
        content: 'Duración inválida',
        flags: MessageFlags.Ephemeral
      });
    }

    // Embed del sorteo
    const giveawayEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setTitle(prize)
      .setDescription(
        `Finaliza: <t:${endDate}:R> | (<t:${endDate}:D>)\n` +
        `Host: <@${interaction.user.id}>\n` +
        `Entradas: 0\n` +
        `Ganadores: ${winnersCount}\n` +
        `${roleRequired ? `Rol requerido: <@&${roleRequired.id}>\n` : ''}`
      )
      .setTimestamp(Date.now() + duration)
      .setFooter({ text: 'Sorteo en curso' });

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('gaButton')
        .setLabel('Participar')
        .setEmoji('🎉')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [giveawayEmbed],
      components: [actionRow]
    });

    const reply = await interaction.fetchReply();

    const participants = new Collection(); // userId => { id, entries }

    // Collector de botones
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: duration
    });

    collector.on('collect', async buttonInteraction => {
      const user = buttonInteraction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      // Verifica rol requerido
      if (roleRequired && !member.roles.cache.has(roleRequired.id)) {
        return buttonInteraction.reply({
          content: `❌ Necesitas el rol <@&${roleRequired.id}> para participar.`,
          flags: MessageFlags.Ephemeral
        });
      }

      // Verifica si ya participó
      if (participants.has(user.id)) {
        return buttonInteraction.reply({
          content: '❌ Ya estás participando en el sorteo.',
          flags: MessageFlags.Ephemeral
        });
      }

      const entries = roleDoubleEntry && member.roles.cache.has(roleDoubleEntry.id) ? 2 : 1;
      participants.set(user.id, { id: user.id, entries });

      // Actualiza mensaje
      giveawayEmbed.setDescription(
        `Finaliza: <t:${endDate}:R> | (<t:${endDate}:D>)\n` +
        `Host: <@${interaction.user.id}>\n` +
        `Entradas: ${[...participants.values()].reduce((a, p) => a + p.entries, 0)}\n` +
        `Ganadores: ${winnersCount}\n` +
        `${roleRequired ? `Rol requerido: <@&${roleRequired.id}>\n` : ''}`
      );
      await reply.edit({ embeds: [giveawayEmbed] });

      return buttonInteraction.reply({
        content: '✅ ¡Estás participando en el sorteo!',
        flags: MessageFlags.Ephemeral
      });
    });

    collector.on('end', async () => {
      const pool = [];

      for (const participant of participants.values()) {
        for (let i = 0; i < participant.entries; i++) {
          pool.push(participant.id);
        }
      }

      let winners = [];

      if (pool.length === 0) {
        giveawayEmbed.setDescription('❌ Nadie participó en el sorteo.');
      } else {
        // Escoge ganadores aleatorios
        while (winners.length < winnersCount && pool.length > 0) {
          const winnerId = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
          if (!winners.includes(winnerId)) {
            winners.push(winnerId);
          }
        }

        giveawayEmbed.setDescription(
          `🎉 ¡El sorteo ha finalizado!\n` +
          `Ganadores (${winners.length}): ${winners.map(w => `<@${w}>`).join(', ')}\n` +
          `Premio: **${prize}**\n` +
          `Host: <@${interaction.user.id}>`
        );
      }

      giveawayEmbed.setFooter({ text: 'Sorteo finalizado' });

      await reply.edit({
        embeds: [giveawayEmbed],
        components: [] // Quita botones
      });
    });
  }
};

module.exports.isSubcommand = true;
