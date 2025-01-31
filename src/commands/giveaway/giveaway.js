const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  MessageFlags,
  Events
} = require('discord.js');
const assets = require('../../../assets.json')
const ms = require("ms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Inicia un nuevo sorteo')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction) {

    // Creating the modal

    const modal = new ModalBuilder()
      .setCustomId('gaModal')
      .setTitle('Nuevo Sorteo');

    const durationInput = new TextInputBuilder()
      .setCustomId('durationInput')
      .setLabel('Duración')
      .setPlaceholder('Ej: 1m, 2h, 3d')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const winnersInput = new TextInputBuilder()
      .setCustomId('winnersInput')
      .setLabel('Número de ganadores')
      .setValue('1')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const prizeInput = new TextInputBuilder()
      .setCustomId('prizeInput')
      .setLabel('Premio')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('descriptionInput')
      .setLabel('Descripción')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const durationInputRow = new ActionRowBuilder().addComponents(durationInput);
    const winnersInputRow = new ActionRowBuilder().addComponents(winnersInput);
    const prizeInputRow = new ActionRowBuilder().addComponents(prizeInput);
    const descriptionInputRow = new ActionRowBuilder().addComponents(descriptionInput);

    modal.addComponents(durationInputRow, winnersInputRow, prizeInputRow, descriptionInputRow);

    await interaction.showModal(modal)

    const client = interaction.client;

    client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isModalSubmit()) return;
      if (interaction.customId === 'gaModal') {

        const duration = ms(interaction.fields.getTextInputValue('durationInput'));
        const winners = interaction.fields.getTextInputValue('winnersInput');
        const prize = interaction.fields.getTextInputValue('prizeInput');
        const description = interaction.fields.getTextInputValue('descriptionInput');
        const hoster = interaction.user.id;
        const endDate = Math.floor((Date.now() + duration) / 1000);
        const entries = 0;

        if (!endDate) {
          return interaction.reply({ content: `${assets.emoji.warn} Duración inválida`, flags: MessageFlags.Ephemeral })
        }

        const gaEmbed = new EmbedBuilder()
          .setColor(assets.color.base)
          .setTitle(prize)
          .setDescription(
            `${description}\n\n` +
            `Finaliza: <t:${endDate}:R> | (<t:${endDate}:D>)\n` +
            `Afitrión: <@${hoster}>\n` +
            `Entradas: ${entries}\n` +
            `Ganadores: ${winners}`)

        const enterButton = new ButtonBuilder()
          .setCustomId('enterButton')
          .setLabel('Ingresar')
          .setEmoji('🎉')
          .setStyle(ButtonStyle.Primary)

        const enterButtonRow = new ActionRowBuilder().addComponents(enterButton)

        await interaction.reply({ content: '¡Éxito!', flags: MessageFlags.Ephemeral });
        interaction.channel.send({ embeds: [gaEmbed], components: [enterButtonRow] })
      }
    });
  }
}