const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const assets = require('../../../assets.json');
const { getUserBalance } = require('./utils/getUserBalance');
const { updateUserBalance } = require('./utils/updateUserBalance');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ruleta')
    .setDescription('Juega a la ruleta y apuesta a números, colores o paridad.')
    .addIntegerOption(option =>
      option.setName('apuesta')
        .setDescription('Cantidad a apostar')
        .setRequired(true)
    ),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const apuesta = interaction.options.getInteger('apuesta');

    // Verificar el saldo del usuario
    const userBalance = await getUserBalance(connection, userId);
    if (userBalance < apuesta) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle('Saldo insuficiente')
          .setDescription('No tienes suficiente saldo para realizar esta apuesta.')
        ],
        ephemeral: true
      });
    }

    // Crear el embed con la imagen de la ruleta
    const embed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setTitle('🎰 Ruleta')
      .setDescription(`**Apuesta:** ⏣ ${apuesta}\n\nElige tu apuesta en los botones de abajo.`)
      .setImage('https://i.imgur.com/N3lD59t.png');

    // Crear las filas de botones
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('1-18')
        .setLabel('1-18')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('par')
        .setLabel('Par')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('negro')
        .setLabel('Negro')
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('19-36')
        .setLabel('19-36')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('impar')
        .setLabel('Impar')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('rojo')
        .setLabel('Rojo')
        .setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.reply({ embeds: [embed], components: [row1, row2] });

    // Collector para manejar las interacciones (duración de 10 segundos)
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({ filter, time: 10000 });

    collector.on('collect', async (i) => {
      // Desactivar los botones temporalmente
      await i.deferUpdate();

      // Obtener la apuesta seleccionada
      const apuestaSeleccionada = i.customId;

      // Generar un número aleatorio entre 0 y 36
      const numeroGanador = Math.floor(Math.random() * 37);

      // Determinar el color y la paridad del número ganador
      const esRojo = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(numeroGanador);
      const colorGanador = esRojo ? 'ROJO' : (numeroGanador === 0 ? 'VERDE' : 'NEGRO');
      const paridadGanador = numeroGanador === 0 ? 'NINGUNO' : (numeroGanador % 2 === 0 ? 'PAR' : 'IMPAR');

      // Determinar si el usuario ganó
      let gana = false;
      switch (apuestaSeleccionada) {
        case '1-18':
          gana = numeroGanador >= 1 && numeroGanador <= 18;
          break;
        case '19-36':
          gana = numeroGanador >= 19 && numeroGanador <= 36;
          break;
        case 'par':
          gana = paridadGanador === 'PAR';
          break;
        case 'impar':
          gana = paridadGanador === 'IMPAR';
          break;
        case 'negro':
          gana = colorGanador === 'NEGRO';
          break;
        case 'rojo':
          gana = colorGanador === 'ROJO';
          break;
      }

      // Calcular el premio
      const premio = gana ? apuesta * 2 : 0;

      // Actualizar el saldo del usuario
      await updateUserBalance(connection, userId, gana ? premio : -apuesta);

      // Crear el embed con el resultado
      const embedResultado = new EmbedBuilder()
        .setColor(gana ? assets.color.green : assets.color.red)
        .setTitle('Ruleta')
        .setDescription(`**Número ganador:** ${numeroGanador} (${colorGanador}, ${paridadGanador})\n\n**Apuesta:** ${apuestaSeleccionada.toUpperCase()}\n**Resultado:** ${gana ? '¡Ganaste! 🎉' : 'Perdiste. 😢'}`)
        .addFields(
          { name: 'Premio', value: `⏣ ${premio}`, inline: true },
          { name: 'Nuevo saldo', value: `⏣ ${await getUserBalance(connection, userId)}`, inline: true }
        )
        .setImage('https://i.imgur.com/N3lD59t.png');

      // Mostrar el resultado y esperar 3 segundos antes de desactivar los botones
      await i.editReply({ embeds: [embedResultado], components: [] });

      // Esperar 3 segundos antes de desactivar los botones
      setTimeout(async () => {
        await message.edit({
          embeds: [embedResultado],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('1-18')
                .setLabel('1-18')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('par')
                .setLabel('Par')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('negro')
                .setLabel('Negro')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            ),
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('19-36')
                .setLabel('19-36')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('impar')
                .setLabel('Impar')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('rojo')
                .setLabel('Rojo')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            )
          ]
        });
      }, 3000); // 3 segundos de retraso

      collector.stop();
    });

    collector.on('end', async () => {
      if (collector.endReason !== 'time') return;

      // Desactivar los botones si no se eligió una apuesta
      const rowDisabled1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('1-18')
          .setLabel('1-18')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('par')
          .setLabel('Par')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('negro')
          .setLabel('Negro')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      const rowDisabled2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('19-36')
          .setLabel('19-36')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('impar')
          .setLabel('Impar')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('rojo')
          .setLabel('Rojo')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await message.edit({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle('Ruleta')
          .setDescription('No se seleccionó ninguna apuesta a tiempo. Los botones han sido desactivados.')
          .setImage('https://i.imgur.com/N3lD59t.png')
        ],
        components: [rowDisabled1, rowDisabled2]
      });
    });
  }
};