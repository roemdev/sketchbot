const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags, ActionRowBuilder } = require('discord.js');
const assets = require('../../../../config/assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia-add')
    .setDescription('Añade preguntas a la trivia')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addStringOption(option =>
      option.setName('pregunta').setDescription('Añade la pregunta para la trivia').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('imagen_url').setDescription('Link del URL de la imagen representativa.').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('opción_a').setDescription('Añade la respuesta A.').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('opción_b').setDescription('Añade la respuesta B.').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('opción_c').setDescription('Añade la respuesta C.').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('opción_correcta').setDescription('Indica cuál es la respuesta correcta (A, B o C)').setRequired(true)
    ),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const question = interaction.options.getString('pregunta');
    const imageLink = interaction.options.getString('imagen_url');
    const optionA = interaction.options.getString('opción_a');
    const optionB = interaction.options.getString('opción_b');
    const optionC = interaction.options.getString('opción_c');
    const correctOption = interaction.options.getString('opción_correcta');

    const embed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setTitle(question)
      .setImage(imageLink)
      .setFooter({ text: 'ID: x' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('optionA').setLabel(optionA).setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('optionB').setLabel(optionB).setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('optionC').setLabel(optionC).setStyle(ButtonStyle.Primary).setDisabled(true)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('yes').setEmoji(assets.emoji.whitecheck).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('no').setEmoji(assets.emoji.whitedeny).setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      content: 'Así se verá tu pregunta:',
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral
    });

    const confirmationMessage = await interaction.followUp({
      content: '¿Deseas añadirla?',
      components: [row2],
      flags: MessageFlags.Ephemeral
    });

    const filter = i => i.user.id === interaction.user.id;
    const collector = confirmationMessage.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
      if (i.customId === 'yes') {
        try {
          await connection.execute(
            'INSERT INTO trivia_questions (question, image_url, option_a, option_b, option_c, correct_option) VALUES (?, ?, ?, ?, ?, ?)',
            [question, imageLink, optionA, optionB, optionC, correctOption]
          );
          await i.update({ content: `${assets.emoji.check} Pregunta añadida con éxito.`, components: [], embeds: [] });
        } catch (error) {
          console.error('Error al insertar la pregunta:', error);
          await i.update({ content: '❌ Hubo un error al añadir la pregunta.', components: [], embeds: [] });
        }
      } else if (i.customId === 'no') {
        await i.update({ content: `${assets.emoji.deny} Se canceló la adición de la pregunta.`, components: [], embeds: [] });
      }
    });
  }
};
