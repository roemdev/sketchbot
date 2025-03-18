const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const assets = require('../../../../config/assets.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Responde a una trivia'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const rewardAmount = Math.floor(Math.random() * (25 - 10 + 1)) + 10; // Número aleatorio entre 10 y 25

    try {
      const [rows] = await connection.execute("SELECT * FROM trivia_questions ORDER BY RAND() LIMIT 1");
      if (rows.length === 0) {
        return interaction.reply({ content: 'No hay preguntas disponibles.', flags: MessageFlags.Ephemeral });
      }

      const trivia = rows[0];
      const options = [
        { label: trivia.option_a, correct: trivia.correct_option === 'A' },
        { label: trivia.option_b, correct: trivia.correct_option === 'B' },
        { label: trivia.option_c, correct: trivia.correct_option === 'C' },
      ];

      options.sort(() => Math.random() - 0.5); // Mezclar opciones

      const embed = new EmbedBuilder()
        .setTitle(trivia.question)
        .setColor(assets.color.base)
        .setImage(trivia.image_url)
        .setFooter({ text: `ID: ${trivia.id}` });

      const buttons = new ActionRowBuilder();
      options.forEach((option, index) => {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`trivia_${index}`)
            .setLabel(option.label)
            .setStyle(ButtonStyle.Secondary)
        );
      });

      await interaction.reply({ embeds: [embed], components: [buttons] });
      const message = await interaction.fetchReply();
      const collector = message.createMessageComponentCollector({ time: 20000 }); // Tiempo aumentado a 20 segundos

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.red)
                .setTitle(`${assets.emoji.deny} No puedes responder por otro.`)
            ], flags: MessageFlags.Ephemeral
          });
        }

        collector.stop();
        const chosenIndex = parseInt(i.customId.split("_")[1]);
        const chosenOption = options[chosenIndex];
        const correctIndex = options.findIndex(opt => opt.correct);

        // Deshabilitar botones y aplicar colores
        buttons.components.forEach((btn, index) => {
          btn.setDisabled(true);
          if (index === correctIndex) {
            btn.setStyle(ButtonStyle.Success);
          } else if (index === chosenIndex) {
            btn.setStyle(chosenOption.correct ? ButtonStyle.Success : ButtonStyle.Danger);
          } else {
            btn.setStyle(ButtonStyle.Secondary);
          }
        });

        if (chosenOption.correct) {
          embed.setTitle(`${assets.emoji.check} ¡Correcto!`)
            .setColor(assets.color.green)
            .setDescription(`La respuesta correcta era: **${options[correctIndex].label}**.

            ¡Has ganado **${rewardAmount}** monedas!`);

          // Actualizar la base de datos
          await connection.execute(`
            INSERT INTO trivia_scores (user_id, score) 
            VALUES (?, 1) 
            ON DUPLICATE KEY UPDATE score = score + 1
          `, [userId]);

          await connection.execute(`
            INSERT INTO curr_users (id, balance) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE balance = balance + ?
          `, [userId, rewardAmount, rewardAmount]);
        } else {
          embed.setTitle(`${assets.emoji.deny} ¡Incorrecto!`)
            .setColor(assets.color.red)
            .setDescription(`La respuesta correcta era: **${options[correctIndex].label}**.`);
        }

        await i.update({ embeds: [embed], components: [buttons] });
      });

      collector.on('end', async (_, reason) => {
        if (reason === 'time') {
          buttons.components.forEach(btn => btn.setDisabled(true));
          embed.setTitle(`⏳ Tiempo agotado`)
            .setColor(assets.color.base)
            .setDescription(`La respuesta correcta era: **${options.find(opt => opt.correct).label}**.`);
          await interaction.editReply({ embeds: [embed], components: [buttons] });
        }
      });
    } catch (error) {
      console.error('Error al obtener trivia:', error);
      return interaction.reply({ content: 'Hubo un error al obtener la trivia.', flags: MessageFlags.Ephemeral });
    }
  }
};
