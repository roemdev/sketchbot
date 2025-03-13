const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');
const assets = require('../../../../config/assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nobility')
    .setDescription('Manejador de nobleza del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    // Embed principal
    const nobiEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setTitle('🏰 Nobleza de Arkania')
      .setDescription('El Sistema de Nobleza en Arkania otorga títulos especiales a los jugadores que invierten monedas en el servidor.');

    // Botones
    const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('update').setEmoji('🔃').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('my_donation').setEmoji('💰').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('claim_roles').setEmoji('✨').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('donate').setLabel('Donar').setEmoji('💵').setStyle(ButtonStyle.Primary)
      );

    // Enviar mensaje inicial
    const nobiMessage = await interaction.reply({ embeds: [nobiEmbed], components: [buttons] });

    // Coleccionista de botones
    const collector = nobiMessage.createMessageComponentCollector();

    collector.on('collect', async (i) => {
      if (i.customId === 'update') {
        await i.reply({ content: 'Presionaste el botón 🔃 Actualizar.', flags: MessageFlags.Ephemeral });
      } else if (i.customId === 'my_donation') {
        await i.reply({ content: 'Presionaste el botón 💰 Mi Donación.', flags: MessageFlags.Ephemeral });
      } else if (i.customId === 'claim_roles') {
        await i.reply({ content: 'Presionaste el botón Claim Roles.', flags: MessageFlags.Ephemeral });
      } else if (i.customId === 'donate') {
        // Modal para donar
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

        await i.showModal(modal);
      }
    });

    // Coleccionista de modales
    interaction.client.on('interactionCreate', async (modalInteraction) => {
      if (!modalInteraction.isModalSubmit() || modalInteraction.customId !== 'donation_modal') return;

      const amount = modalInteraction.fields.getTextInputValue('donation_amount');
      if (!/^[1-9]\d*$/.test(amount)) {
        return modalInteraction.reply({ content: '⚠️ Ingresa una cantidad válida (solo números enteros positivos).', flags: MessageFlags.Ephemeral });
      }

      await modalInteraction.reply({ content: `Has donado ⏣${amount} monedas. ¡Gracias por tu apoyo!`, flags: MessageFlags.Ephemeral });
    });
  }
};
