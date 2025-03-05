const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js')
const { addDonation, getDonationRank, getNobilityRoles } = require('../../utilities/nobilityUtils')
const { getUserBalance, updateUserBalance } = require('../../utilities/userBalanceUtils')
const assets = require('../../../assets.json')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nobleza')
    .setDescription('Manejador de nobleza del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {
    const connection = interaction.client.dbConnection
    const userId = interaction.user.id

    const nobilityRoles = await getNobilityRoles(connection);
    if (!nobilityRoles || nobilityRoles.length === 0) {
      console.log('No se encontraron roles.');
      return;
    }

    const fields = nobilityRoles
      .map((role, index) => `**${index + 1}.** ${role.emoji || '❓'} • <@&${role.role_id || 'Sin rol'}> • Max: **${role.limit || 'Sin límite'}**`)
      .join('\n');

    const nobiEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
      .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
      .setTitle('🏰 Nobleza de Arkania')
      .setDescription('El Sistema de Nobleza en Arkania otorga títulos especiales a los jugadores que invierten monedas en el servidor. Cuanto más donas, más alto puedes ascender en la jerarquía nobiliaria.')
      .addFields(
        { name: 'Títulos disponibles', value: fields },
        { name: 'Funcionamiento de los botones', value: '`🔃` - Actualiza la tabla de nobleza.\n`💰` - Revisa la cantidad que has donado.' }
      );

    const topDonors = await getDonationRank(connection)
    const description = topDonors
      .map((donor, index) => `**${index + 1}.** <@${donor.user_id}> • ⏣${donor.amount.toLocaleString()} monedas`)
      .join('\n')

    const rankEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setDescription(description)

    const updateNobi = new ButtonBuilder()
      .setCustomId('update')
      .setLabel(' ')
      .setEmoji('🔃')
      .setStyle(ButtonStyle.Secondary)

    const myDonationButton = new ButtonBuilder()
      .setCustomId('my_donation')
      .setLabel(' ')
      .setEmoji('💰')
      .setStyle(ButtonStyle.Secondary)

    const donateButton = new ButtonBuilder()
      .setCustomId('donate')
      .setLabel('Realizar donación')
      .setStyle(ButtonStyle.Primary)

    const actionRow = new ActionRowBuilder()
      .addComponents(updateNobi, myDonationButton, donateButton)

    const nobiMessage = await interaction.channel.send({ embeds: [nobiEmbed, rankEmbed], components: [actionRow] })

    await interaction.reply({ content: 'Enviado', flags: MessageFlags.Ephemeral })

    const collector = nobiMessage.createMessageComponentCollector()

    collector.on('collect', async (i) => {
      if (i.customId === 'update') {
        const updatedTopDonors = await getDonationRank(connection)
        const updatedDescription = updatedTopDonors
          .map((donor, index) => `**${index + 1}.** <@${donor.user_id}> • ⏣${donor.amount.toLocaleString()} monedas`)
          .join('\n') || "Aún no hay donaciones."

        rankEmbed.setDescription(updatedDescription)

        await nobiMessage.edit({ embeds: [nobiEmbed, rankEmbed], components: [actionRow] })
      } else if (i.customId === 'my_donation') {

        const donation = await getDonationRank(connection, userId);

        if (donation.length > 0) {
          await i.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.base)
                .setDescription(`Total donado: **⏣${donation[0].amount.toLocaleString()}**`)
            ],
            flags: MessageFlags.Ephemeral
          });
        } else {
          await i.reply({
            content: 'No se encontraron donaciones para este usuario.',
            flags: MessageFlags.Ephemeral
          });
        }
      } else if (i.customId === 'donate') {
        const modal = new ModalBuilder()
          .setCustomId(`donation-${i.user.id}`)
          .setTitle('Ingresa la cantidad a donar')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('donationAmount')
                .setLabel('Cantidad a donar')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
          )

        await i.showModal(modal)

        try {
          const modalInteraction = await i.awaitModalSubmit({ time: 60000 })

          if (!modalInteraction.customId.startsWith('donation-')) return

          const donationAmount = modalInteraction.fields.getTextInputValue('donationAmount')
          const amount = Number(donationAmount)

          if (isNaN(amount) || amount <= 0) {
            return modalInteraction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(assets.color.red)
                  .setTitle(`${assets.emoji.deny} Cantidad inválida`)
                  .setDescription('Debes ingresar una cantidad válida.')
              ],
              flags: MessageFlags.Ephemeral
            })
          }

          try {
            const balance = await getUserBalance(connection, userId)
            if (balance <= 0) {
              return modalInteraction.reply({
                embeds: [
                  new EmbedBuilder()
                    .setColor(assets.color.red)
                    .setTitle(`${assets.emoji.deny} No tienes créditos`)
                ],
                flags: MessageFlags.Ephemeral
              })
            } else {
              await addDonation(connection, userId, amount)
              await updateUserBalance(connection, userId, -amount)
              return modalInteraction.reply({
                embeds: [
                  new EmbedBuilder()
                    .setColor(assets.color.green)
                    .setTitle(`${assets.emoji.check} ¡Donación realizada con éxito!`)
                ],
                flags: MessageFlags.Ephemeral
              })
            }
          } catch (error) {
            console.error(error)
            return modalInteraction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor(assets.color.red)
                  .setTitle(`${assets.emoji.error} Algo salió mal. Inténtalo de nuevo más tarde.`)
              ],
              flags: MessageFlags.Ephemeral
            })
          }
        } catch (error) {
          if (error.code !== 'InteractionCollectorError') console.error(error)
        }
      }
    })
  }
}