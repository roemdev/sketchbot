const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, PermissionFlagsBits, TextInputStyle, MessageFlags } = require('discord.js');
const { getUserBalance, updateUserBalance } = require('../../utilities/userBalanceUtils');
const updateNobleRoles = require('../../utilities/updateNobleRoles');
const assets = require('../../../assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nobleza')
    .setDescription('Manejador de nobleza del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;

    async function getNoblezaData() {
      const [rows] = await connection.query(
        "SELECT user_id, amount FROM noble_donations ORDER BY amount DESC LIMIT 6"
      );

      return Promise.all(
        rows.map(async (row, index) => {
          let username = 'desconocido';

          try {
            const member = await interaction.guild.members.fetch(row.user_id).catch(() => null);
            if (member) {
              username = member.user.username;
            } else {
              const user = await interaction.client.users.fetch(row.user_id).catch(() => null);
              if (user) {
                username = user.username;
              }
            }
          } catch (error) {
            console.error(`Error al obtener el usuario ${row.user_id}:`, error);
          }

          return `**${index + 1}.** ${username} - ${row.amount.toLocaleString()}`;
        })
      );
    }

    async function createNoblezaEmbed() {
      const descriptionArray = await getNoblezaData();

      return new EmbedBuilder()
        .setColor(assets.color.base)
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTitle(`🏰 Nobleza de Arkania`)
        .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
        .setDescription(descriptionArray.length ? descriptionArray.join("\n") : 'No hay datos');
    }

    const updateNobi = new ButtonBuilder()
      .setCustomId('update')
      .setLabel(' ')
      .setEmoji('🔃')
      .setStyle(ButtonStyle.Secondary);

    const donateButton = new ButtonBuilder()
      .setCustomId('donate')
      .setLabel('Donar monedas')
      .setStyle(ButtonStyle.Secondary);

    const actionRow = new ActionRowBuilder()
      .addComponents(updateNobi, donateButton);

    const nobiEmbed = await createNoblezaEmbed();
    const message = await interaction.reply({ embeds: [nobiEmbed], components: [actionRow], fetchReply: true });

    const filter = (i) => ['update', 'donate'].includes(i.customId);
    const collector = message.createMessageComponentCollector({ filter });

    collector.on('collect', async (i) => {
      if (i.customId === 'update') {
        await i.deferUpdate();
        const updatedEmbed = await createNoblezaEmbed();
        await interaction.editReply({ embeds: [updatedEmbed] });
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
        modalInteraction = await i.awaitModalSubmit({ filter: modalFilter, time: 60000 }).catch(() => null);

        if (!modalInteraction) return;

        const donationAmount = modalInteraction.fields.getTextInputValue('donationAmount');

        if (isNaN(donationAmount) || parseInt(donationAmount) <= 0) {
          return modalInteraction.reply({ content: 'La cantidad debe ser un número positivo.', flags: MessageFlags.Ephemeral });
        }

        const userId = i.user.id;
        const amount = parseInt(donationAmount);
        const balance = await getUserBalance(connection, userId);

        if (balance < amount) {
          return modalInteraction.reply({ content: 'No tienes suficiente dinero para donar esa cantidad.', flags: MessageFlags.Ephemeral });
        }

        await updateUserBalance(connection, userId, -amount);
        await connection.query(`
          INSERT INTO noble_donations (user_id, amount) VALUES (?, ?)
          ON DUPLICATE KEY UPDATE amount = amount + ?
        `, [userId, amount, amount]);

        await updateNobleRoles(i, i.guild);

        await modalInteraction.reply({ content: `Has donado **${amount}** monedas. ¡Gracias por tu generosidad!`, flags: MessageFlags.Ephemeral });

        // Actualizar el embed después de la donación
        const updatedEmbed = await createNoblezaEmbed();
        await interaction.editReply({ embeds: [updatedEmbed] });
      }
    });
  }
};
