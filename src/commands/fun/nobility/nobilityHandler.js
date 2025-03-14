const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const { addDonate, getDonation, getDonators } = require('./nobilityUtils');
const assets = require('../../../../config/assets.json')
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(__dirname, '../../botSetting.json');

// Función para leer la configuración
function readSettings() {
  if (!fs.existsSync(settingsPath)) return {};
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}

// Función para guardar la configuración
function saveSettings(data) {
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf8');
}

function createButtons() {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('nb_rank').setEmoji('🔃').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('nb_my_donation').setEmoji('💰').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('nb_claim_roles').setEmoji('✨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('nb_donate').setLabel('Donar').setEmoji('🪙').setStyle(ButtonStyle.Primary)
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

      await interaction.reply({ content: 'Función aun en desarrollo', flags: MessageFlags.Ephemeral });

    } else if (interaction.customId === 'nb_rank') {

      const donations = await getDonators(connection);

      const donationText = donations
        .map((donator, index) => `**${index + 1}.** <@${donator.user_id}> • **${donator.amount.toLocaleString()}**`)
        .join("\n") || "No hay donaciones registradas.";

      const nobiRankEmbed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle('👑 Tabla de donaciones')
        .setDescription(donationText);

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Leer el ID del mensaje desde botSetting.json
      const settings = readSettings();
      const messageId = settings.nobiRankMessageId;

      try {
        if (messageId) {
          // Intentar obtener el mensaje existente
          const existingMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);

          if (existingMessage) {
            // Si existe, editarlo
            await existingMessage.edit({ embeds: [nobiRankEmbed] });
          } else {
            // Si el mensaje no existe, enviar uno nuevo y guardar el ID
            const sentMessage = await interaction.channel.send({ embeds: [nobiRankEmbed] });
            settings.nobiRankMessageId = sentMessage.id;
            saveSettings(settings);
          }
        } else {
          // Si no hay mensaje guardado, enviar uno nuevo y guardar el ID
          const sentMessage = await interaction.channel.send({ embeds: [nobiRankEmbed] });
          settings.nobiRankMessageId = sentMessage.id;
          saveSettings(settings);
        }
      } catch (error) { }

      await interaction.deleteReply();

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