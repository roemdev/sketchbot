const { MessageFlags, EmbedBuilder } = require('discord.js');
const assets = require('../../../../assets.json');

module.exports = async function handleButton(interaction) {
  const [action, giveawayId] = interaction.customId.split('_');

  if (action === 'enterButton') {
    try {
      const connection = interaction.client.dbConnection;

      const [giveaway] = await connection.query(
        `SELECT * FROM giveaways WHERE id = ? AND status = 'active'`,
        [giveawayId]
      );

      if (giveaway.length === 0) {
        return interaction.reply({
          content: 'Este sorteo ya ha terminado.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const [userInventory] = await connection.query(
        `SELECT quantity FROM currency_user_inventory WHERE user_id = ? AND store_item_id = ?`,
        [interaction.user.id, 2]
      );

      if (userInventory.length === 0 || userInventory[0].quantity < 1) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setTitle(`${assets.emoji.deny} Sin entrada`)
              .setDescription('No tienes una entrada al sorteo. Debes comprarla en la tienda.')
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      await connection.query(
        `UPDATE currency_user_inventory SET quantity = quantity - 1 WHERE user_id = ? AND store_item_id = ?`,
        [interaction.user.id, 2]
      );

      const [updatedInventory] = await connection.query(
        `SELECT quantity FROM currency_user_inventory WHERE user_id = ? AND store_item_id = ?`,
        [interaction.user.id, 2]
      );

      if (updatedInventory[0].quantity === 0) {
        await connection.query(
          `DELETE FROM currency_user_inventory WHERE user_id = ? AND store_item_id = ?`,
          [interaction.user.id, 2]
        );
      }

      const [entry] = await connection.query(
        `SELECT * FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?`,
        [giveawayId, interaction.user.id]
      );

      if (entry.length > 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setTitle(`${assets.emoji.deny} Ya estás participando`)
              .setDescription('Si deseas abandonar el sorteo, contacta al anfitrión.')
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const member = interaction.guild.members.cache.get(interaction.user.id);
      const isVIP = member.roles.cache.has('1330908811946496103');

      const [existingEntry] = await connection.query(
        `SELECT 1 FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?`,
        [giveawayId, interaction.user.id]
      );

      if (existingEntry.length > 0) {
        return interaction.reply('Ya has participado en este sorteo.');
      }

      const query = isVIP
        ? `INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?), (?, ?)`
        : `INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)`;

      await connection.query(query, isVIP ? [giveawayId, interaction.user.id, giveawayId, interaction.user.id] : [giveawayId, interaction.user.id]);

      const [entries] = await connection.query(
        `SELECT COUNT(*) AS entryCount FROM giveaway_entries WHERE giveaway_id = ?`,
        [giveawayId]
      );

      const entryCount = entries[0].entryCount;

      const channel = await interaction.client.channels.fetch(giveaway[0].channel_id);
      const message = await channel.messages.fetch(giveaway[0].message_id);

      const embed = EmbedBuilder.from(message.embeds[0]);
      let description = embed.data.description || '';
      description = description.replace(/Entradas: \*\*(\d+)\*\*/, `Entradas: **${entryCount}**`);
      embed.setDescription(description);

      await message.edit({ embeds: [embed] });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle(`${assets.emoji.check} Inscrito`)
            .setDescription('¡Has ingresado al sorteo! ¡Mucha suerte!')
        ],
        flags: MessageFlags.Ephemeral,
      });

    } catch (error) {
      console.error('Error al manejar la entrada:', error);
      await interaction.reply({
        content: 'Hubo un error al ingresar al sorteo.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
};