const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const assets = require('../../../../config/assets.json');
const { createButtons, handleButtonInteraction, handleModalInteraction } = require('./nobilityHandler');

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
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setTitle('🏰 Nobleza de Arkania')
      .setDescription('El Sistema de Nobleza en Arkania otorga títulos especiales a los jugadores que invierten monedas en el servidor.');

    const buttons = createButtons();
    const nobiMessage = await interaction.reply({ embeds: [nobiEmbed], components: [buttons] });

    const collector = nobiMessage.createMessageComponentCollector();
    collector.on('collect', async (i) => handleButtonInteraction(i));

    interaction.client.on('interactionCreate', async (modalInteraction) => {
      if (modalInteraction.isModalSubmit() && modalInteraction.customId === 'donation_modal') {
        await handleModalInteraction(modalInteraction, connection, userId);
      }
    });
  }
};
