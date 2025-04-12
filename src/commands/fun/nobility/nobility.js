const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
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
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setTitle('🏅 Nobleza de Arkania')
      .setDescription('El Sistema de Nobleza en Arkania otorga títulos especiales a los jugadores que invierten monedas en el servidor.')
      .addFields(
        {
          name: 'Uso de los botones',
          value: '`🔃` — **Actualizar** el ranking de donaciones.\n `💰` — **Ver** el total que has donado.\n`✨` — **Reclamar** el rol de tu posición.\n`🪙` — **Realizar** donaciones.'
        },
        {
          name: 'Roles por posición',
          value: '1. <:gold:1346278212140925010> <@&1247699315908935680> (1 cupo).\n2. <:silver:1346278268080488499> <@&1324225993384136704> (2 cupos).\n3. <:bronze:1346278287319629824> <@&1284145958149554309> (3 cupos).'
        }
      )

    const buttons = createButtons();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const nobiMessage = await interaction.channel.send({ embeds: [nobiEmbed], components: [buttons] });
    await interaction.deleteReply();

    const collector = nobiMessage.createMessageComponentCollector();
    collector.on('collect', async (i) => handleButtonInteraction(i));

    interaction.client.on('interactionCreate', async (modalInteraction) => {
      if (modalInteraction.isModalSubmit() && modalInteraction.customId === 'donation_modal') {
        await handleModalInteraction(modalInteraction, connection, userId);
      }
    });
  }
};