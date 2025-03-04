const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder,
  PermissionFlagsBits, TextInputStyle, MessageFlags
} = require('discord.js');
const { getUserBalance, updateUserBalance } = require('../../utilities/userBalanceUtils');
const { updateNobleRoles } = require('../../utilities/updateNobleRoles');
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
        "SELECT user_id, amount FROM noble_donations ORDER BY amount DESC"
      );

      return Promise.all(
        rows.map(async (row) => {
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
          return { user_id: row.user_id, username, amount: row.amount };
        })
      );
    }

    async function createNoblezaEmbed() {
      const noblezaData = await getNoblezaData();
      const [roles] = await connection.query("SELECT id, emoji, title, min_donation, `limit` FROM noble_roles ORDER BY id ASC");

      const sortedUsers = noblezaData.sort((a, b) => b.amount - a.amount);
      const assignedUsers = new Set();

      const fields = roles.map(role => {
        let usersInRole = sortedUsers.filter(user => user.amount >= role.min_donation && !assignedUsers.has(user.user_id));
        usersInRole = usersInRole.slice(0, role.limit);
        usersInRole.forEach(user => assignedUsers.add(user.user_id));
        return {
          name: `${role.emoji} ${role.title}`,
          value: usersInRole.length ? usersInRole.map(user => `<@${user.user_id}> - ${user.amount.toLocaleString()}`).join("\n") : 'Vacío',
          inline: true
        };
      });

      return new EmbedBuilder()
        .setColor(assets.color.base)
        .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
        .setTitle(`🏰 Nobleza de Arkania`)
        .setDescription('El Sistema de Nobleza en Arkania otorga títulos especiales a los jugadores que invierten monedas en el servidor. Cuanto más donas, más alto puedes ascender en la jerarquía nobiliaria.')
        .addFields(
          { name: 'Funcionamiento de los botones', value: '`🔃` - Actualiza la tabla de nobleza.\n`💰` - Revisa la cantidad que has donado.' }
        )
        .addFields(fields);
    }

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

    const nobiEmbed = await createNoblezaEmbed();
    const nobiMessage = await interaction.channel.send({ embeds: [nobiEmbed], components: [actionRow] });

    await interaction.reply({ content: "El sistema de nobleza ha sido actualizado.", flags: MessageFlags.Ephemeral });

    const filter = (i) => ['update', 'donate', 'my_donation'].includes(i.customId);
    const collector = nobiMessage.createMessageComponentCollector({ filter });

    collector.on('collect', async (i) => {
      if (i.customId === 'update') {
        await i.deferUpdate();
        if (typeof updateNobleRoles === 'function') {
          await updateNobleRoles(i);
        } else {
          console.error("Error: updateNobleRoles no está definido correctamente.");
        }
        const updatedEmbed = await createNoblezaEmbed();
        await nobiMessage.edit({ embeds: [updatedEmbed] });
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
        const modalInteraction = await i.awaitModalSubmit({ filter: modalFilter, time: 120000 }).catch(() => null);

        if (!modalInteraction) return;

        const donationAmount = modalInteraction.fields.getTextInputValue('donationAmount');

        if (isNaN(donationAmount) || parseInt(donationAmount) <= 0) {
          return modalInteraction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setTitle(`${assets.emoji.deny} Donación fallida`)
                .setDescription('La cantidad debe ser un número positivo.')
            ], flags: MessageFlags.Ephemeral
          });
        }

        const userId = i.user.id;
        const amount = parseInt(donationAmount);
        const balance = await getUserBalance(connection, userId);

        if (balance < amount) {
          return modalInteraction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setTitle(`${assets.emoji.deny} Donación fallida`)
                .setDescription('No tienes suficientes créditos para donar esta cantidad.')
            ], flags: MessageFlags.Ephemeral
          });
        }

        await updateUserBalance(connection, userId, -amount);
        await connection.query(
          `INSERT INTO noble_donations (user_id, amount) VALUES (?, ?)
          ON DUPLICATE KEY UPDATE amount = amount + ?`,
          [userId, amount, amount]
        );

        if (typeof updateNobleRoles === 'function') {
          await updateNobleRoles(i);
        } else {
          console.error("Error: updateNobleRoles no está definido correctamente.");
        }

        await modalInteraction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.green)
              .setTitle(`${assets.emoji.check} Donación exitosa`)
              .setDescription(`Has donado **⏣${amount.toLocaleString()}** y se ha sumado a tu total.`)
          ], flags: MessageFlags.Ephemeral
        });

        const updatedEmbed = await createNoblezaEmbed();
        await nobiMessage.edit({ embeds: [updatedEmbed] });
      }

      if (i.customId === 'my_donation') {
        const userId = i.user.id;
        const [[donationRow]] = await connection.query(
          "SELECT amount FROM noble_donations WHERE user_id = ?",
          [userId]
        );

        const userDonation = donationRow ? donationRow.amount : 0;

        await i.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.base)
              .setTitle('Tu donación')
              .setDescription(`Has donado un total de **⏣${userDonation.toLocaleString()}**.`)
          ], flags: MessageFlags.Ephemeral
        });
      }
    });
  }
};
