const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags
} = require('discord.js');

const assets = require('../../../../../config/assets.json');
const tasks = require('./tasks.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tarea')
    .setDescription('Trabaja para ganar monedas'),

  async execute(interaction) {
    let remainingClicks = 10;
    const durationMs = 60 * 1000; // 60 segundos
    const expirationTimestamp = Math.floor((Date.now() + durationMs) / 1000);

    // Selección aleatoria de tarea
    const task = tasks[Math.floor(Math.random() * tasks.length)];

    const embed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setTitle(task.title)
      .setDescription(
        `${task.introLines.join('\n')}\n\n` +
        `\`⏳\` **Tiempo límite:** <t:${expirationTimestamp}:t> (<t:${expirationTimestamp}:R>)\n` +
        `\`🎯\` **Objetivo:** ¡Haz ${remainingClicks} clics antes de que se acabe el tiempo!`
      );

    const button = new ButtonBuilder()
      .setCustomId('button')
      .setEmoji(task.emoji)
      .setLabel(String(remainingClicks))
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(button);

    interaction.reply({
      embeds: [embed],
      components: [row]
    }).then(async message => {
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: durationMs
      });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: 'Este botón no es para ti.', flags: MessageFlags.Ephemeral });
        }

        remainingClicks--;

        if (remainingClicks > 0) {
          const updatedButton = ButtonBuilder.from(button).setLabel(String(remainingClicks));
          const updatedRow = new ActionRowBuilder().addComponents(updatedButton);
          await i.update({ components: [updatedRow] });
        } else {
          collector.stop('completed');

          const disabledButton = ButtonBuilder.from(button)
            .setLabel('0')
            .setDisabled(true);

          const finalRow = new ActionRowBuilder().addComponents(disabledButton);
          await i.update({ components: [finalRow] });

          const coins = 100;
          const xp = 80;

          await interaction.followUp({
            embeds: [
              new EmbedBuilder()
                .setColor(assets.color.green)
                .setTitle(task.successTitle)
                .setDescription(task.successDescription)
                .addFields({
                  name: '💰 Recompensa',
                  value: `**+${coins}**🪙 por tu gran trabajo.\n**+${xp}**✨ por tu esfuerzo.`
                })
            ]
          });
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason !== 'completed') {
          const disabledButton = ButtonBuilder.from(button)
            .setLabel(String(remainingClicks))
            .setDisabled(true);

          const finalRow = new ActionRowBuilder().addComponents(disabledButton);
          await interaction.editReply({ components: [finalRow] });

          await interaction.followUp({ content: '⏰ Tiempo agotado. No se completó el trabajo.' });
        }
      });
    });
  }
};
