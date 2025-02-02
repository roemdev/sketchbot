const { SlashCommandSubcommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const assets = require('../../../assets.json');
const { handleCooldowns } = require('../../utils/handleCooldowns');
const { updateUserBalance } = require('../../utils/updateUserBalance');

module.exports = {
  data: new SlashCommandSubcommandBuilder()
    .setName('crimen')
    .setDescription('Comete un crimen y ve si tienes suerte'),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;

    // Verificar y manejar el cooldown para la tarea "crime"
    const { cooldownActive, remainingCooldown } = await handleCooldowns(connection, userId, 'crime');

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
      const [rows] = await connection.execute('SELECT crime_name, emoji, description, profit, fine, failrate FROM currency_crime_config WHERE is_active = TRUE');

      if (rows.length < 3) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(assets.color.red).setTitle(`${assets.emoji.deny} Error`).setDescription('No hay suficientes crímenes disponibles.')],
          flags: MessageFlags.Ephemeral
        });
      }

      const opcionesAleatorias = rows.sort(() => Math.random() - 0.5).slice(0, 3);
      let botones = opcionesAleatorias.map((opcion, index) =>
        new ButtonBuilder().setCustomId(`opcion_${index}`).setLabel(opcion.crime_name).setEmoji(opcion.emoji).setStyle(ButtonStyle.Secondary)
      );

      let row = new ActionRowBuilder().addComponents(botones);
      let embed = new EmbedBuilder()
        .setColor(assets.color.base)
        .setTitle('¿Qué crimen vas a cometer?')
        .setDescription('Selecciona una opción, si aciertas ganas créditos, si fallas... bueno, no hay que hablar de cosas que nos dan ansiedad.');

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
        const { crime_name, profit, fine, failrate, description, emoji } = opcionesAleatorias[indexElegido];

        const exito = Math.random() * 100 >= failrate;
        let color, ganancia;

        const [userData] = await connection.execute('SELECT balance FROM currency_users WHERE user_id = ?', [userId]);
        let balanceActual = userData[0]?.balance || 0;

        if (exito) {
          ganancia = Math.floor((profit / 100) * balanceActual);
          color = assets.color.green;
        } else {
          ganancia = -Math.floor((fine / 100) * balanceActual);
          color = assets.color.red;
        }

        const newBalance = await updateUserBalance(connection, userId, ganancia);

        botonPresionado = true;
        botones = botones.map((btn, i) =>
          btn.setDisabled(true).setStyle(i === indexElegido ? (exito ? ButtonStyle.Success : ButtonStyle.Danger) : ButtonStyle.Secondary)
        );

        embed
          .setColor(color)
          .setTitle(`${exito ? assets.emoji.check : assets.emoji.deny} Resultado`)
          .setDescription(description)
          .addFields(
            { name: 'Crimen cometido', value: `${crime_name} ${emoji}`, inline: true },
            { name: `Créditos ${exito ? 'ganados' : 'perdidos'}`, value: `**⏣ ${Math.abs(ganancia).toLocaleString()}**`, inline: true }
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
      console.error('Error en el comando /botones:', error);
      interaction.reply({
        embeds: [new EmbedBuilder().setColor(assets.color.red).setTitle(`${assets.emoji.deny} Error`).setDescription('Hubo un problema. Inténtalo de nuevo.')],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
