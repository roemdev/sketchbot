const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const { addDonate, getDonation } = require('./nobilityUtils');
const assets = require('../../../../config/assets.json')

function createButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('nb_my_donation').setEmoji('💰').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('nb_claim_roles').setEmoji('✨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('nb_donate').setLabel('Donar').setEmoji('💵').setStyle(ButtonStyle.Primary)
    );
}

async function handleButtonInteraction(interaction) {
  const connection = interaction.client.dbConnection;
  const userId = interaction.user.id;
  try {
    if (interaction.customId === 'nb_my_donation') {

      const donation = await getDonation(connection, userId)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.base)
            .setDescription(`Tu donación total es de **⏣${donation.toLocaleString()}**`)
        ], flags: MessageFlags.Ephemeral
      });

    } else if (interaction.customId === 'nb_claim_roles') {

      await interaction.reply({ content: 'Presionaste el botón ✨nb_claim_roles.', flags: MessageFlags.Ephemeral });

    } else if (interaction.customId === 'nb_donate') {

      const modal = new ModalBuilder()
        .setCustomId('donation_modal')
        .setTitle('Donar a la Nobleza')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('donation_amount')
              .setLabel('Cantidad a donar (solo números enteros)')
              .setPlaceholder('Ejemplo: 1000')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

      await interaction.showModal(modal);
    }
  } catch (error) { }
}

async function handleModalInteraction(modalInteraction, connection, userId) {
  try {
    const amount = modalInteraction.fields.getTextInputValue('donation_amount');
    if (!/^[1-9]\d*$/.test(amount)) {
      return modalInteraction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle(`${assets.emoji.deny} Cantidad inválida`)
            .setDescription(`Solo se permiten números positivos y sin decimales.`)
        ], flags: MessageFlags.Ephemeral
      });
    }

    const donation = await addDonate(connection, userId, amount);

    const embed = donation === false || donation === 0
      ? new EmbedBuilder()
        .setColor(assets.color.red)
        .setTitle(`${assets.emoji.deny} No tienes balance suficiente.`)
      : new EmbedBuilder()
        .setColor(assets.color.green)
        .setDescription(`${assets.emoji.check} Has donado **⏣${amount.toLocaleString()}** monedas.`);

    await modalInteraction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } catch (error) { }
}

module.exports = {
  createButtons,
  handleButtonInteraction,
  handleModalInteraction,
};
