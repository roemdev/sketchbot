const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, ComponentType, Collection, PermissionFlagsBits } = require('discord.js');
const assets = require('../../../../config/assets.json');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .setName('sorteo')
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
    const duration = ms(interaction.options.getString('duración'));
    const winnersCount = interaction.options.getInteger('ganadores');
    const prize = interaction.options.getString('premio');
    const endDate = new Date(Date.now() + duration);
    const endUnix = Math.floor(endDate.getTime() / 1000);

    if (!duration || duration <= 0) {
      return interaction.reply({
        content: 'Duración inválida.',
        flags: MessageFlags.Ephemeral
      });
    }

    const giveawayEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setTitle(prize)
      .setDescription(
        `Finaliza: <t:${endUnix}:R> | (<t:${endUnix}:f>)\n` +
        `Organizador: <@${interaction.user.id}>\n` +
        `Entradas: **0**\n` +
        `Ganadores: **${winnersCount}**`
      )
      .setTimestamp(endDate);

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

    const messageId = sentMessage.id;
    const connection = interaction.client.dbConnection;

    // Insertar sorteo en la base de datos
    try {
      await connection.query(`
        INSERT INTO giveaways (message_id, channel_id, guild_id, prize, winners_count, end_date, hoster_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `, [messageId, interaction.channelId, interaction.guildId, prize, winnersCount, endDate, interaction.user.id]);
    } catch (error) {
      console.error('Error al guardar el sorteo en la base de datos:', error);
    }

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

      try {
        // Verificar si el usuario es VIP
        const [vipRows] = await connection.query(`
          SELECT vip FROM curr_users WHERE id = ?
        `, [userId]);

        // Si el usuario es VIP, no se verifica el inventario y se inscribe directamente
        if (vipRows.length > 0 && vipRows[0].vip === 1) {
          participants.set(userId, { id: userId });

          // Insertar participación en la base de datos
          await connection.query(`
            INSERT INTO giveaway_entries (message_id, user_id)
            VALUES (?, ?)
          `, [messageId, userId]);

          // Actualizar entradas en el embed
          giveawayEmbed.setDescription(
            `Finaliza: <t:${endUnix}:R> | (<t:${endUnix}:f>)\n` +
            `Organizador: <@${interaction.user.id}>\n` +
            `Entradas: **${participants.size}**\n` +
            `Ganadores: **${winnersCount}**`
          );

          await sentMessage.edit({ embeds: [giveawayEmbed] });

          return btn.reply({
            content: '✅ ¡Estás participando en el sorteo!',
            flags: MessageFlags.Ephemeral
          });
        }

        // Verificar si el usuario tiene el ítem necesario si no es VIP
        const [rows] = await connection.query(`
          SELECT quantity FROM curr_user_inventory WHERE user_id = ? AND item_id = 10
        `, [userId]);

        if (rows.length === 0 || rows[0].quantity <= 0) {
          return btn.reply({
            content: '❌ No tienes el ítem necesario para participar en el sorteo. ¡Compra una entrada!',
            flags: MessageFlags.Ephemeral
          });
        }

        // Si el usuario tiene el ítem, inscribirlo en el sorteo y descontar el ítem
        participants.set(userId, { id: userId });

        // Insertar participación en la base de datos
        await connection.query(`
          INSERT INTO giveaway_entries (message_id, user_id)
          VALUES (?, ?)
        `, [messageId, userId]);

        // Descontar el ítem del inventario del usuario
        await connection.query(`
          UPDATE curr_user_inventory
          SET quantity = quantity - 1
          WHERE user_id = ? AND item_id = 10
        `, [userId]);

        // Actualizar entradas en el embed
        giveawayEmbed.setDescription(
          `Finaliza: <t:${endUnix}:R> | (<t:${endUnix}:f>)\n` +
          `Organizador: <@${interaction.user.id}>\n` +
          `Entradas: **${participants.size}**\n` +
          `Ganadores: **${winnersCount}**`
        );

        await sentMessage.edit({ embeds: [giveawayEmbed] });

        return btn.reply({
          content: '✅ ¡Estás participando en el sorteo!',
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        console.error('Error al verificar el inventario o inscribir al usuario:', error);
        return btn.reply({
          content: '❌ Hubo un error al procesar tu inscripción. Intenta de nuevo más tarde.',
          flags: MessageFlags.Ephemeral
        });
      }
    });

    collector.on('end', async () => {
      const pool = Array.from(participants.keys());
      let winners = [];

      while (winners.length < winnersCount && pool.length > 0) {
        const winnerId = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        if (!winners.includes(winnerId)) {
          winners.push(winnerId);
        }
      }

      giveawayEmbed.setDescription(
        `Finalizó: <t:${endUnix}:R> | (<t:${endUnix}:f>)\n` +
        `Organizador: <@${interaction.user.id}>\n` +
        `Entradas: **${participants.size}**\n` +
        `Ganadores: ${winners.length > 0 ? winners.map(w => `<@${w}>`).join(', ') : 'Nadie participó'}`
      );

      const finalButton = new ButtonBuilder()
        .setLabel('Sorteo finalizado')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${interaction.guildId}/${interaction.channelId}`);

      const finalRow = new ActionRowBuilder().addComponents(finalButton);

      // Marcar sorteo como inactivo
      try {
        await connection.query(`
          UPDATE giveaways
          SET is_active = 0
          WHERE message_id = ?
        `, [messageId]);
      } catch (error) {
        console.error('Error al actualizar el estado del sorteo:', error);
      }

      await sentMessage.edit({
        embeds: [giveawayEmbed],
        components: [finalRow]
      });

      if (winners.length > 0) {
        await interaction.channel.send(`¡Felicidades ${winners.map(w => `<@${w}>`).join(', ')}! Ganaron: **${prize}**`);
      } else {
        await interaction.channel.send('¡Nadie participó en el sorteo!');
      }
    });
  }
};