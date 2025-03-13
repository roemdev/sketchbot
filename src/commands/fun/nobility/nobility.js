const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const assets = require('../../../../config/assets.json');
const { createButtons, handleButtonInteraction, handleModalInteraction } = require('./nobilityHandler');
const { getDonators } = require('./nobilityUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nobility')
    .setDescription('Manejador de nobleza del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    const nobiEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setTitle('🏰 Nobleza de Arkania')
      .setDescription('El Sistema de Nobleza en Arkania otorga títulos especiales a los jugadores que invierten monedas en el servidor.');

    const donations = await getDonators(connection);

    const donationText = donations
      .map((donator, index) => `**${index + 1}.** <@${donator.user_id}> • **${donator.amount.toLocaleString()}**`)
      .join("\n") || "No hay donaciones registradas.";

    const nobiRankEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setTitle('Tabla de donaciones')
      .setDescription(donationText);

    const buttons = createButtons();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const nobiMessage = await interaction.channel.send({ embeds: [nobiEmbed, nobiRankEmbed], components: [buttons] });
    await interaction.deleteReply();

    const collector = nobiMessage.createMessageComponentCollector();
    collector.on('collect', async (i) => handleButtonInteraction(i));

    interaction.client.on('interactionCreate', async (modalInteraction) => {
      if (modalInteraction.isModalSubmit() && modalInteraction.customId === 'donation_modal') {
        await handleModalInteraction(modalInteraction, connection, userId);

        // Obtener las donaciones actualizadas
        const updatedDonations = await getDonators(connection);

        // Actualizar el embed con las nuevas donaciones
        const updatedDonationText = updatedDonations
          .map((donator, index) => `**${index + 1}.** <@${donator.user_id}> • **${donator.amount.toLocaleString()}**`)
          .join("\n") || "No hay donaciones registradas.";

        const updatedNobiRankEmbed = new EmbedBuilder()
          .setColor(assets.color.base)
          .setTitle('Tabla de donaciones')
          .setDescription(updatedDonationText);

        // Actualizar el mensaje original con los nuevos embeds
        await nobiMessage.edit({ embeds: [nobiEmbed, updatedNobiRankEmbed], components: [buttons] });
      }
    });
  }
};