const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const assets = require('../../../../config/assets.json');
const { getUserBalance, updateUserBalance } = require('./utils/userBalanceUtils');
const { getJackpotConfig } = require('./utils/getJackpotConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tragamonedas')
    .setDescription('Juega a las tragamonedas y gana premios!'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const emojis = ['🍒', '🍋', '🍊', '🍉', '🍇', '🍓', '🍍', '💎'];

    // Obtener la configuración desde la base de datos
    const { costPerSpin, regularPrize, jackpotPrize } = await getJackpotConfig(connection);

    let spinCount = 0;

    // Función para generar una jugada aleatoria
    const spin = () => {
      const line1 = [];
      const line2 = [];
      const line3 = [];
      for (let i = 0; i < 3; i++) {
        line1.push(emojis[Math.floor(Math.random() * emojis.length)]);
        line2.push(emojis[Math.floor(Math.random() * emojis.length)]);
        line3.push(emojis[Math.floor(Math.random() * emojis.length)]);
      }
      return [line1, line2, line3];
    };

    // Función para generar el embed con el resultado
    const createEmbed = (line1, line2, line3, resultMessage, isJackpot = false) => {
      const embed = new EmbedBuilder()
        .setColor(resultMessage.includes('¡Ganaste!') || isJackpot ? assets.color.green : assets.color.red)
        .setTitle(`Tragamonedas | ${resultMessage}`)
        .addFields(
          {
            name: ' ',
            value:
              `${line1.join(' ')}\n` +
              `~~-----------~~\n` +
              `${line2.join(' ')}\n` +
              `~~-----------~~\n` +
              `${line3.join(' ')}\n`,
            inline: true
          },
          {
            name: ' ',
            value:
              `> **¡Bienvenido a la máquina Tragamonedas!**\n` +
              `> \`🍒🍋🍊🍉🍇🍓🍍💎🍒🍋🍊🍉🍇🍓🍍💎\`\n` +
              `> Cada tirada te cuesta **${costPerSpin.toLocaleString()}**🪙\n` +
              `> Saca 3 iguales en el centro y gana **${regularPrize.toLocaleString()}**🪙 \n` +
              `> ¡Consigue 3 \`💎\` y gana el *jackpot* **${jackpotPrize.toLocaleString()}**🪙!`,
            inline: true
          }
        );

      // Añadir imagen y cambiar color si se gana el premio mayor
      if (isJackpot) {
        embed.setImage('https://mir-s3-cdn-cf.behance.net/project_modules/source/3e6f3c25140811.56342165f2d2b.gif');
      }

      return embed;
    };

    const initialEmbed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setTitle('Tragamonedas')
      .addFields(
        {
          name: ' ',
          value:
            `🍒 🍋 🍊\n` +
            `~~-----------~~\n` +
            `7️⃣ 7️⃣ 7️⃣\n` +
            `~~-----------~~\n` +
            `🍉 🍇 🍓\n`,
          inline: true
        },
        {
          name: ' ',
          value:
            `> **¡Bienvenido a la máquina Tragamonedas!**\n` +
            `> \`🍒🍋🍊🍉🍇🍓🍍💎🍒🍋🍊🍉🍇🍓🍍💎\`\n` +
            `> Cada tirada te cuesta **${costPerSpin.toLocaleString()}**\n` +
            `> Saca 3 iguales en el centro y gana **${regularPrize.toLocaleString()}** \n` +
            `> ¡Consigue 3 \`💎\` y gana el *jackpot* **${jackpotPrize.toLocaleString()}**!`,
          inline: true
        }
      );

    // Crear botón para repetir la jugada
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('spin_again')
        .setLabel('Tirada')
        .setEmoji('🎰')
        .setStyle(ButtonStyle.Primary)
    );

    const message = await interaction.reply({ embeds: [initialEmbed], components: [row] });

    // Collector para manejar las interacciones con el botón
    const collector = message.createMessageComponentCollector({ max: 30 });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({
          embeds: [new EmbedBuilder().setColor(assets.color.red).setTitle(`${assets.emoji.deny} Sin permiso`).setDescription('No puedes interactuar con estos botones.')],
          flags: MessageFlags.Ephemeral
        });
      }

      // Verificar el saldo del usuario
      const userBalance = await getUserBalance(connection, userId);
      if (userBalance < costPerSpin) {
        return buttonInteraction.reply({
          embeds: [new EmbedBuilder().setColor(assets.color.red).setTitle('Saldo insuficiente').setDescription('No tienes suficiente saldo para jugar.')],
        });
      }

      // Deducir el costo de la jugada
      await updateUserBalance(connection, userId, -costPerSpin);

      spinCount++; // Incrementar el contador de usos
      if (spinCount > 30) {
        return buttonInteraction.update({
          embeds: [new EmbedBuilder().setColor(assets.color.red).setTitle('Límite alcanzado').setDescription('Has alcanzado el límite de 30 usos del botón.')],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('spin_again')
              .setLabel('Tirada')
              .setEmoji('🎰')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true)
          )]
        });
      }

      // Generar nueva jugada
      const [line1, line2, line3] = spin();
      let resultMessage = (line2[0] === line2[1] && line2[1] === line2[2]) ? `${assets.emoji.check} ¡Ganaste!` : `${assets.emoji.deny} Perdiste`;
      let disableButton = false;
      let isJackpot = false;

      // Verificar si se ganó el premio mayor
      if (line2[0] === '💎' && line2[1] === '💎' && line2[2] === '💎') {
        resultMessage = `${assets.emoji.check} ¡Jackpooot! 🎉🎉🎉`;
        disableButton = true;
        isJackpot = true;
        await updateUserBalance(connection, userId, jackpotPrize);
      }

      // Verificar si se ganó el premio regular
      if (resultMessage.includes('¡Ganaste!')) {
        disableButton = true;
        await updateUserBalance(connection, userId, regularPrize);
      }

      // Crear y actualizar el embed con la nueva jugada y el resultado
      const newEmbed = createEmbed(line1, line2, line3, resultMessage, isJackpot);

      // Desactivar el botón si se ganó o se alcanzó el límite de usos
      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('spin_again')
          .setLabel('Tirada')
          .setEmoji('🎰')
          .setStyle(disableButton ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(disableButton || spinCount >= 30)
      );

      // Responder con el nuevo embed, actualizando el estado del botón
      await buttonInteraction.update({
        embeds: [newEmbed],
        components: [newRow]
      });
    });
  }
};