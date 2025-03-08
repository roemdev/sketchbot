const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getDonationRank, getNobilityRoles } = require('./nobilityUtils');
const { getUserBalance } = require('../src/utilities/userBalanceUtils');
const assets = require('../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nobility_rank')
    .setDescription('Manejador de nobleza del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;

    // Obtener roles de nobleza
    const nobilityRoles = await getNobilityRoles(connection);
    if (!nobilityRoles || nobilityRoles.length === 0) {
      return interaction.reply({ content: 'No se encontraron roles de nobleza.', flags: MessageFlags.Ephemeral });
    }

    // Embed principal con roles de nobleza
    const rolesFields = nobilityRoles
      .map((role, index) => `**${index + 1}.** ${role.emoji || '❓'} • <@&${role.role_id || 'Sin rol'}> • Max: **${role.limit || 'Sin límite'}**`)
      .join('\n');

    const nobiEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
      .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
      .setTitle('🏰 Nobleza de Arkania')
      .setDescription('El Sistema de Nobleza en Arkania otorga títulos especiales a los jugadores que invierten monedas en el servidor.')
      .addFields(
        { name: 'Títulos disponibles', value: rolesFields },
        { name: 'Botones disponibles', value: '`🔃` - Actualiza el ranking.\n`💰` - Ver mi donación.' }
      );

    // Embed de ranking de donaciones
    const topDonors = await getDonationRank(connection);
    const rankDescription = topDonors
      .map((donor, index) => `**${index + 1}.** <@${donor.user_id}> • ⏣${donor.amount.toLocaleString()} monedas`)
      .join('\n') || "Aún no hay donaciones.";

    const rankEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setDescription(rankDescription);

    // Botones de acción (sin el botón de donar)
    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('update').setEmoji('🔃').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('my_donation').setEmoji('💰').setStyle(ButtonStyle.Secondary)
      );

    // Enviar mensaje inicial
    interaction.reply({ content: 'Enviado', flags: MessageFlags.Ephemeral });
    const nobiMessage = await interaction.channel.send({ embeds: [nobiEmbed, rankEmbed], components: [buttons] });

    // Coleccionista de botones
    const collector = nobiMessage.createMessageComponentCollector();

    collector.on('collect', async (i) => {
      if (i.customId === 'update') {
        await i.deferUpdate(); // Evita el error de doble respuesta

        // Obtener ranking actualizado
        const updatedDonors = await getDonationRank(connection);
        const updatedDescription = updatedDonors
          .map((donor, index) => `**${index + 1}.** <@${donor.user_id}> • ⏣${donor.amount.toLocaleString()} monedas`)
          .join('\n') || "Aún no hay donaciones.";

        const updatedRankEmbed = new EmbedBuilder()
          .setColor(assets.color.base)
          .setDescription(updatedDescription);

        await i.editReply({ embeds: [nobiEmbed, updatedRankEmbed], components: [buttons] });
        await i.followUp({
          embeds: [new EmbedBuilder()
            .setColor(assets.color.green)
            .setTitle('Ranking actualizado')
          ], flags: MessageFlags.Ephemeral
        });

      } else if (i.customId === 'my_donation') {
        await i.reply({ flags: MessageFlags.Ephemeral });

        const userDonation = await getUserBalance(connection, i.user.id);
        await i.followUp({
          embeds: [new EmbedBuilder()
            .setColor(assets.color.base)
            .setTitle(`Total donado: ⏣${userDonation.toLocaleString()}`)
          ]
        });
      }
    });
  }
};