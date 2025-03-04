const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags
} = require('discord.js');
const { createNoblezaEmbed } = require('../../utilities/nobilityUtils');
const nobilityHandler = require('../../handlers/nobilityHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nobleza')
    .setDescription('Manejador de nobleza del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const connection = interaction.client.dbConnection; // Asegúrate de que esto esté definido
    if (!connection) {
      console.error("Error: No se pudo obtener la conexión a la base de datos.");
      return interaction.reply({ content: "Hubo un error al conectar con la base de datos.", ephemeral: true });
    }

    const nobiEmbed = await createNoblezaEmbed(interaction, connection); // Pasar connection

    const updateNobi = new ButtonBuilder()
      .setCustomId('update')
      .setLabel(' ')
      .setEmoji('🔃')
      .setStyle(ButtonStyle.Secondary);

    const myDonationButton = new ButtonBuilder()
      .setCustomId('my_donation')
      .setLabel(' ')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('💰');

    const donateButton = new ButtonBuilder()
      .setCustomId('donate')
      .setLabel('Realizar donación')
      .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder()
      .addComponents(updateNobi, myDonationButton, donateButton);

    const nobiMessage = await interaction.channel.send({ embeds: [nobiEmbed], components: [actionRow] });

    await interaction.reply({ content: "El sistema de nobleza ha sido actualizado.", flags: MessageFlags.Ephemeral });
    interaction.deleteReply();

    // Pasar el collector y la conexión al handler
    nobilityHandler(interaction, nobiMessage, connection);
  }
};