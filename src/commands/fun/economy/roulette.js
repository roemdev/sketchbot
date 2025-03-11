const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const assets = require('../../../../config/assets.json');
const { getUserBalance, updateUserBalance } = require('./utils/userBalanceUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ruleta')
    .setDescription('Juega a la ruleta y apuesta a números, colores o paridad.')
    .addIntegerOption(option =>
      option.setName('apuesta')
        .setDescription('Cantidad a apostar')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('opcion')
        .setDescription('Opción de apuesta')
        .setRequired(true)
        .addChoices(
          { name: '1-18', value: '1-18' },
          { name: '19-36', value: '19-36' },
          { name: 'Par', value: 'par' },
          { name: 'Impar', value: 'impar' },
          { name: 'Negro', value: 'negro' },
          { name: 'Rojo', value: 'rojo' }
        )
    ),

  async execute(interaction) {
    const connection = interaction.client.dbConnection;
    const userId = interaction.user.id;
    const apuesta = interaction.options.getInteger('apuesta');
    const opcion = interaction.options.getString('opcion');

    // Verificar el saldo del usuario
    const userBalance = await getUserBalance(connection, userId);
    if (userBalance < apuesta) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(assets.color.red)
          .setTitle('Saldo insuficiente')
          .setDescription('No tienes suficiente saldo para realizar esta apuesta.')
        ],
      });
    }

    // Restar la apuesta al saldo antes de jugar
    await updateUserBalance(connection, userId, -apuesta);

    // Calcular el tiempo del reveal
    const revealTime = Math.floor((Date.now() + 10000) / 1000);

    // Enviar el primer embed con la apuesta realizada
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(assets.color.base)
          .setTitle(`${assets.emoji.roulette} Ruleta | Apuesta en curso`)
          .setDescription(`Resultado en: <t:${revealTime}:R>`)
          .addFields(
            { name: `Apuesta`, value: `${apuesta.toLocaleString()}`, inline: true },
            { name: `Opción`, value: `\`${opcion.toLocaleString()}\``, inline: true }
          )
      ]
    });

    // Esperar 10 segundos
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Generar un número aleatorio entre 0 y 36
    const numeroGanador = Math.floor(Math.random() * 37);
    const esRojo = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(numeroGanador);
    const colorGanador = esRojo ? '🔴' : (numeroGanador === 0 ? '🟢' : '⚫');
    const paridadGanador = numeroGanador === 0 ? 'CER' : (numeroGanador % 2 === 0 ? 'PAR' : 'IMP');

    // Determinar si el usuario ganó
    let gana = false;
    switch (opcion) {
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
        gana = paridadGanador === 'IMP';
        break;
      case 'negro':
        gana = colorGanador === '⚫';
        break;
      case 'rojo':
        gana = colorGanador === '🔴';
        break;
    }

    // Calcular el premio
    const premio = gana ? apuesta * 2 : 0;
    if (gana) await updateUserBalance(connection, userId, premio);

    // Crear el embed con el resultado
    const embedResultado = new EmbedBuilder()
      .setColor(gana ? assets.color.green : assets.color.red)
      .setTitle(`Ruleta | ${gana ? `${assets.emoji.check} ¡Ganaste!` : `${assets.emoji.deny} Perdiste`}`)
      .addFields(
        { name: ' ', value: `**Opción:** \`${opcion.toUpperCase()}\``, inline: true },
        { name: ' ', value: `**Resultado:** \`${numeroGanador}${colorGanador}${paridadGanador}\``, inline: true },
        { name: ' ', value: `**Ganancia:** ⏣${premio.toLocaleString()} créditos`, inline: false },
      );

    // Responder con el resultado
    await interaction.followUp({ embeds: [embedResultado] });
  }
};
