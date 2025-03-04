const {
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, MessageFlags, ActionRowBuilder
} = require('discord.js');
const { getUserBalance, updateUserBalance } = require('../utilities/userBalanceUtils');
const { updateNobleRoles } = require('../utilities/updateNobleRoles');
const { createNoblezaEmbed } = require('../utilities/nobilityUtils');
const assets = require('../../assets.json');

module.exports = (interaction, nobiMessage, connection) => {
  const filter = (i) => ['update', 'donate', 'my_donation'].includes(i.customId);
  const collector = nobiMessage.createMessageComponentCollector({ filter });

  collector.on('collect', async (i) => {
    if (i.customId === 'update') {
      await i.deferUpdate();
      if (typeof updateNobleRoles === 'function') {
        await updateNobleRoles(i);
      } else {
        console.error("Error: updateNobleRoles no está definido correctamente.");
      }
      const updatedEmbed = await createNoblezaEmbed(interaction, connection); // Pasar connection
      await nobiMessage.edit({ embeds: [updatedEmbed] });
    }

    if (i.customId === 'donate') {
      const modal = new ModalBuilder()
        .setCustomId('donation')
        .setTitle('Ingresa la cantidad a donar')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('donationAmount')
              .setLabel('Cantidad a donar')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('Ejemplo: 50000')
              .setRequired(true)
          )
        );

      await i.showModal(modal);

      const modalFilter = (modalInteraction) => modalInteraction.customId === 'donation' && modalInteraction.user.id === i.user.id;
      const modalInteraction = await i.awaitModalSubmit({ filter: modalFilter, time: 120000 }).catch(() => null);

      if (!modalInteraction) return;

      const donationAmount = modalInteraction.fields.getTextInputValue('donationAmount');

      if (isNaN(donationAmount) || parseInt(donationAmount) <= 0) {
        return modalInteraction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setTitle(`${assets.emoji.deny} Donación fallida`)
              .setDescription('La cantidad debe ser un número positivo.')
          ], flags: MessageFlags.Ephemeral
        });
      }

      const userId = i.user.id;
      const amount = parseInt(donationAmount);
      const balance = await getUserBalance(connection, userId);

      if (balance < amount) {
        return modalInteraction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setTitle(`${assets.emoji.deny} Donación fallida`)
              .setDescription('No tienes suficientes créditos para donar esta cantidad.')
          ], flags: MessageFlags.Ephemeral
        });
      }

      await updateUserBalance(connection, userId, -amount);
      await connection.query(
        `INSERT INTO noble_donations (user_id, amount) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE amount = amount + ?`,
        [userId, amount, amount]
      );

      if (typeof updateNobleRoles === 'function') {
        await updateNobleRoles(i);
      } else {
        console.error("Error: updateNobleRoles no está definido correctamente.");
      }

      await modalInteraction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle(`${assets.emoji.check} Donación exitosa`)
            .setDescription(`Has donado **⏣${amount.toLocaleString()}** y se ha sumado a tu total.`)
        ], flags: MessageFlags.Ephemeral
      });

      const updatedEmbed = await createNoblezaEmbed(interaction, connection); // Pasar connection
      await nobiMessage.edit({ embeds: [updatedEmbed] });
    }

    if (i.customId === 'my_donation') {
      const userId = i.user.id;
      const [[donationRow]] = await connection.query(
        "SELECT amount FROM noble_donations WHERE user_id = ?",
        [userId]
      );

      const userDonation = donationRow ? donationRow.amount : 0;

      await i.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.base)
            .setTitle('Tu donación')
            .setDescription(`Has donado un total de **⏣${userDonation.toLocaleString()}**.`)
        ], flags: MessageFlags.Ephemeral
      });
    }
  });
};