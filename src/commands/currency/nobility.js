const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const { addDonation, getDonationRank, getNobilityRoles } = require('../../utilities/nobilityUtils');
const { getUserBalance, updateUserBalance } = require('../../utilities/userBalanceUtils');
const assets = require('../../../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nobleza')
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
        { name: 'Botones disponibles', value: '`🔃` - Actualiza el ranking.\n`💰` - Ver mi donación.\n`💎` - Donar monedas.' }
      );

    // Embed de ranking de donaciones
    const topDonors = await getDonationRank(connection);
    const rankDescription = topDonors
      .map((donor, index) => `**${index + 1}.** <@${donor.user_id}> • ⏣${donor.amount.toLocaleString()} monedas`)
      .join('\n') || "Aún no hay donaciones.";

    const rankEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setDescription(rankDescription);

    // Botones de acción
    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('update').setEmoji('🔃').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('my_donation').setEmoji('💰').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('donate').setLabel('Donar monedas').setStyle(ButtonStyle.Primary)
      );

    // Enviar mensaje inicial
    const nobiMessage = await interaction.reply({ embeds: [nobiEmbed, rankEmbed], components: [buttons] });

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
        await i.deferReply({ flags: MessageFlags.Ephemeral });

        const userDonation = await getUserBalance(connection, i.user.id);
        await i.followUp({
          embeds: [new EmbedBuilder()
            .setColor(assets.color.base)
            .setDescription(`Total donado: ⏣${userDonation.toLocaleString()}`)
          ]
        });

      } else if (i.customId === 'donate') {
        const modal = new ModalBuilder()
          .setCustomId('donate_modal')
          .setTitle('Donación de monedas');

        const amountInput = new TextInputBuilder()
          .setCustomId('donation_amount')
          .setLabel('Cantidad a donar')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(amountInput));

        await i.showModal(modal);
      }
    });

    // Manejo de la modal de donación
    interaction.client.on('interactionCreate', async (modalInteraction) => {
      if (!modalInteraction.isModalSubmit() || modalInteraction.customId !== 'donate_modal') return;

      await modalInteraction.deferReply({ flags: MessageFlags.Ephemeral });

      const amount = parseInt(modalInteraction.fields.getTextInputValue('donation_amount'), 10);
      if (isNaN(amount) || amount <= 0) {
        return modalInteraction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle('Ingresa una cantidad válida')
          ], flags: MessageFlags.Ephemeral
        });
      }

      // Verificar balance del usuario
      const userBalance = await getUserBalance(connection, modalInteraction.user.id);
      if (userBalance < amount) {
        return modalInteraction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(assets.color.red)
            .setTitle('No tienes suficientes créditos')
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      // Restar balance y registrar donación
      await updateUserBalance(connection, modalInteraction.user.id, -amount);
      await addDonation(connection, modalInteraction.user.id, amount);

      await modalInteraction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.green)
          .setTitle(`Has donado ⏣${amount.toLocaleString()} monedas.`)
        ],
        flags: MessageFlags.Ephemeral
      });

      // Actualizar ranking tras donación
      const updatedDonors = await getDonationRank(connection);
      const updatedDescription = updatedDonors
        .map((donor, index) => `**${index + 1}.** <@${donor.user_id}> • ⏣${donor.amount.toLocaleString()} monedas`)
        .join('\n') || "Aún no hay donaciones.";

      const updatedRankEmbed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setDescription(updatedDescription);

      await nobiMessage.edit({ embeds: [nobiEmbed, updatedRankEmbed], components: [buttons] });
    });
  }
};
