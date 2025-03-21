const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const assets = require('../../../../config/assets.json');
const { crearBotonApostar, manejarApuestas } = require('./handlers/horseRacingHandler');
const { getUserBalance, updateUserBalance } = require('./utils/userBalanceUtils');

let carreraEnProgreso = false;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('caballos')
    .setDescription('Inicia una carrera con 5 caballos de colores.'),
  async execute(interaction) {
    try {
      if (carreraEnProgreso) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(assets.color.red)
              .setDescription('Ya hay una carrera en proceso. ¡Espera a que termine!')
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      carreraEnProgreso = true;
      const connection = interaction.client.dbConnection;
      const [result] = await connection.execute(
        'INSERT INTO horse_races (race_status) VALUES (?)',
        ['active']
      );
      const carreraId = result.insertId;

      const pistaLength = 40;
      const colores = ['🔴', '🟢', '🔵', '🟡', '🟣'];
      const caballos = colores.map((color) => ({
        color,
        emoji: '<:horse:1351939506324111513>',
        posicion: 0,
      }));

      const tiempoInicio = Math.floor(Date.now() / 1000) + 60;

      // Crear la pista visual inicial con los caballos en posición de salida
      const pistaInicial = caballos
        .map((caballo) => {
          const pista = '-'.repeat(pistaLength).split('');
          pista[caballo.posicion] = caballo.emoji;
          return `${caballo.color}🏁 ${pista.join('')} 🏁`;
        })
        .join('\n');

      const embedInicial = new EmbedBuilder()
        .setTitle('<:horse:1351939506324111513> Carrera de Caballos')
        .setDescription(
          `La carrera comenzará <t:${tiempoInicio}:R>. ¡Prepárense! 🏁\n\n**¡Haz clic en el botón para apostar!**\n\n${pistaInicial}`
        )
        .setColor(assets.color.base)
        .setFooter({ text: `ID: ${carreraId}` });

      const botonApostar = crearBotonApostar();
      await interaction.reply({ embeds: [embedInicial], components: [botonApostar] });

      // Manejar apuestas con validación de saldo
      manejarApuestas(interaction, connection, carreraId, colores, async (userId, apuesta, caballo) => {
        const saldo = await getUserBalance(connection, userId);
        if (saldo < apuesta) {
          await interaction.followUp({
            content: `❌ No tienes suficiente saldo para apostar ${apuesta}. Tu saldo actual es ${saldo}.`,
            ephemeral: true,
          });
          return false; // Indica que la apuesta no fue válida
        }
        return true; // Indica que la apuesta fue válida
      });

      setTimeout(async () => {
        try {
          // Desactivar el botón de apuesta
          const botonDesactivado = new ActionRowBuilder().addComponents(
            botonApostar.components[0].setDisabled(true) // Acceder al botón dentro del ActionRowBuilder
          );
          await interaction.editReply({ components: [botonDesactivado] });

          const updateRace = async () => {
            let carreraTerminada = false;

            caballos.forEach((caballo) => {
              if (!carreraTerminada) {
                const avance = Math.floor(Math.random() * 3) + 1;
                caballo.posicion += avance;

                if (caballo.posicion >= pistaLength) {
                  caballo.posicion = pistaLength;
                  carreraTerminada = true;
                }
              }
            });

            const pistaVisual = caballos
              .map((caballo) => {
                const pista = '-'.repeat(pistaLength).split('');
                pista[caballo.posicion] = caballo.emoji;
                return `${caballo.color}🏁 ${pista.join('')} 🏁`;
              })
              .join('\n');

            embedInicial
              .setTitle('🎉 ¡Carrera en progreso!')
              .setDescription(pistaVisual);

            await interaction.editReply({ embeds: [embedInicial], components: [botonDesactivado] });

            if (carreraTerminada) {
              clearInterval(intervalo); // Detener el intervalo
              const caballoGanador = caballos.find((caballo) => caballo.posicion >= pistaLength);

              // Actualizar la base de datos con el ganador
              await connection.execute(
                'UPDATE horse_races SET race_status = ?, winner_horse = ? WHERE id = ?',
                ['finished', caballoGanador.color, carreraId]
              );

              // Diccionario para mapear emojis a colores hexadecimales de Discord
              const colorMap = {
                '🔴': 0xED4245, // Rojo
                '🟢': 0x57F287, // Verde
                '🔵': 0x3498DB, // Azul
                '🟡': 0xFEE75C, // Amarillo
                '🟣': 0x9B59B6  // Púrpura
              };

              // Anunciar al ganador con el color correspondiente
              await interaction.followUp({
                embeds: [
                  new EmbedBuilder()
                    .setColor(colorMap[caballoGanador.color] || 0xFFFFFF) // Blanco por defecto si no hay coincidencia
                    .setTitle('¡Finaliza la carrera!')
                    .setDescription(`¡El caballo ganador es el de color: ${caballoGanador.color}! ¡Felicidades a los ganadores!`)
                ]
              });



              // Procesar las apuestas
              const [ganadores] = await connection.execute(
                'SELECT user_id, bet FROM horse_race_bets WHERE race_id = ? AND horse = ?',
                [carreraId, caballoGanador.color]
              );

              if (ganadores.length > 0) {
                // Recompensar a los ganadores
                for (const ganador of ganadores) {
                  const recompensa = ganador.bet * 2; // Duplicar la apuesta
                  await updateUserBalance(connection, ganador.user_id, recompensa);
                }
              }

              carreraEnProgreso = false; // Marcar que la carrera ha terminado
            }
          };

          const intervalo = setInterval(updateRace, 2000);
        } catch (error) {
          console.error('Error al iniciar la carrera:', error);
          await interaction.followUp('Hubo un error al iniciar la carrera. Por favor, inténtalo de nuevo.');
          carreraEnProgreso = false;
        }
      }, 60000);
    } catch (error) {
      console.error('Error al ejecutar el comando:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(assets.color.red)
            .setDescription('Hubo un error al ejecutar el comando. Por favor, inténtalo de nuevo.')
        ],
        flags: MessageFlags.Ephemeral,
      });
      carreraEnProgreso = false;
    }
  },
};