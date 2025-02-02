const { SlashCommandSubcommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');
const { handleCooldowns } = require('../../utils/handleCooldowns');
const { updateUserBalance } = require('../../utils/updateUserBalance');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('trabajo')
    .setDescription('Realiza un trabajo y gana créditos según tu esfuerzo'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    // Verificar y manejar el cooldown para la tarea "work"
    const { cooldownActive, remainingCooldown } = await handleCooldowns(connection, userId, 'work');

    if (cooldownActive) {
      const remainingUnixTimestamp = Math.floor(remainingCooldown / 1000) + Math.floor(Date.now() / 1000);
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle(`${assets.emoji.deny} Cooldown activo`)
          .setDescription(`Podrás volver a intentarlo <t:${remainingUnixTimestamp}:R>`)
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      const [rows] = await connection.execute('SELECT task_name, emoji, description, min_profit, max_profit FROM currency_work_config WHERE is_active = TRUE');

      if (rows.length < 3) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(assets.color.red).setTitle(`${assets.emoji.deny} Error`).setDescription('No hay suficientes trabajos disponibles.')],
          flags: MessageFlags.Ephemeral
        });
      }

      const opcionesAleatorias = rows.sort(() => Math.random() - 0.5).slice(0, 3);
      let botones = opcionesAleatorias.map((opcion, index) =>
        new ButtonBuilder().setCustomId(`opcion_${index}`).setLabel(opcion.task_name).setEmoji(opcion.emoji).setStyle(ButtonStyle.Secondary)
      );

      let row = new ActionRowBuilder().addComponents(botones);
      let embed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle('¿Qué trabajo vas a realizar?')
        .setDescription('Selecciona un trabajo y gana créditos según tu esfuerzo.');

      const message = await interaction.reply({ embeds: [embed], components: [row] });
      const collector = message.createMessageComponentCollector({ time: 20000 });

      let botonPresionado = false;

      collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.user.id !== interaction.user.id) {
          return buttonInteraction.reply({
            embeds: [new EmbedBuilder().setColor(assets.color.red).setTitle(`${assets.emoji.deny} Sin permiso`).setDescription('No puedes interactuar con estos botones.')],
            flags: MessageFlags.Ephemeral
          });
        }

        const indexElegido = parseInt(buttonInteraction.customId.split('_')[1]);
        const { task_name, min_profit, max_profit, description, emoji } = opcionesAleatorias[indexElegido];

        // Generar una ganancia aleatoria entre min_profit y max_profit
        const ganancia = Math.floor(Math.random() * (max_profit - min_profit + 1)) + min_profit;

        // Actualizar el balance del usuario
        await updateUserBalance(connection, userId, ganancia);

        botonPresionado = true;
        botones = botones.map((btn, i) =>
          btn.setDisabled(true).setStyle(i === indexElegido ? ButtonStyle.Success : ButtonStyle.Secondary)
        );

        embed
          .setColor(assets.color.green)
          .setTitle(`${assets.emoji.check} Trabajo realizado`)
          .setDescription(description)
          .addFields(
            { name: 'Trabajo realizado', value: `${task_name} ${emoji}`, inline: true },
            { name: 'Créditos ganados', value: `**⏣ ${ganancia.toLocaleString()}**`, inline: true }
          );

        await buttonInteraction.update({
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(botones)]
        });

        collector.stop();
      });

      collector.on('end', async () => {
        if (!botonPresionado) {
          botones = botones.map((btn) => btn.setDisabled(true).setStyle(ButtonStyle.Secondary));

          embed.setColor(assets.color.red).setTitle(`${assets.emoji.deny} Tiempo agotado`).setDescription('Parece que ninguna opción te convenció. Inténtalo de nuevo.');

          await message.edit({ embeds: [embed], components: [new ActionRowBuilder().addComponents(botones)] }).catch(() => { });
        }
      });

    } catch (error) {
      console.error('Error en el comando /trabajo:', error);
      interaction.reply({
        embeds: [new EmbedBuilder().setColor(assets.color.red).setTitle(`${assets.emoji.deny} Error`).setDescription('Hubo un problema. Inténtalo de nuevo.')],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
